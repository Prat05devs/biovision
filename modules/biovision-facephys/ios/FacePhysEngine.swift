import Foundation

/// 1-D Kalman filter with the web SDK's face-box tuning (q = 1e-2, r = 5e-1).
private struct Kalman1D {
  var value: Float
  var variance: Float = 1
  let processNoise: Float = 1e-2
  let measurementNoise: Float = 5e-1

  mutating func update(_ measurement: Float) -> Float {
    let predicted = variance + processNoise
    let gain = predicted / (predicted + measurementNoise)
    value += gain * (measurement - value)
    variance = (1 - gain) * predicted
    return value
  }
}

struct FacePhysFrameResult {
  var sample: (value: Float, timestampMs: Double)?
  var heartRate: Float?
  var signalQuality: Float?
}

/// Native port of vitalcamera-sdk 0.6.9's FacePhys path (BrowserAdapter + inference
/// and PSD workers). Call once per 30 fps frame from one serial queue.
final class FacePhysEngine {
  private static let cropSize = 36
  private static let windowSize = 450
  private static let psdIntervalMs = 500.0

  private let rppg: TFLiteInterpreter
  private let sqi: TFLiteInterpreter
  private let psd: TFLiteInterpreter
  /// (input state_in_k, output Identity_(k+1)) pairs: each output feeds the next step's state.
  private let stateLinks: [(input: UnsafeMutableBufferPointer<Float32>, output: UnsafeBufferPointer<Float32>)]
  private let imageInput: UnsafeMutableBufferPointer<Float32>
  private let dtInput: UnsafeMutableBufferPointer<Float32>
  private let bvpOutput: UnsafeBufferPointer<Float32>

  private var boxX: Kalman1D?, boxY: Kalman1D?, boxW: Kalman1D?, boxH: Kalman1D?
  private var smoothedDt: Double = 1.0 / 30.0
  private var virtualTimeMs: Double = 0
  private var lastCaptureMs: Double = 0
  private var lastPsdMs: Double = 0
  private var ring: [Float32] = []

  init() throws {
    // Build from locals: Swift forbids closures capturing `self` before every property is set.
    let rppg = try TFLiteInterpreter(resource: "model.tflite")
    let stateNames = rppg.inputNames.filter { $0.hasPrefix("state_in_") }
    stateLinks = try stateNames.map { name in
      let k = Int(name.dropFirst("state_in_".count))!
      return (try rppg.input(name), try rppg.output("Identity_\(k + 1)"))
    }
    imageInput = try rppg.input("input")
    dtInput = try rppg.input("dt")
    bvpOutput = try rppg.output("Identity")
    self.rppg = rppg
    sqi = try TFLiteInterpreter(resource: "sqi_model.tflite", threads: 1)
    psd = try TFLiteInterpreter(resource: "psd_model.tflite", threads: 1)
    try loadInitialState()
  }

  /// Warm-start state shipped with FacePhys (state.gz, converted to float32 at build time).
  private func loadInitialState() throws {
    guard let indexURL = FacePhysResources.url(for: "state_index.json"),
          let blobURL = FacePhysResources.url(for: "state.bin") else {
      throw FacePhysError.missingResource("state.bin")
    }
    let index = try JSONDecoder().decode([String: StateEntry].self, from: Data(contentsOf: indexURL))
    let blob = try Data(contentsOf: blobURL)
    for (name, entry) in index {
      let destination = try rppg.input(name)
      guard entry.count == destination.count, (entry.offset + entry.count) * 4 <= blob.count else {
        throw FacePhysError.tensorNotFound(name)
      }
      blob.withUnsafeBytes { raw in
        let source = raw.baseAddress!.advanced(by: entry.offset * 4).assumingMemoryBound(to: Float32.self)
        destination.baseAddress!.update(from: source, count: entry.count)
      }
    }
  }

  private struct StateEntry: Decodable {
    let offset: Int
    let count: Int
  }

