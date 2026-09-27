package com.biovision.facephys

import android.content.Context
import kotlin.math.exp
import kotlin.math.max
import kotlin.math.min

data class FaceRect(var x: Float, var y: Float, var width: Float, var height: Float)

data class FaceKeypoint(val x: Float, val y: Float)

data class FaceDetection(
  val rect: FaceRect,
  /** Right eye, left eye, nose tip, mouth, right ear, left ear (subject's sides), in source pixels. */
  val keypoints: List<FaceKeypoint>,
)

/**
 * MediaPipe BlazeFace short-range detector, the same model the web SDK uses to place the
 * FacePhys crop. Port of ios/BlazeFaceDetector.swift.
 *
 * Input is letterboxed to 128x128 like MediaPipe's FIT scale mode; returns the best face and
 * its keypoints in source pixel coordinates.
 *
 * Pixels are RGBA here, not the BGRA the iOS version receives: CameraX delivers
 * OUTPUT_IMAGE_FORMAT_RGBA_8888. Only the channel offsets differ; the maths is identical.
 */
class BlazeFaceDetector(context: Context) {
  private companion object {
    const val INPUT_SIZE = 128
    const val MIN_SCORE = 0.5f
    const val SUPPRESSION_IOU = 0.3f
  }

  private val interpreter = TFLiteInterpreter(context, "blaze_face_short_range.tflite")
  private val anchors = makeAnchors()

  private class Candidate(val rect: FaceRect, val keypoints: FloatArray, val score: Float)

  /** `pixels` is upright RGBA with `rowStride` bytes per row. */
  fun detect(pixels: ByteArray, width: Int, height: Int, rowStride: Int): FaceDetection? {
    val size = INPUT_SIZE
    val scale = size.toFloat() / max(width, height).toFloat()
    val scaledWidth = width * scale
    val scaledHeight = height * scale
    val padX = (size - scaledWidth) / 2f
    val padY = (size - scaledHeight) / 2f

    val input = interpreter.input("input")
    input.rewind()
    for (row in 0 until size) {
      for (column in 0 until size) {
        val target = (row * size + column) * 3
        val sourceX = (column + 0.5f - padX) / scale
        val sourceY = (row + 0.5f - padY) / scale
        if (sourceX < 0f || sourceY < 0f || sourceX >= width || sourceY >= height) {
          input.put(target, -1f)
          input.put(target + 1, -1f)
          input.put(target + 2, -1f)
          continue
        }
        val offset = sourceY.toInt() * rowStride + sourceX.toInt() * 4
        // RGBA -> RGB in [-1, 1].
        input.put(target, (pixels[offset].toInt() and 0xFF) / 127.5f - 1f)
        input.put(target + 1, (pixels[offset + 1].toInt() and 0xFF) / 127.5f - 1f)
        input.put(target + 2, (pixels[offset + 2].toInt() and 0xFF) / 127.5f - 1f)
      }
    }
    interpreter.invoke()

    val regressors = interpreter.output("regressors")
    val scores = interpreter.output("classificators")
    val candidates = ArrayList<Candidate>()
    for (index in anchors.indices) {
      val score = 1f / (1f + exp(-max(-100f, min(100f, scores.get(index)))))
      if (score < MIN_SCORE) continue
      val base = index * 16
      val anchor = anchors[index]
      val centerX = regressors.get(base) / size + anchor.x
      val centerY = regressors.get(base + 1) / size + anchor.y
      val boxWidth = regressors.get(base + 2) / size
      val boxHeight = regressors.get(base + 3) / size
      val keypoints = FloatArray(12)
      for (k in 0 until 6) {
        keypoints[k * 2] = regressors.get(base + 4 + k * 2) / size + anchor.x
        keypoints[k * 2 + 1] = regressors.get(base + 5 + k * 2) / size + anchor.y
      }
      candidates.add(
        Candidate(
          FaceRect(centerX - boxWidth / 2f, centerY - boxHeight / 2f, boxWidth, boxHeight),
          keypoints,
          score,
        ),
      )
    }
    val best = candidates.maxByOrNull { it.score } ?: return null

    // MediaPipe blends overlapping detections (weighted NMS) instead of keeping one raw box.
    val cluster = candidates.filter { iou(it.rect, best.rect) > SUPPRESSION_IOU }
    val total = cluster.fold(0f) { sum, candidate -> sum + candidate.score }
    val blended = FaceRect(0f, 0f, 0f, 0f)
    val blendedKeypoints = FloatArray(12)
    for (candidate in cluster) {
      val weight = candidate.score / total
      blended.x += candidate.rect.x * weight
      blended.y += candidate.rect.y * weight
      blended.width += candidate.rect.width * weight
      blended.height += candidate.rect.height * weight
      for (k in 0 until 12) blendedKeypoints[k] += candidate.keypoints[k] * weight
    }

    // Undo the letterbox and convert to source pixels.
    val rect = FaceRect(
      (blended.x * size - padX) / scale,
      (blended.y * size - padY) / scale,
      blended.width * size / scale,
      blended.height * size / scale,
    )
    if (rect.width <= 1f || rect.height <= 1f) return null
    val keypoints = (0 until 6).map { k ->
      FaceKeypoint(
        (blendedKeypoints[k * 2] * size - padX) / scale,
        (blendedKeypoints[k * 2 + 1] * size - padY) / scale,
      )
    }
    return FaceDetection(rect, keypoints)
  }

  private fun iou(a: FaceRect, b: FaceRect): Float {
    val left = max(a.x, b.x)
    val top = max(a.y, b.y)
    val right = min(a.x + a.width, b.x + b.width)
    val bottom = min(a.y + a.height, b.y + b.height)
    val intersection = max(0f, right - left) * max(0f, bottom - top)
    val union = a.width * a.height + b.width * b.height - intersection
    return if (union > 0f) intersection / union else 0f
  }

  /** SSD anchors for face_detection_short_range: strides [8, 16, 16, 16], offset 0.5. */
  private fun makeAnchors(): List<FaceKeypoint> {
    val anchors = ArrayList<FaceKeypoint>()
    for ((stride, perCell) in listOf(8 to 2, 16 to 6)) {
      val cells = INPUT_SIZE / stride
      for (y in 0 until cells) {
        for (x in 0 until cells) {
          repeat(perCell) {
            anchors.add(FaceKeypoint((x + 0.5f) / cells, (y + 0.5f) / cells))
          }
        }
      }
    }
    return anchors
  }

  fun close() = interpreter.close()
}
