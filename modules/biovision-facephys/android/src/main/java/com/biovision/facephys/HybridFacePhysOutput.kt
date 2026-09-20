package com.biovision.facephys

import android.content.Context
import android.hardware.camera2.CameraCharacteristics
import android.hardware.camera2.CameraManager
import android.hardware.camera2.CaptureRequest
import android.util.Log
import android.util.Size as AndroidSize
import androidx.annotation.OptIn
import androidx.camera.camera2.interop.Camera2Interop
import androidx.camera.camera2.interop.ExperimentalCamera2Interop
import androidx.camera.core.ImageAnalysis
import androidx.camera.core.ImageProxy
import androidx.camera.core.resolutionselector.ResolutionSelector
import androidx.camera.core.resolutionselector.ResolutionStrategy
import com.margelo.nitro.biovision.facephys.FacePhysFaceBox
import com.margelo.nitro.biovision.facephys.FacePhysOutputOptions
import com.margelo.nitro.biovision.facephys.FacePhysSample
import com.margelo.nitro.biovision.facephys.FacePhysUpdate
import com.margelo.nitro.camera.CameraOrientation
import com.margelo.nitro.camera.HybridCameraOutputSpec
import com.margelo.nitro.camera.MediaType
import com.margelo.nitro.camera.MirrorMode
import com.margelo.nitro.camera.Size
import com.margelo.nitro.camera.public.NativeCameraOutput
import java.util.concurrent.Executors
import kotlin.math.max
import kotlin.math.roundToInt

/**
 * A VisionCamera output that runs the on-device face pipeline: MediaPipe Face Landmarker for
 * the live mesh and, when `measureVitals` is set, FacePhys heart rate. Port of
 * ios/HybridFacePhysOutput.swift.
 *
 * Camera frames never leave this class; only landmarks, BVP samples and estimates reach JS.
 *
 * Where iOS drives an AVCaptureVideoDataOutput and rotates frames itself with CoreImage, this
 * uses a CameraX ImageAnalysis with `setOutputImageRotationEnabled`, so the buffers arrive
 * upright, and downscales them to the same 480 px working width.
 */
