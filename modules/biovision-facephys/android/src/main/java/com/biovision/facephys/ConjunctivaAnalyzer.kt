package com.biovision.facephys

import android.graphics.Bitmap
import android.graphics.BitmapFactory
import android.graphics.Matrix
import androidx.exifinterface.media.ExifInterface
import java.io.File
import kotlin.math.abs
import kotlin.math.floor
import kotlin.math.ln
import kotlin.math.max
import kotlin.math.min
import kotlin.math.roundToInt
import kotlin.math.sqrt

class ConjunctivaException(message: String) : RuntimeException(message)

class RGBAImage(val width: Int, val height: Int, val pixels: ByteArray)

class EyeImageAnalysis(
  /** Mean BT.601 luminance (0-255) and fraction of near-white pixels on a 512 px thumbnail. */
  val meanLuminance: Double,
  val clippedFraction: Double,
  /** null when no sufficiently large conjunctiva region was found. */
  val hemoglobinGdl: Double?,
)

/**
 * On-device haemoglobin estimate from a lower-eyelid photo. Port of
 * ios/ConjunctivaAnalyzer.swift, which itself mirrors ml/conjunctiva_colour/train.py:
 * PIL-equivalent resize to 800 px wide -> OpenCV-equivalent HSV red mask with 15 px elliptical
 * close/open -> colour features of the conjunctiva pixels -> ridge regression.
 *
 * Every step is reimplemented rather than delegated to Android's own imaging calls, because
 * Bitmap.createScaledBitmap and Android's colour conversions do not match PIL and OpenCV
 * bit-for-bit, and a drifting pipeline would give Android users different haemoglobin numbers
 * from iOS users for the same photo.
 */
