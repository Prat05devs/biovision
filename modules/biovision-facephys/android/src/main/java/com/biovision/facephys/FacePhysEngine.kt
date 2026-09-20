package com.biovision.facephys

import android.content.Context
import java.nio.ByteBuffer
import java.nio.ByteOrder
import java.nio.FloatBuffer
import kotlin.math.max
import kotlin.math.min
import org.json.JSONObject

/** 1-D Kalman filter with the web SDK's face-box tuning (q = 1e-2, r = 5e-1). */
private class Kalman1D(var value: Float) {
  private var variance = 1f
  private val processNoise = 1e-2f
  private val measurementNoise = 5e-1f

  fun update(measurement: Float): Float {
    val predicted = variance + processNoise
    val gain = predicted / (predicted + measurementNoise)
    value += gain * (measurement - value)
    variance = (1 - gain) * predicted
    return value
  }
}

class FacePhysSampleResult(val value: Float, val timestampMs: Double)

class FacePhysFrameResult(
  var sample: FacePhysSampleResult? = null,
  var heartRate: Float? = null,
  var signalQuality: Float? = null,
)

/**
 * Native port of vitalcamera-sdk 0.6.9's FacePhys path (BrowserAdapter + inference and PSD
 * workers), mirroring ios/FacePhysEngine.swift. Call once per 30 fps frame from one thread.
 */
class FacePhysEngine(context: Context) {
  private companion object {
    const val CROP_SIZE = 36
    const val WINDOW_SIZE = 450
    const val PSD_INTERVAL_MS = 500.0
    const val MIN_FRAME_SECONDS = 1.0 / 120
    const val MAX_FRAME_SECONDS = 1.0 / 8
  }

  private val rppg = TFLiteInterpreter(context, "model.tflite")
  private val sqi = TFLiteInterpreter(context, "sqi_model.tflite", threads = 1)
  private val psd = TFLiteInterpreter(context, "psd_model.tflite", threads = 1)

  /** (input state_in_k, output Identity_(k+1)) pairs: each output feeds the next step's state. */
  private val stateLinks: List<Pair<FloatBuffer, FloatBuffer>>
  private val imageInput = rppg.input("input")
  private val dtInput = rppg.input("dt")
  private val bvpOutput = rppg.output("Identity")

  private var boxX: Kalman1D? = null
  private var boxY: Kalman1D? = null
  private var boxW: Kalman1D? = null
  private var boxH: Kalman1D? = null
  private var smoothedDt = 1.0 / 30.0

  /** The frame interval currently fed to the model, in milliseconds. */
  val modelFrameIntervalMs: Double get() = smoothedDt * 1000

  /** Mean green level (0-1) of the last face crop, for diagnosing exposure drift. */
  var lastCropGreen = 0.0
    private set
  private var virtualTimeMs = 0.0
  private var lastCaptureMs = 0.0
  private var lastPsdMs = 0.0
  private val ring = FloatArray(WINDOW_SIZE)
  private var ringCount = 0

  init {
    stateLinks = rppg.inputNames.filter { it.startsWith("state_in_") }.map { name ->
      val k = name.removePrefix("state_in_").toInt()
      rppg.input(name) to rppg.output("Identity_${k + 1}")
    }
    loadInitialState(context)
  }

  /** Warm-start state shipped with FacePhys (state.gz, converted to float32 at build time). */
  private fun loadInitialState(context: Context) {
    val index = JSONObject(context.assets.open("state_index.json").bufferedReader().use { it.readText() })
    val blob = context.assets.open("state.bin").use { it.readBytes() }
    val floats = ByteBuffer.wrap(blob).order(ByteOrder.LITTLE_ENDIAN).asFloatBuffer()
    for (name in index.keys()) {
      val entry = index.getJSONObject(name)
      val offset = entry.getInt("offset")
      val count = entry.getInt("count")
      val destination = rppg.input(name)
      if (count != destination.capacity() || (offset + count) * 4 > blob.size) {
        throw FacePhysException("FacePhys tensor $name was not found.")
      }
      for (i in 0 until count) destination.put(i, floats.get(offset + i))
    }
  }