class HybridFacePhysOutput(
  private val context: Context,
  private val options: FacePhysOutputOptions,
) : HybridCameraOutputSpec(),
  NativeCameraOutput {

  private companion object {
    const val TAG = "BioVisionFacePhys"
    const val WORKING_WIDTH = 480
    const val FRAME_INTERVAL_MS = 1000.0 / 30.0
    const val UPDATE_INTERVAL_MS = 66.0
  }

  private val executor = Executors.newSingleThreadExecutor { runnable ->
    Thread(runnable, "biovision.facepipeline")
  }

  override val mediaType: MediaType = MediaType.VIDEO
  override var outputOrientation: CameraOrientation = CameraOrientation.UP
  override val currentResolution: Size?
    get() = imageAnalysis?.resolutionInfo?.resolution?.let { Size(it.width.toDouble(), it.height.toDouble()) }
  override var mirrorMode: MirrorMode = MirrorMode.AUTO

  private var imageAnalysis: ImageAnalysis? = null

  private var detector: BlazeFaceDetector? = null
  private var landmarker: FaceLandmarker? = null
  private var engine: FacePhysEngine? = null
  private var failed = false

  private var lastFrameMs = 0.0
  private var lastUpdateMs = 0.0
  private var frameIndex = 0
  private val frameTimes = ArrayList<Double>()
  private val pending = ArrayList<FacePhysSample>()
  private var latestLandmarks: DoubleArray? = null
  private var latestFace: FacePhysFaceBox? = null
  private var latestHeartRate: Double? = null
  private var latestQuality: Double? = null

  /** Reused scratch buffers, so a 30 fps pipeline does not allocate per frame. */
  private var working = ByteArray(0)
  private var workingWidth = 0
  private var workingHeight = 0
  private var source = ByteArray(0)
  private var columnOffsets: IntArray? = null
  private var columnSourceWidth = 0

  /** Rolling diagnostics, logged so a release build on a real phone can be diagnosed. */
  private var diagnosticsAtMs = 0.0
  private var framesSinceDiagnostics = 0

  @OptIn(ExperimentalCamera2Interop::class)
  override fun createUseCase(
    mirrorMode: MirrorMode,
    config: NativeCameraOutput.Config,
  ): NativeCameraOutput.PreparedUseCase {
    // iOS asks for 720x1280 and downsizes each frame on the GPU with CoreImage. Android has no
    // equivalent here, so ask the camera for a stream near the 480 px working width instead:
    // scaling 720x1280 in Kotlin on every frame costs more than the pipeline can afford at 30 fps,
    // and a slow pipeline starves the rPPG model of the frame rate it was trained on.
    val resolutionSelector = ResolutionSelector.Builder()
      .setResolutionStrategy(
        ResolutionStrategy(
          AndroidSize(WORKING_WIDTH, WORKING_WIDTH * 4 / 3),
          ResolutionStrategy.FALLBACK_RULE_CLOSEST_HIGHER_THEN_LOWER,
        ),
      )
      .build()

    val builder = ImageAnalysis.Builder()
      .setResolutionSelector(resolutionSelector)
      .setBackpressureStrategy(ImageAnalysis.STRATEGY_KEEP_ONLY_LATEST)
      .setOutputImageFormat(ImageAnalysis.OUTPUT_IMAGE_FORMAT_RGBA_8888)
      // Upright, unmirrored buffers, matching the portrait connection iOS configures.
      .setOutputImageRotationEnabled(true)
      .setBackgroundExecutor(executor)

    // Mains flicker at 50 Hz beats against a 30 fps stream and produces a slow brightness
    // oscillation that both looks like a pulse and drowns the real one, so antibanding is pinned
    // rather than left on auto. The frame rate is pinned to 30 because that is where the model
    // was trained, and a rate that sags in dim light changes what the model is fed.
    //
    // White balance is deliberately NOT locked. Locking it freezes whatever tint the camera
    // happened to hold when the session opened, which tinted the whole preview green — these
    // options apply to every stream in the session, not only to this analysis output.
    val extender = Camera2Interop.Extender(builder)
      .setCaptureRequestOption(
        CaptureRequest.CONTROL_AE_ANTIBANDING_MODE,
        CaptureRequest.CONTROL_AE_ANTIBANDING_MODE_50HZ,
      )
      .setCaptureRequestOption(CaptureRequest.CONTROL_AE_TARGET_FPS_RANGE, android.util.Range(30, 30))
      // iOS turns stabilisation off for the same reason: warping the frame moves the skin
      // region between frames, which reads as signal.
      .setCaptureRequestOption(
        CaptureRequest.CONTROL_VIDEO_STABILIZATION_MODE,
        CaptureRequest.CONTROL_VIDEO_STABILIZATION_MODE_OFF,
      )

    // The pulse shows up as roughly a quarter of one 8-bit level of brightness change. Android's
    // image pipeline is tuned to make video look good, and two of its stages are larger than that
    // signal: temporal noise reduction averages successive frames, which attenuates exactly the
    // high-frequency variation the model reads, and edge enhancement sharpens what is left.
    // Temporal denoising also ramps up over the first seconds, which is why a scan can start
    // usable and then decay. Both are turned off where the device allows it.
    noiseReductionMode()?.let { extender.setCaptureRequestOption(CaptureRequest.NOISE_REDUCTION_MODE, it) }
    edgeMode()?.let { extender.setCaptureRequestOption(CaptureRequest.EDGE_MODE, it) }

    val analysis = builder.build()

    analysis.setAnalyzer(executor) { image -> handle(image) }

    return NativeCameraOutput.PreparedUseCase(analysis) {
      this.imageAnalysis = analysis
      this.mirrorMode = mirrorMode
    }
  }

  /** Characteristics of the front camera, which is the only one this output is used with. */
  private fun frontCameraCharacteristics(): CameraCharacteristics? = runCatching {
    val manager = context.getSystemService(Context.CAMERA_SERVICE) as CameraManager
    val id = manager.cameraIdList.firstOrNull { cameraId ->
      manager.getCameraCharacteristics(cameraId)
        .get(CameraCharacteristics.LENS_FACING) == CameraCharacteristics.LENS_FACING_FRONT
    }
    id?.let { manager.getCameraCharacteristics(it) }
  }.getOrNull()

  /**
   * The least aggressive noise reduction the device offers. OFF is not guaranteed to exist, so
   * fall back to MINIMAL and then FAST rather than requesting a mode the camera will reject.
   */
  private fun noiseReductionMode(): Int? {
    val available = frontCameraCharacteristics()
      ?.get(CameraCharacteristics.NOISE_REDUCTION_AVAILABLE_NOISE_REDUCTION_MODES)
      ?.toSet()
      ?: return null
    val choice = listOf(
      CaptureRequest.NOISE_REDUCTION_MODE_OFF,
      CaptureRequest.NOISE_REDUCTION_MODE_MINIMAL,
      CaptureRequest.NOISE_REDUCTION_MODE_FAST,
    ).firstOrNull { it in available }
    Log.i(TAG, "noise reduction mode: ${choice ?: "device default"}")
    return choice
  }

  /** Same idea for edge enhancement: sharpening amplifies noise on top of a very small signal. */
  private fun edgeMode(): Int? {
    val available = frontCameraCharacteristics()
      ?.get(CameraCharacteristics.EDGE_AVAILABLE_EDGE_MODES)
      ?.toSet()
      ?: return null
    val choice = listOf(CaptureRequest.EDGE_MODE_OFF, CaptureRequest.EDGE_MODE_FAST)
      .firstOrNull { it in available }
    Log.i(TAG, "edge mode: ${choice ?: "device default"}")
    return choice
  }

  private fun handle(image: ImageProxy) {
    try {
      if (failed) return
      val captureMs = image.imageInfo.timestamp / 1_000_000.0
      // 30 fps, like the web frame loop; tolerate a millisecond of camera jitter.
      if (lastFrameMs > 0 && captureMs - lastFrameMs < FRAME_INTERVAL_MS - 1) return
      lastFrameMs = captureMs

      if (detector == null) {
        detector = BlazeFaceDetector(context)
        landmarker = FaceLandmarker(context)
        if (options.measureVitals) engine = FacePhysEngine(context)
      }

      downscale(image)
      process(captureMs)
    } catch (error: Throwable) {
      failed = true
      options.onError.invoke(error as? Exception ?: RuntimeException(error))
    } finally {
      image.close()
    }
  }

  /**
   * Any incoming resolution -> tightly packed RGBA at the working width.
   *
   * Two things matter for keeping 30 fps on mid-range hardware: the scratch buffers are reused
   * rather than reallocated per frame, and a frame that already arrives at the working width is
   * only row-copied (CameraX pads rows, so the stride still has to be removed).
   */
  private fun downscale(image: ImageProxy) {
    val plane = image.planes[0]
    val buffer = plane.buffer
    val sourceStride = plane.rowStride
    val sourceWidth = image.width
    val sourceHeight = image.height

    val needed = buffer.remaining()
    if (source.size < needed) source = ByteArray(needed)
    buffer.get(source, 0, needed)

    val targetWidth = minOf(WORKING_WIDTH, sourceWidth)
    val targetHeight = max(1, (sourceHeight.toLong() * targetWidth / sourceWidth).toInt())
    if (workingWidth != targetWidth || workingHeight != targetHeight) {
      workingWidth = targetWidth
      workingHeight = targetHeight
      working = ByteArray(targetWidth * targetHeight * 4)
    }

    if (targetWidth == sourceWidth && targetHeight == sourceHeight) {
      for (row in 0 until targetHeight) {
        System.arraycopy(source, row * sourceStride, working, row * targetWidth * 4, targetWidth * 4)
      }
      return
    }

    // Nearest-neighbour: the models consume a 36x36 area average and a 256x256 bilinear crop of
    // this frame, so the extra smoothing a bilinear pass would add here is not worth its cost.
    val xMap = columnMap(sourceWidth, targetWidth)
    for (row in 0 until targetHeight) {
      val sourceY = ((row * sourceHeight) / targetHeight).coerceAtMost(sourceHeight - 1)
      val sourceRow = sourceY * sourceStride
      var target = row * targetWidth * 4
      for (column in 0 until targetWidth) {
        var offset = sourceRow + xMap[column]
        working[target] = source[offset]
        working[target + 1] = source[offset + 1]
        working[target + 2] = source[offset + 2]
        working[target + 3] = source[offset + 3]
        target += 4
      }
    }
  }

  /** Source byte offsets for each output column, computed once per resolution. */
  private fun columnMap(sourceWidth: Int, targetWidth: Int): IntArray {
    val cached = columnOffsets
    if (cached != null && cached.size == targetWidth && columnSourceWidth == sourceWidth) return cached
    val map = IntArray(targetWidth) { column ->
      (((column * sourceWidth) / targetWidth).coerceAtMost(sourceWidth - 1)) * 4
    }
    columnOffsets = map
    columnSourceWidth = sourceWidth
    return map
  }

  private fun process(captureMs: Double) {
    val detector = detector ?: return
    val landmarker = landmarker ?: return
    val width = workingWidth
    val height = workingHeight
    val rowStride = width * 4

    frameIndex += 1
    frameTimes.add(captureMs)
    frameTimes.removeAll { captureMs - it > 1000 }

    // FacePhys needs a BlazeFace box every frame (as on web); share it with the landmarker.
    var detection: FaceDetection? = null
    var detected = false
    val detect = {
      if (!detected) {
        detection = detector.detect(working, width, height, rowStride)
        detected = true
      }
      detection
    }

    // With vitals running, the mesh updates at 15 fps so heart-rate frames stay on time.
    if (!options.measureVitals || frameIndex % 2 == 0) {
      val points = landmarker.process(working, width, height, rowStride, detect)
      latestLandmarks = if (points != null) {
        DoubleArray(points.size).also { normalized ->
          for (index in 0 until 478) {
            normalized[index * 3] = points[index * 3].toDouble() / width
            normalized[index * 3 + 1] = points[index * 3 + 1].toDouble() / height
            normalized[index * 3 + 2] = points[index * 3 + 2].toDouble() / width
          }
        }
      } else {
        null
      }
    }

    val engine = engine
    if (engine != null) {
      val face = detect()?.rect
      val result = engine.process(working, width, height, rowStride, captureMs, face)
      result.sample?.let { pending.add(FacePhysSample(it.value.toDouble(), it.timestampMs)) }
      result.heartRate?.let { latestHeartRate = it.toDouble() }
      result.signalQuality?.let { latestQuality = it.toDouble() }
      latestFace = face?.let {
        FacePhysFaceBox(
          it.x.toDouble() / width,
          it.y.toDouble() / height,
          it.width.toDouble() / width,
          it.height.toDouble() / height,
        )
      }
    }

    framesSinceDiagnostics += 1
    // One line every 3 s, in release too: without a device attached this is the only way to see
    // whether the pipeline is keeping frame rate and what the signal-quality model reports.
    if (captureMs - diagnosticsAtMs >= 3000) {
      val seconds = if (diagnosticsAtMs > 0) (captureMs - diagnosticsAtMs) / 1000.0 else 3.0
      Log.i(
        TAG,
        "${width}x${height} @ ${"%.1f".format(framesSinceDiagnostics / seconds)} fps" +
          ", face=${if (latestFace != null) "yes" else "no"}" +
          ", mesh=${if (latestLandmarks != null) "yes" else "no"}" +
          ", dt=${engine?.let { "%.1fms".format(it.modelFrameIntervalMs) } ?: "-"}" +
          ", green=${engine?.let { "%.4f".format(it.lastCropGreen) } ?: "-"}" +
          ", sqi=${latestQuality?.let { "%.2f".format(it) } ?: "-"}" +
          ", hr=${latestHeartRate?.let { "%.1f".format(it) } ?: "-"}",
      )
      diagnosticsAtMs = captureMs
      framesSinceDiagnostics = 0
    }

    if (captureMs - lastUpdateMs < UPDATE_INTERVAL_MS) return
    lastUpdateMs = captureMs
    val update = FacePhysUpdate(
      width.toDouble(),
      height.toDouble(),
      latestLandmarks,
      pending.toTypedArray(),
      latestHeartRate,
      latestQuality,
      latestFace,
      frameTimes.size.toDouble(),
    )
    // Estimates are sent once per PSD run so JS sees one reading per spectrum, as on web.
    pending.clear()
    latestHeartRate = null
    latestQuality = null
    options.onUpdate.invoke(update)
  }

  override fun dispose() {
    super.dispose()
    imageAnalysis?.clearAnalyzer()
    detector?.close()
    landmarker?.close()
    engine?.close()
    executor.shutdown()
  }
}
