package com.biovision.facephys

import android.content.Context
import java.io.FileInputStream
import java.nio.ByteBuffer
import java.nio.ByteOrder
import java.nio.FloatBuffer
import java.nio.channels.FileChannel
import org.tensorflow.lite.Interpreter

class FacePhysException(message: String) : RuntimeException(message)

/**
 * Thin wrapper over the TensorFlow Lite Java API, mirroring ios/TFLiteInterpreter.swift.
 * Tensors are addressed by name, because the browser runtime and native TFLite enumerate
 * them in different orders.
 *
 * iOS writes straight into tensor memory through the C API. The Java API exposes no such
 * pointer, so every input and output is backed by a direct ByteBuffer that is allocated
 * once and reused: the FacePhys engine relies on input contents persisting across frames
 * (the recurrent state tensors), which a per-call array would lose.
 */
class TFLiteInterpreter(context: Context, private val name: String, threads: Int = 2) {
  private val interpreter: Interpreter
  private val inputIndexByName = mutableMapOf<String, Int>()
  private val outputIndexByName = mutableMapOf<String, Int>()
  private val inputBuffers = mutableMapOf<Int, ByteBuffer>()
  private val outputBuffers = mutableMapOf<Int, ByteBuffer>()
  private val inputViews = mutableMapOf<Int, FloatBuffer>()
  private val outputViews = mutableMapOf<Int, FloatBuffer>()

  init {
    val model = try {
      loadAsset(context, name)
    } catch (error: Exception) {
      throw FacePhysException("FacePhys model $name could not be loaded: ${error.message}")
    }
    val options = Interpreter.Options().apply {
      numThreads = threads
      // XNNPACK is TFLite's optimized CPU backend; unsupported ops fall back to the
      // default kernels, matching the iOS delegate setup.
      setUseXNNPACK(true)
    }
    interpreter = Interpreter(model, options)
    interpreter.allocateTensors()

    for (index in 0 until interpreter.inputTensorCount) {
      val tensor = interpreter.getInputTensor(index)
      inputIndexByName[tensor.name()] = index
      val buffer = ByteBuffer.allocateDirect(tensor.numBytes()).order(ByteOrder.nativeOrder())
      inputBuffers[index] = buffer
      inputViews[index] = buffer.asFloatBuffer()
    }
    for (index in 0 until interpreter.outputTensorCount) {
      val tensor = interpreter.getOutputTensor(index)
      outputIndexByName[tensor.name()] = index
      val buffer = ByteBuffer.allocateDirect(tensor.numBytes()).order(ByteOrder.nativeOrder())
      outputBuffers[index] = buffer
      outputViews[index] = buffer.asFloatBuffer()
    }
  }

  /**
   * Models live in the library's assets. They are stored uncompressed (see `noCompress` in
   * build.gradle) so they can be memory-mapped instead of copied onto the heap.
   */
  private fun loadAsset(context: Context, asset: String): ByteBuffer {
    val descriptor = context.assets.openFd(asset)
    FileInputStream(descriptor.fileDescriptor).use { stream ->
      return stream.channel.map(
        FileChannel.MapMode.READ_ONLY,
        descriptor.startOffset,
        descriptor.declaredLength,
      ).order(ByteOrder.nativeOrder())
    }
  }

  val inputNames: List<String> get() = inputIndexByName.keys.toList()

  /** Writable float view of a named input tensor; contents persist between invocations. */
  fun input(tensorName: String): FloatBuffer {
    val index = inputIndexByName[tensorName]
      ?: throw FacePhysException("FacePhys tensor $tensorName was not found.")
    return inputViews.getValue(index)
  }

  /** Float view of a named output tensor, refreshed by [invoke]. */
  fun output(tensorName: String): FloatBuffer {
    val index = outputIndexByName[tensorName]
      ?: throw FacePhysException("FacePhys tensor $tensorName was not found.")
    return outputViews.getValue(index)
  }

  /** Runs the graph over the persistent buffers. */
  fun invoke() {
    val inputs = arrayOfNulls<Any>(interpreter.inputTensorCount)
    for ((index, buffer) in inputBuffers) {
      buffer.rewind()
      inputs[index] = buffer
    }
    val outputs = mutableMapOf<Int, Any>()
    for ((index, buffer) in outputBuffers) {
      buffer.rewind()
      outputs[index] = buffer
    }
    try {
      interpreter.runForMultipleInputsOutputs(inputs, outputs)
    } catch (error: Exception) {
      throw FacePhysException("FacePhys model $name failed to run: ${error.message}")
    }
  }

  fun close() = interpreter.close()
}