  /// Processes one upright BGRA frame with this frame's BlazeFace box (nil when no face).
  func process(bgra pixels: UnsafePointer<UInt8>, width: Int, height: Int, bytesPerRow: Int, captureMs: Double, face raw: FaceRect?) throws -> FacePhysFrameResult {
    if lastCaptureMs > 0 {
      let rawDt = (captureMs - lastCaptureMs) / 1000
      smoothedDt = smoothedDt * 0.997 + 0.003 * rawDt
      virtualTimeMs += smoothedDt * 1000
      virtualTimeMs = virtualTimeMs * 0.997 + 0.003 * captureMs
    } else {
      virtualTimeMs = captureMs
    }
    lastCaptureMs = captureMs

    var result = FacePhysFrameResult()
    guard let raw else {
      boxX = nil; boxY = nil; boxW = nil; boxH = nil
      return result
    }
    let box: FaceRect
    if var x = boxX, var y = boxY, var w = boxW, var h = boxH {
      box = FaceRect(x: x.update(raw.x), y: y.update(raw.y), width: w.update(raw.width), height: h.update(raw.height))
      boxX = x; boxY = y; boxW = w; boxH = h
    } else {
      boxX = Kalman1D(value: raw.x); boxY = Kalman1D(value: raw.y)
      boxW = Kalman1D(value: raw.width); boxH = Kalman1D(value: raw.height)
      box = raw
    }

    // `Int(someDouble)` traps in Swift when the value is NaN or infinite, and writeCrop converts
    // these coordinates without a second chance: the trap is a hard crash that no `catch` can
    // reach. The box comes from a model output through a filter, so a single bad inference — which
    // the same build can produce on one device and not another — takes the app down mid-scan.
    // Drop the frame and restart the filter instead.
    guard box.x.isFinite, box.y.isFinite, box.width.isFinite, box.height.isFinite,
          box.width > 0, box.height > 0 else {
      boxX = nil; boxY = nil; boxW = nil; boxH = nil
      return result
    }

    writeCrop(pixels: pixels, width: width, height: height, bytesPerRow: bytesPerRow, box: box)
    dtInput[0] = Float32(smoothedDt)
    try rppg.invoke()
    let value = bvpOutput[0]
    for link in stateLinks {
      link.input.baseAddress!.update(from: link.output.baseAddress!, count: link.input.count)
    }
    result.sample = (value, virtualTimeMs)

    ring.append(value)
    if ring.count > FacePhysEngine.windowSize { ring.removeFirst(ring.count - FacePhysEngine.windowSize) }
    if captureMs - lastPsdMs >= FacePhysEngine.psdIntervalMs {
      lastPsdMs = captureMs
      let (heartRate, quality) = try runSpectrum()
      result.heartRate = heartRate
      result.signalQuality = quality
    }
    return result
  }

  /// Area-averages the face box into the 36x36 RGB [0, 1] input (NDHWC [1, 1, 36, 36, 3]).
  private func writeCrop(pixels: UnsafePointer<UInt8>, width: Int, height: Int, bytesPerRow: Int, box: FaceRect) {
    let size = FacePhysEngine.cropSize
    let left = Double(box.x), top = Double(box.y)
    let cellWidth = Double(box.width) / Double(size), cellHeight = Double(box.height) / Double(size)
    for row in 0..<size {
      let y0 = max(0, min(height - 1, Int(top + Double(row) * cellHeight)))
      let y1 = max(y0 + 1, min(height, Int(top + Double(row + 1) * cellHeight)))
      for column in 0..<size {
        let x0 = max(0, min(width - 1, Int(left + Double(column) * cellWidth)))
        let x1 = max(x0 + 1, min(width, Int(left + Double(column + 1) * cellWidth)))
        var red = 0, green = 0, blue = 0
        for y in y0..<y1 {
          var offset = y * bytesPerRow + x0 * 4
          for _ in x0..<x1 {
            blue += Int(pixels[offset]); green += Int(pixels[offset + 1]); red += Int(pixels[offset + 2])
            offset += 4
          }
        }
        let count = Float32((y1 - y0) * (x1 - x0)) * 255
        let target = (row * size + column) * 3
        imageInput[target] = Float32(red) / count
        imageInput[target + 1] = Float32(green) / count
        imageInput[target + 2] = Float32(blue) / count
      }
    }
  }

  /// SQI + PSD over the latest 450 samples, left-zero-padded while filling (as on web).
  private func runSpectrum() throws -> (Float, Float) {
    let size = FacePhysEngine.windowSize
    let sqiInput = try sqi.input("serving_default_input_signal:0")
    let psdInput = try psd.input("serving_default_input:0")
    let padding = size - ring.count
    for index in 0..<size {
      let value = index < padding ? 0 : ring[index - padding]
      sqiInput[index] = value
      psdInput[index] = value
    }
    try sqi.invoke()
    try psd.invoke()
    let quality = try sqi.output("PartitionedCall_1:0")[0]
    let rawRate = try psd.output("PartitionedCall_1:0")[0]
    // Correct for the actual frame rate, matching the original FacePhys formula.
    let heartRate = rawRate / 30 / Float32(smoothedDt)
    return (heartRate, quality)
  }
}