  /** Processes one upright RGBA frame with this frame's BlazeFace box (null when no face). */
  fun process(
    pixels: ByteArray,
    width: Int,
    height: Int,
    rowStride: Int,
    captureMs: Double,
    raw: FaceRect?,
  ): FacePhysFrameResult {
    if (lastCaptureMs > 0) {
      // The model is trained at ~30 fps and takes dt as an input, and this filter has a ~11 s
      // time constant: a single implausible frame interval (a stalled camera, or a device whose
      // image timestamps use a different clock) would poison it slowly, so the signal starts
      // fine and then decays. Ignore intervals outside 8-120 fps rather than smooth them in.
      val measured = (captureMs - lastCaptureMs) / 1000.0
      val rawDt = if (measured in MIN_FRAME_SECONDS..MAX_FRAME_SECONDS) measured else smoothedDt
      smoothedDt = smoothedDt * 0.997 + 0.003 * rawDt
      virtualTimeMs += smoothedDt * 1000
      virtualTimeMs = virtualTimeMs * 0.997 + 0.003 * captureMs
    } else {
      virtualTimeMs = captureMs
    }
    lastCaptureMs = captureMs

    val result = FacePhysFrameResult()
    if (raw == null) {
      boxX = null; boxY = null; boxW = null; boxH = null
      return result
    }
    val box: FaceRect
    val x = boxX
    val y = boxY
    val w = boxW
    val h = boxH
    if (x != null && y != null && w != null && h != null) {
      box = FaceRect(x.update(raw.x), y.update(raw.y), w.update(raw.width), h.update(raw.height))
    } else {
      boxX = Kalman1D(raw.x)
      boxY = Kalman1D(raw.y)
      boxW = Kalman1D(raw.width)
      boxH = Kalman1D(raw.height)
      box = raw
    }

    writeCrop(pixels, width, height, rowStride, box)
    dtInput.put(0, smoothedDt.toFloat())
    rppg.invoke()
    val value = bvpOutput.get(0)
    for ((stateInput, stateOutput) in stateLinks) {
      for (i in 0 until stateInput.capacity()) stateInput.put(i, stateOutput.get(i))
    }
    result.sample = FacePhysSampleResult(value, virtualTimeMs)

    if (ringCount < WINDOW_SIZE) {
      ring[ringCount++] = value
    } else {
      System.arraycopy(ring, 1, ring, 0, WINDOW_SIZE - 1)
      ring[WINDOW_SIZE - 1] = value
    }
    if (captureMs - lastPsdMs >= PSD_INTERVAL_MS) {
      lastPsdMs = captureMs
      val spectrum = runSpectrum()
      result.heartRate = spectrum.first
      result.signalQuality = spectrum.second
    }
    return result
  }

  /** Area-averages the face box into the 36x36 RGB [0, 1] input (NDHWC [1, 1, 36, 36, 3]). */
  private fun writeCrop(pixels: ByteArray, width: Int, height: Int, rowStride: Int, box: FaceRect) {
    val size = CROP_SIZE
    var greenTotal = 0.0
    val left = box.x.toDouble()
    val top = box.y.toDouble()
    val cellWidth = box.width.toDouble() / size
    val cellHeight = box.height.toDouble() / size
    for (row in 0 until size) {
      val y0 = max(0, min(height - 1, (top + row * cellHeight).toInt()))
      val y1 = max(y0 + 1, min(height, (top + (row + 1) * cellHeight).toInt()))
      for (column in 0 until size) {
        val x0 = max(0, min(width - 1, (left + column * cellWidth).toInt()))
        val x1 = max(x0 + 1, min(width, (left + (column + 1) * cellWidth).toInt()))
        var red = 0
        var green = 0
        var blue = 0
        for (y in y0 until y1) {
          var offset = y * rowStride + x0 * 4
          for (unused in x0 until x1) {
            // RGBA source, unlike the BGRA the iOS port reads.
            red += pixels[offset].toInt() and 0xFF
            green += pixels[offset + 1].toInt() and 0xFF
            blue += pixels[offset + 2].toInt() and 0xFF
            offset += 4
          }
        }
        val count = ((y1 - y0) * (x1 - x0)).toFloat() * 255f
        val target = (row * size + column) * 3
        imageInput.put(target, red / count)
        imageInput.put(target + 1, green / count)
        imageInput.put(target + 2, blue / count)
        greenTotal += green / count
      }
    }
    lastCropGreen = greenTotal / (size * size)
  }

  /** SQI + PSD over the latest 450 samples, left-zero-padded while filling (as on web). */
  private fun runSpectrum(): Pair<Float, Float> {
    val size = WINDOW_SIZE
    val sqiInput = sqi.input("serving_default_input_signal:0")
    val psdInput = psd.input("serving_default_input:0")
    val padding = size - ringCount
    for (index in 0 until size) {
      val value = if (index < padding) 0f else ring[index - padding]
      sqiInput.put(index, value)
      psdInput.put(index, value)
    }
    sqi.invoke()
    psd.invoke()
    val quality = sqi.output("PartitionedCall_1:0").get(0)
    val rawRate = psd.output("PartitionedCall_1:0").get(0)
    // Correct for the actual frame rate, matching the original FacePhys formula.
    val heartRate = rawRate / 30f / smoothedDt.toFloat()
    return heartRate to quality
  }

  fun close() {
    rppg.close()
    sqi.close()
    psd.close()
  }
}