class ConjunctivaAnalyzer {
  companion object {
    private const val WORKING_WIDTH = 800

    // Model, generated from ml/conjunctiva_colour/conjunctiva_ridge_v1.json.
    // Ridge regression on conjunctiva colour, trained on Eyes-Defy-Anemia (217 adults, 95 from
    // India, CC BY-SA 4.0). 5-fold cross-validation, India: r=0.63, MAE=1.32 g/dL.
    const val MODEL_VERSION = "conjunctiva-colour-ridge-v1"

    private val FEATURE_MEAN = doubleArrayOf(
      0.42046929947331174, 0.261609245563747, 0.31792145496294133, 0.4093792921803581,
      0.265459277460007, 0.4749682689448676, 0.435548780935414, 0.5737713466737169,
      0.18697841380395727, 94.52740119944488, 144.3390686756015, 0.3467870111792218,
      0.39631336405529954,
    )
    private val FEATURE_SCALE = doubleArrayOf(
      0.015082733572985141, 0.013204804030219218, 0.012040989541079971, 0.013651967893569187,
      0.014633156760237593, 0.08012872104066246, 0.08337831322877347, 0.11321863023778342,
      0.046506663462437335, 11.81629608048305, 16.37552944824575, 0.17391351295657528,
      0.4891309451736537,
    )
    private val COEFFICIENTS = doubleArrayOf(
      0.8732175470741446, -0.8067124627615723, -0.20912132060929522, -0.8765145936870447,
      0.002195046824494895, 0.5156053233171534, -0.32837002577166174, -0.6450462067871685,
      -0.08650535967744882, 0.3868673230045019, 0.20459701548430964, 1.0877658470738614,
      -0.6222760964000974,
    )
    private const val INTERCEPT = 12.797096774193552

    /** Decodes with EXIF orientation applied, like PIL's ImageOps.exif_transpose. */
    fun loadUprightRGBA(path: String): RGBAImage {
      val file = File(if (path.startsWith("file://")) path.removePrefix("file://") else path)
      val options = BitmapFactory.Options().apply {
        inPreferredConfig = Bitmap.Config.ARGB_8888
        // Decode the file's own values; no scaling or colour management.
        inScaled = false
        inPremultiplied = false
      }
      val decoded = BitmapFactory.decodeFile(file.absolutePath, options)
        ?: throw ConjunctivaException("The eye photo at $path could not be read.")
      val upright = applyExifOrientation(decoded, file)
      val width = upright.width
      val height = upright.height
      val argb = IntArray(width * height)
      upright.getPixels(argb, 0, width, 0, 0, width, height)
      if (upright !== decoded) decoded.recycle()

      val pixels = ByteArray(width * height * 4)
      for (index in argb.indices) {
        val color = argb[index]
        val offset = index * 4
        pixels[offset] = ((color shr 16) and 0xFF).toByte()
        pixels[offset + 1] = ((color shr 8) and 0xFF).toByte()
        pixels[offset + 2] = (color and 0xFF).toByte()
        pixels[offset + 3] = ((color shr 24) and 0xFF).toByte()
      }
      upright.recycle()
      return RGBAImage(width, height, pixels)
    }

    private fun applyExifOrientation(bitmap: Bitmap, file: File): Bitmap {
      val orientation = try {
        ExifInterface(file.absolutePath)
          .getAttributeInt(ExifInterface.TAG_ORIENTATION, ExifInterface.ORIENTATION_NORMAL)
      } catch (error: Exception) {
        ExifInterface.ORIENTATION_NORMAL
      }
      val matrix = Matrix()
      when (orientation) {
        ExifInterface.ORIENTATION_ROTATE_90 -> matrix.postRotate(90f)
        ExifInterface.ORIENTATION_ROTATE_180 -> matrix.postRotate(180f)
        ExifInterface.ORIENTATION_ROTATE_270 -> matrix.postRotate(270f)
        ExifInterface.ORIENTATION_FLIP_HORIZONTAL -> matrix.postScale(-1f, 1f)
        ExifInterface.ORIENTATION_FLIP_VERTICAL -> matrix.postScale(1f, -1f)
        ExifInterface.ORIENTATION_TRANSPOSE -> { matrix.postRotate(90f); matrix.postScale(-1f, 1f) }
        ExifInterface.ORIENTATION_TRANSVERSE -> { matrix.postRotate(270f); matrix.postScale(-1f, 1f) }
        else -> return bitmap
      }
      return Bitmap.createBitmap(bitmap, 0, 0, bitmap.width, bitmap.height, matrix, true)
    }

    // MARK: - Exposure (captures/quality.py)

    fun exposure(image: RGBAImage): Pair<Double, Double> {
      val scale = min(1.0, 512.0 / max(image.width, image.height).toDouble())
      val thumb = if (scale < 1.0) {
        resizeBilinearAntialiased(
          image,
          max(1, (image.width * scale).toInt()),
          max(1, (image.height * scale).toInt()),
        )
      } else {
        image
      }
      var sum = 0L
      var clipped = 0
      val count = thumb.width * thumb.height
      for (index in 0 until count) {
        val offset = index * 4
        // PIL "L" conversion (ITU-R 601-2, fixed point with rounding).
        val luminance = (
          (thumb.pixels[offset].toInt() and 0xFF) * 19595 +
            (thumb.pixels[offset + 1].toInt() and 0xFF) * 38470 +
            (thumb.pixels[offset + 2].toInt() and 0xFF) * 7471 + 0x8000
          ) shr 16
        sum += luminance
        if (luminance >= 250) clipped += 1
      }
      return sum.toDouble() / count to clipped.toDouble() / count
    }

    // MARK: - Conjunctiva mask and crop (anemia_effnet.py `_crop_conjunctiva`)

    fun redMask(image: RGBAImage): ByteArray {
      val mask = ByteArray(image.width * image.height)
      for (index in mask.indices) {
        val offset = index * 4
        val hsv = opencvHSV(image.pixels[offset], image.pixels[offset + 1], image.pixels[offset + 2])
        val lowerRed = hsv[0] <= 10 && hsv[1] >= 50 && hsv[2] >= 50
        val upperRed = hsv[0] >= 160 && hsv[1] >= 50 && hsv[2] >= 50
        if (lowerRed || upperRed) mask[index] = 255.toByte()
      }
      return mask
    }

    /** OpenCV COLOR_RGB2HSV for 8-bit images: H in 0...180, S and V in 0...255. */
    fun opencvHSV(r: Byte, g: Byte, b: Byte): IntArray {
      val red = r.toInt() and 0xFF
      val green = g.toInt() and 0xFF
      val blue = b.toInt() and 0xFF
      val value = max(red, max(green, blue))
      val difference = value - min(red, min(green, blue))
      val saturation = if (value == 0) 0 else (difference * 255 + value / 2) / value
      if (difference == 0) return intArrayOf(0, saturation, value)
      var hue: Double = when (value) {
        red -> 60.0 * (green - blue) / difference
        green -> 120.0 + 60.0 * (blue - red) / difference
        else -> 240.0 + 60.0 * (red - green) / difference
      }
      if (hue < 0) hue += 360.0
      return intArrayOf((hue / 2).roundToInt(), saturation, value)
    }

    /** cv2.getStructuringElement(MORPH_ELLIPSE, (15, 15)). */
    private val ellipseKernel: BooleanArray by lazy {
      val size = 15
      val radius = 7
      val kernel = BooleanArray(size * size)
      val inverseRadiusSquared = 1.0 / (radius * radius)
      for (row in 0 until size) {
        val dy = row - radius
        if (abs(dy) > radius) continue
        val dx = (radius * sqrt(max(0.0, 1.0 - dy * dy * inverseRadiusSquared))).roundToInt()
        for (column in max(0, radius - dx)..min(size - 1, radius + dx)) kernel[row * size + column] = true
      }
      kernel
    }

    /**
     * Binary dilation (max) or erosion (min) with the elliptical kernel. Pixels outside the
     * image never contribute, matching OpenCV's default morphology border.
     */
    fun morph(source: ByteArray, width: Int, height: Int, dilate: Boolean): ByteArray {
      val size = 15
      val radius = 7
      val spans = IntArray(size) { -1 }
      for (row in 0 until size) {
        for (column in 0 until size) {
          if (!ellipseKernel[row * size + column]) continue
          spans[row] = max(spans[row], abs(column - radius))
        }
      }

      val target: Byte = if (dilate) 255.toByte() else 0
      val fill: Byte = if (dilate) 0 else 255.toByte()
      val output = ByteArray(source.size) { fill }
      val rowExtremes = HashMap<Int, ByteArray>()
      for (span in spans.filter { it >= 0 }.toSet()) {
        val row = ByteArray(source.size)
        val prefix = IntArray(width + 1)
        for (y in 0 until height) {
          val base = y * width
          for (x in 0 until width) prefix[x + 1] = prefix[x] + if (source[base + x] == target) 1 else 0
          for (x in 0 until width) {
            val lo = max(0, x - span)
            val hi = min(width - 1, x + span)
            val hits = prefix[hi + 1] - prefix[lo]
            row[base + x] = if (dilate) {
              if (hits > 0) 255.toByte() else 0
            } else {
              if (hits > 0) 0 else 255.toByte()
            }
          }
        }
        rowExtremes[span] = row
      }
      for (y in 0 until height) {
        for (x in 0 until width) {
          var hit = false
          for (dyIndex in 0 until size) {
            val span = spans[dyIndex]
            if (span < 0) continue
            val sy = y + dyIndex - radius
            if (sy < 0 || sy >= height) continue
            if (rowExtremes.getValue(span)[sy * width + x] == target) {
              hit = true
              break
            }
          }
          output[y * width + x] = if (hit) target else fill
        }
      }
      return output
    }

    fun conjunctivaMask(image: RGBAImage): ByteArray {
      var mask = redMask(image)
      mask = morph(morph(mask, image.width, image.height, true), image.width, image.height, false)
      return morph(morph(mask, image.width, image.height, false), image.width, image.height, true)
    }

    /**
     * Features in training order: chromaticity means and medians, erythema index stats,
     * HSV saturation/value means, conjunctiva area fraction, sex.
     */
    fun colourFeatures(image: RGBAImage, female: Boolean): DoubleArray? {
      val mask = conjunctivaMask(image)
      val rs = ArrayList<Double>()
      val gs = ArrayList<Double>()
      val bs = ArrayList<Double>()
      val ei = ArrayList<Double>()
      var saturation = 0.0
      var value = 0.0
      for (index in mask.indices) {
        if (mask[index] != 255.toByte()) continue
        val offset = index * 4
        val r = (image.pixels[offset].toInt() and 0xFF) + 1.0
        val g = (image.pixels[offset + 1].toInt() and 0xFF) + 1.0
        val b = (image.pixels[offset + 2].toInt() and 0xFF) + 1.0
        val sum = r + g + b
        rs.add(r / sum)
        gs.add(g / sum)
        bs.add(b / sum)
        ei.add(ln(r) - ln(g))
        val hsv = opencvHSV(image.pixels[offset], image.pixels[offset + 1], image.pixels[offset + 2])
        saturation += hsv[1]
        value += hsv[2]
      }
      val count = rs.size
      if (count < 200) return null

      fun mean(values: List<Double>) = values.sum() / values.size
      // numpy.percentile(method="lower")
      fun lower(values: List<Double>, percent: Double): Double {
        val sorted = values.sorted()
        return sorted[floor((sorted.size - 1) * percent / 100).toInt()]
      }

      val eiMean = mean(ei)
      val eiStd = sqrt(ei.fold(0.0) { total, v -> total + (v - eiMean) * (v - eiMean) } / count)
      return doubleArrayOf(
        mean(rs), mean(gs), mean(bs), lower(rs, 50.0), lower(gs, 50.0),
        eiMean, lower(ei, 50.0), lower(ei, 75.0), eiStd,
        saturation / count, value / count,
        count.toDouble() / mask.size, if (female) 1.0 else 0.0,
      )
    }

    // MARK: - PIL Image.resize(BILINEAR) with its antialiasing triangle filter

    fun resizeBilinearAntialiased(image: RGBAImage, width: Int, height: Int): RGBAImage {
      val horizontal = resampleAxis(image.pixels, image.width, image.height, width, true)
      val vertical = resampleAxis(horizontal, width, image.height, height, false)
      return RGBAImage(width, height, vertical)
    }

    private fun resampleAxis(
      pixels: ByteArray,
      inWidth: Int,
      inHeight: Int,
      outLength: Int,
      horizontal: Boolean,
    ): ByteArray {
      val inLength = if (horizontal) inWidth else inHeight
      val scale = inLength.toDouble() / outLength
      val filterScale = max(scale, 1.0)
      val support = 1.0 * filterScale
      val outWidth = if (horizontal) outLength else inWidth
      val outHeight = if (horizontal) inHeight else outLength
      val output = ByteArray(outWidth * outHeight * 4)

      for (outIndex in 0 until outLength) {
        val center = (outIndex + 0.5) * scale
        val start = max(0, (center - support + 0.5).toInt())
        val end = min(inLength, (center + support + 0.5).toInt())
        val weights = DoubleArray(max(0, end - start))
        var total = 0.0
        for (index in start until end) {
          val distance = abs((index - center + 0.5) / filterScale)
          val weight = max(0.0, 1.0 - distance)
          weights[index - start] = weight
          total += weight
        }
        if (total > 0) for (index in weights.indices) weights[index] /= total

        val lines = if (horizontal) inHeight else inWidth
        for (line in 0 until lines) {
          val accumulated = DoubleArray(4)
          for (index in start until end) {
            val weight = weights[index - start]
            if (weight == 0.0) continue
            val offset = if (horizontal) (line * inWidth + index) * 4 else (index * inWidth + line) * 4
            for (channel in 0 until 4) {
              accumulated[channel] += (pixels[offset + channel].toInt() and 0xFF) * weight
            }
          }
          val target = if (horizontal) (line * outWidth + outIndex) * 4 else (outIndex * outWidth + line) * 4
          for (channel in 0 until 4) {
            output[target + channel] = accumulated[channel].roundToInt().coerceIn(0, 255).toByte()
          }
        }
      }
      return output
    }
  }

  fun analyze(path: String, female: Boolean): EyeImageAnalysis {
    val rgba = loadUprightRGBA(path)
    val (mean, clipped) = exposure(rgba)
    val height = max(1, rgba.height * WORKING_WIDTH / rgba.width)
    val working = resizeBilinearAntialiased(rgba, WORKING_WIDTH, height)
    val features = colourFeatures(working, female)
      ?: return EyeImageAnalysis(mean, clipped, null)

    var hemoglobin = INTERCEPT
    for (index in features.indices) {
      hemoglobin += COEFFICIENTS[index] * (features[index] - FEATURE_MEAN[index]) / FEATURE_SCALE[index]
    }
    return EyeImageAnalysis(mean, clipped, hemoglobin)
  }
}
