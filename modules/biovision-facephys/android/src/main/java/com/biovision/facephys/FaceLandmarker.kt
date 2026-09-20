package com.biovision.facephys

import android.content.Context
import kotlin.math.atan2
import kotlin.math.cos
import kotlin.math.exp
import kotlin.math.floor
import kotlin.math.max
import kotlin.math.min
import kotlin.math.sin

/**
 * MediaPipe Face Landmarker (the model inside face_landmarker.task that the web app runs):
 * 478 landmarks from a rotated, square 256x256 face crop. Port of ios/FaceLandmarker.swift.
 *
 * Like MediaPipe's VIDEO mode, the next region comes from the previous landmarks and
 * BlazeFace only runs when tracking is lost.
 *
 * Source pixels are RGBA here rather than iOS's BGRA; only the channel offsets differ.
 */
class FaceLandmarker(context: Context) {
  private companion object {
    const val INPUT_SIZE = 256
    const val ROI_SCALE = 1.5f
    const val MIN_PRESENCE = 0.55f
    const val LANDMARK_COUNT = 478
  }

  private class Region(val centerX: Float, val centerY: Float, val size: Float, val angle: Float)

  private val interpreter = TFLiteInterpreter(context, "face_landmarks_detector.tflite")
  private val input = interpreter.input("input_12")
  private val landmarksOutput = interpreter.output("Identity")
  private val presenceOutput = interpreter.output("Identity_1")
  private var trackedRegion: Region? = null

  fun reset() {
    trackedRegion = null
  }

  /** Returns 478 x (x, y, z) landmarks in source pixels, or null when no face is present. */
  fun process(
    pixels: ByteArray,
    width: Int,
    height: Int,
    rowStride: Int,
    detection: () -> FaceDetection?,
  ): FloatArray? {
    if (trackedRegion == null) {
      val face = detection()
      if (face != null) trackedRegion = regionFrom(face)
    }
    val region = trackedRegion ?: return null

    writeCrop(pixels, width, height, rowStride, region)
    interpreter.invoke()
    val presence = 1f / (1f + exp(-presenceOutput.get(0)))
    if (presence < MIN_PRESENCE) {
      trackedRegion = null
      return null
    }

    val size = INPUT_SIZE.toFloat()
    val cosine = cos(region.angle)
    val sine = sin(region.angle)
    val points = FloatArray(LANDMARK_COUNT * 3)
    for (index in 0 until LANDMARK_COUNT) {
      val localX = (landmarksOutput.get(index * 3) / size - 0.5f) * region.size
      val localY = (landmarksOutput.get(index * 3 + 1) / size - 0.5f) * region.size
      points[index * 3] = region.centerX + localX * cosine - localY * sine
      points[index * 3 + 1] = region.centerY + localX * sine + localY * cosine
      points[index * 3 + 2] = landmarksOutput.get(index * 3 + 2) / size * region.size
    }
    trackedRegion = regionFrom(points)
    return points
  }

  /** Detection -> ROI: rotation from the eye keypoints, 1.5x the longer box side. */
  private fun regionFrom(face: FaceDetection): Region {
    val rightEye = face.keypoints[0]
    val leftEye = face.keypoints[1]
    return Region(
      centerX = face.rect.x + face.rect.width / 2f,
      centerY = face.rect.y + face.rect.height / 2f,
      size = max(face.rect.width, face.rect.height) * ROI_SCALE,
      angle = atan2(leftEye.y - rightEye.y, leftEye.x - rightEye.x),
    )
  }

  /** Landmarks -> next ROI: rotation from the outer eye corners (33, 263), bounding box x1.5. */
  private fun regionFrom(points: FloatArray): Region {
    var minX = Float.MAX_VALUE
    var minY = Float.MAX_VALUE
    var maxX = -Float.MAX_VALUE
    var maxY = -Float.MAX_VALUE
    for (index in 0 until LANDMARK_COUNT) {
      minX = min(minX, points[index * 3])
      maxX = max(maxX, points[index * 3])
      minY = min(minY, points[index * 3 + 1])
      maxY = max(maxY, points[index * 3 + 1])
    }
    return Region(
      centerX = (minX + maxX) / 2f,
      centerY = (minY + maxY) / 2f,
      size = max(maxX - minX, maxY - minY) * ROI_SCALE,
      angle = atan2(points[263 * 3 + 1] - points[33 * 3 + 1], points[263 * 3] - points[33 * 3]),
    )
  }

  /** Bilinear, rotated square crop into RGB [0, 1]; edges clamp to the nearest pixel. */
  private fun writeCrop(pixels: ByteArray, width: Int, height: Int, rowStride: Int, region: Region) {
    val size = INPUT_SIZE
    val cosine = cos(region.angle)
    val sine = sin(region.angle)
    val step = region.size / size
    val maxX = width - 1
    val maxY = height - 1
    input.rewind()
    for (row in 0 until size) {
      val localY = (row + 0.5f) * step - region.size / 2f
      for (column in 0 until size) {
        val localX = (column + 0.5f) * step - region.size / 2f
        val sourceX = region.centerX + localX * cosine - localY * sine - 0.5f
        val sourceY = region.centerY + localX * sine + localY * cosine - 0.5f
        val x0 = floor(sourceX).toInt()
        val y0 = floor(sourceY).toInt()
        val fx = sourceX - x0
        val fy = sourceY - y0
        val xa = min(max(x0, 0), maxX)
        val xb = min(max(x0 + 1, 0), maxX)
        val ya = min(max(y0, 0), maxY)
        val yb = min(max(y0 + 1, 0), maxY)
        val topLeft = ya * rowStride + xa * 4
        val topRight = ya * rowStride + xb * 4
        val bottomLeft = yb * rowStride + xa * 4
        val bottomRight = yb * rowStride + xb * 4
        val target = (row * size + column) * 3
        val wTopLeft = (1f - fx) * (1f - fy) / 255f
        val wTopRight = fx * (1f - fy) / 255f
        val wBottomLeft = (1f - fx) * fy / 255f
        val wBottomRight = fx * fy / 255f
        // RGBA source -> RGB tensor.
        for (channel in 0 until 3) {
          input.put(
            target + channel,
            (pixels[topLeft + channel].toInt() and 0xFF) * wTopLeft +
              (pixels[topRight + channel].toInt() and 0xFF) * wTopRight +
              (pixels[bottomLeft + channel].toInt() and 0xFF) * wBottomLeft +
              (pixels[bottomRight + channel].toInt() and 0xFF) * wBottomRight,
          )
        }
      }
    }
  }

  fun close() = interpreter.close()
}
