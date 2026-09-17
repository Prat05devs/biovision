import Foundation
import TensorFlowLiteC

enum FacePhysError: LocalizedError {
  case missingResource(String)
  case modelLoadFailed(String)
  case tensorNotFound(String)
  case inferenceFailed(String)

  var errorDescription: String? {
    switch self {
    case .missingResource(let name): return "FacePhys resource \(name) is missing from the app bundle."
    case .modelLoadFailed(let name): return "FacePhys model \(name) could not be loaded."
    case .tensorNotFound(let name): return "FacePhys tensor \(name) was not found."
    case .inferenceFailed(let name): return "FacePhys model \(name) failed to run."
    }
  }
}

/// Thin wrapper over the TensorFlow Lite C API. Tensors are addressed by name,
/// because the browser runtime and native TFLite enumerate them in different orders.
final class TFLiteInterpreter {
  private let name: String
  private let model: OpaquePointer
  private let options: OpaquePointer
  private let interpreter: OpaquePointer
  private let delegate: UnsafeMutablePointer<TfLiteDelegate>?
  private var inputIndexByName: [String: Int32] = [:]
  private var outputIndexByName: [String: Int32] = [:]

  init(resource: String, threads: Int32 = 2) throws {
    name = resource
    guard let url = FacePhysResources.url(for: resource) else { throw FacePhysError.missingResource(resource) }
    guard let model = TfLiteModelCreateFromFile(url.path) else { throw FacePhysError.modelLoadFailed(resource) }
    guard let options = TfLiteInterpreterOptionsCreate() else {
      TfLiteModelDelete(model)
      throw FacePhysError.modelLoadFailed(resource)
    }
    TfLiteInterpreterOptionsSetNumThreads(options, threads)
    // XNNPACK is TFLite's optimized CPU backend; unsupported ops fall back to the default kernels.
    var delegateOptions = TfLiteXNNPackDelegateOptionsDefault()
    delegateOptions.num_threads = threads
    let delegate = TfLiteXNNPackDelegateCreate(&delegateOptions)
    if let delegate { TfLiteInterpreterOptionsAddDelegate(options, delegate) }
    guard let interpreter = TfLiteInterpreterCreate(model, options),
          TfLiteInterpreterAllocateTensors(interpreter) == kTfLiteOk else {
      TfLiteInterpreterOptionsDelete(options)
      if let delegate { TfLiteXNNPackDelegateDelete(delegate) }
      TfLiteModelDelete(model)
      throw FacePhysError.modelLoadFailed(resource)
    }
    self.delegate = delegate
    self.model = model
    self.options = options
    self.interpreter = interpreter
    for index in 0..<TfLiteInterpreterGetInputTensorCount(interpreter) {
      if let tensor = TfLiteInterpreterGetInputTensor(interpreter, index), let raw = TfLiteTensorName(tensor) {
        inputIndexByName[String(cString: raw)] = index
      }
    }
    for index in 0..<TfLiteInterpreterGetOutputTensorCount(interpreter) {
      if let tensor = TfLiteInterpreterGetOutputTensor(interpreter, index), let raw = TfLiteTensorName(tensor) {
        outputIndexByName[String(cString: raw)] = index
      }
    }
  }

  deinit {
    TfLiteInterpreterDelete(interpreter)
    if let delegate { TfLiteXNNPackDelegateDelete(delegate) }
    TfLiteInterpreterOptionsDelete(options)
    TfLiteModelDelete(model)
  }

  var inputNames: [String] { Array(inputIndexByName.keys) }

  /// Writable float32 storage of a named input tensor. Stable after allocation.
  func input(_ tensorName: String) throws -> UnsafeMutableBufferPointer<Float32> {
    guard let index = inputIndexByName[tensorName],
          let tensor = TfLiteInterpreterGetInputTensor(interpreter, index),
          let data = TfLiteTensorData(tensor) else { throw FacePhysError.tensorNotFound(tensorName) }
    let count = TfLiteTensorByteSize(tensor) / MemoryLayout<Float32>.stride
    return UnsafeMutableBufferPointer(start: data.assumingMemoryBound(to: Float32.self), count: count)
  }

  func output(_ tensorName: String) throws -> UnsafeBufferPointer<Float32> {
    guard let index = outputIndexByName[tensorName],
          let tensor = TfLiteInterpreterGetOutputTensor(interpreter, index),
          let data = TfLiteTensorData(tensor) else { throw FacePhysError.tensorNotFound(tensorName) }
    let count = TfLiteTensorByteSize(tensor) / MemoryLayout<Float32>.stride
    return UnsafeBufferPointer(start: UnsafeRawPointer(data).assumingMemoryBound(to: Float32.self), count: count)
  }

  func invoke() throws {
    guard TfLiteInterpreterInvoke(interpreter) == kTfLiteOk else { throw FacePhysError.inferenceFailed(name) }
  }
}

enum FacePhysResources {
  private static let bundle: Bundle? = {
    let owner = Bundle(for: TFLiteInterpreter.self)
    guard let url = owner.url(forResource: "BioVisionFacePhysModels", withExtension: "bundle") else { return nil }
    return Bundle(url: url)
  }()

  static func url(for resource: String) -> URL? {
    let name = (resource as NSString).deletingPathExtension
    let ext = (resource as NSString).pathExtension
    return bundle?.url(forResource: name, withExtension: ext)
  }
}
