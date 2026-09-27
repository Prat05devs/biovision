package com.margelo.nitro.biovision.facephys

import com.biovision.facephys.BlazeFaceDetector
import com.biovision.facephys.ConjunctivaAnalyzer
import com.biovision.facephys.FaceLandmarker
import com.biovision.facephys.FacePhysException
import com.margelo.nitro.NitroModules
import com.margelo.nitro.biovision.facephys.EyeImageResult
import com.margelo.nitro.biovision.facephys.FaceImageResult
import com.margelo.nitro.biovision.facephys.HybridEyeScreenerSpec
import com.margelo.nitro.core.ArrayBuffer
import com.margelo.nitro.core.Promise
import kotlin.math.max
import kotlin.math.min
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers

/** Port of ios/HybridEyeScreener.swift. Both calls run off the JS thread. */
class HybridEyeScreener : HybridEyeScreenerSpec() {
  private val scope = CoroutineScope(Dispatchers.Default)

  private fun requireContext() = NitroModules.applicationContext?.applicationContext
    ?: throw FacePhysException("FacePhys needs an application context, but Nitro has not been initialized.")

  override fun analyze(path: String, female: Boolean): Promise<EyeImageResult> =
    Promise.async(scope) {
      val result = ConjunctivaAnalyzer().analyze(path, female)
      EyeImageResult(result.meanLuminance, result.clippedFraction, result.hemoglobinGdl)
    }

  override fun detectFace(path: String, maxEdge: Double): Promise<FaceImageResult> =
    Promise.async(scope) {
      val context = requireContext()
      var image = ConjunctivaAnalyzer.loadUprightRGBA(path)
      val scale = min(1.0, maxEdge / max(image.width, image.height).toDouble())
      if (scale < 1.0) {
        image = ConjunctivaAnalyzer.resizeBilinearAntialiased(
          image,
          max(1, (image.width * scale).toInt()),
          max(1, (image.height * scale).toInt()),
        )
      }
      val width = image.width
      val height = image.height

      // The face models already read RGBA on Android, so no channel swap is needed here —
      // the iOS port swaps to BGRA at this point because its detectors expect that order.
      var landmarks = DoubleArray(0)
      val detector = BlazeFaceDetector(context)
      val landmarker = FaceLandmarker(context)
      try {
        val detect = { detector.detect(image.pixels, width, height, width * 4) }
        // Like MediaPipe IMAGE mode: detection gives the first region; a second pass on the
        // landmark-derived region refines alignment.
        val first = landmarker.process(image.pixels, width, height, width * 4, detect)
        val points = if (first != null) {
          landmarker.process(image.pixels, width, height, width * 4, detect)
        } else {
          null
        }
        if (points != null) {
          landmarks = DoubleArray(478 * 3)
          for (index in 0 until 478) {
            landmarks[index * 3] = points[index * 3].toDouble() / width
            landmarks[index * 3 + 1] = points[index * 3 + 1].toDouble() / height
            landmarks[index * 3 + 2] = points[index * 3 + 2].toDouble() / width
          }
        }
      } finally {
        detector.close()
        landmarker.close()
      }

      val buffer = ArrayBuffer.allocate(image.pixels.size)
      buffer.getBuffer(false).put(image.pixels)
      FaceImageResult(width.toDouble(), height.toDouble(), buffer, landmarks)
    }
}
