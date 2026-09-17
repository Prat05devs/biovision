import AVFoundation
import CoreImage
import NitroModules
import VisionCamera

private final class SampleBufferDelegate: NSObject, AVCaptureVideoDataOutputSampleBufferDelegate {
  private let onSampleBuffer: (CMSampleBuffer, AVCaptureConnection) -> Void

  init(onSampleBuffer: @escaping (CMSampleBuffer, AVCaptureConnection) -> Void) {
    self.onSampleBuffer = onSampleBuffer
  }

  func captureOutput(_ output: AVCaptureOutput, didOutput sampleBuffer: CMSampleBuffer, from connection: AVCaptureConnection) {
    onSampleBuffer(sampleBuffer, connection)
  }
}

/// A VisionCamera output that runs the on-device face pipeline: MediaPipe Face Landmarker
/// for the live mesh and, when `measureVitals` is set, FacePhys heart rate. Camera frames
/// never leave this class; only landmarks, BVP samples and estimates reach JS.
final class HybridFacePhysOutput: HybridCameraOutputSpec, NativeCameraOutput {
  private static let workingWidth = 480
  private static let frameIntervalMs = 1000.0 / 30.0
  private static let updateIntervalMs = 66.0

  let output = AVCaptureVideoDataOutput()
  let requiresAudioInput = false
  let requiresDepthFormat = false
  let mediaType: MediaType = .video
  let streamType: StreamType = .video
  var outputOrientation: CameraOrientation = .up
  var currentResolution: Size? {
    output.connection(with: .video)?.inputStreamResolution
  }
  var targetResolution: ResolutionRule { .closestTo(Size(width: 720, height: 1280)) }

  private let queue = DispatchQueue(label: "biovision.facepipeline", qos: .userInitiated)
  private let measureVitals: Bool
  private let onUpdate: (FacePhysUpdate) -> Void
  private let onError: (Error) -> Void
  private var delegate: SampleBufferDelegate?

  // No color management: models must see the camera's own pixel values, as the browser canvas does.
  private let ciContext = CIContext(options: [.cacheIntermediates: false, .workingColorSpace: NSNull(), .outputColorSpace: NSNull()])
  private var pool: CVPixelBufferPool?
  private var poolSize = (width: 0, height: 0)
  private var connectionConfigured = false

  private var detector: BlazeFaceDetector?
  private var landmarker: FaceLandmarker?
  private var engine: FacePhysEngine?
  private var failed = false

  private var lastFrameMs = 0.0
  private var lastUpdateMs = 0.0
  private var frameIndex = 0
  private var frameTimes: [Double] = []
  private var pending: [FacePhysSample] = []
  private var latestLandmarks: [Double]?
  private var latestFace: FacePhysFaceBox?
  private var latestHeartRate: Double?
  private var latestQuality: Double?

  init(options: FacePhysOutputOptions) {
    measureVitals = options.measureVitals
    onUpdate = options.onUpdate
    onError = options.onError
    super.init()
    output.videoSettings = [kCVPixelBufferPixelFormatTypeKey as String: kCVPixelFormatType_32BGRA]
    output.alwaysDiscardsLateVideoFrames = true
    let delegate = SampleBufferDelegate { [weak self] buffer, connection in self?.handle(buffer, connection) }
    self.delegate = delegate
    output.setSampleBufferDelegate(delegate, queue: queue)
  }

  func configure(config: OutputConfiguration) {
    guard let connection = output.connection(with: .video) else { return }
    configureConnection(connection)
  }

  /// Upright, unmirrored frames. Also applied on the first delivered frame, because the
  /// connection may not exist yet when VisionCamera calls `configure`.
  private func configureConnection(_ connection: AVCaptureConnection) {
    connection.preferredVideoStabilizationMode = .off
    if connection.isVideoOrientationSupported { connection.videoOrientation = .portrait }
    if connection.isVideoMirroringSupported {
      connection.automaticallyAdjustsVideoMirroring = false
      connection.isVideoMirrored = false
    }
    connectionConfigured = true
  }

  private func handle(_ buffer: CMSampleBuffer, _ connection: AVCaptureConnection) {
    if failed { return }
    if !connectionConfigured { configureConnection(connection) }
    let captureMs = CMTimeGetSeconds(CMSampleBufferGetPresentationTimeStamp(buffer)) * 1000
    // 30 fps, like the web frame loop; tolerate a millisecond of camera jitter.
    if lastFrameMs > 0 && captureMs - lastFrameMs < HybridFacePhysOutput.frameIntervalMs - 1 { return }
    lastFrameMs = captureMs

    do {
      if detector == nil {
        detector = try BlazeFaceDetector()
        landmarker = try FaceLandmarker()
        if measureVitals { engine = try FacePhysEngine() }
      }
      guard let source = CMSampleBufferGetImageBuffer(buffer), let frame = try uprightFrame(source) else { return }
      CVPixelBufferLockBaseAddress(frame, .readOnly)
      defer { CVPixelBufferUnlockBaseAddress(frame, .readOnly) }
      guard let base = CVPixelBufferGetBaseAddress(frame) else { return }
      try process(
        pixels: base.assumingMemoryBound(to: UInt8.self),
        width: CVPixelBufferGetWidth(frame),
        height: CVPixelBufferGetHeight(frame),
        bytesPerRow: CVPixelBufferGetBytesPerRow(frame),
        captureMs: captureMs
      )
    } catch {
      failed = true
      onError(error)
    }
  }

  private func process(pixels: UnsafePointer<UInt8>, width: Int, height: Int, bytesPerRow: Int, captureMs: Double) throws {
    guard let detector, let landmarker else { return }
    frameIndex += 1
    frameTimes.append(captureMs)
    frameTimes.removeAll { captureMs - $0 > 1000 }

    // FacePhys needs a BlazeFace box every frame (as on web); share it with the landmarker.
    var detection: FaceDetection?
    var detected = false
    let detect = { () throws -> FaceDetection? in
      if !detected { detection = try detector.detect(bgra: pixels, width: width, height: height, bytesPerRow: bytesPerRow); detected = true }
      return detection
    }

    // With vitals running, the mesh updates at 15 fps so heart-rate frames stay on time.
    if !measureVitals || frameIndex % 2 == 0 {
      if let points = try landmarker.process(bgra: pixels, width: width, height: height, bytesPerRow: bytesPerRow, detection: detect) {
        var normalized = [Double](repeating: 0, count: points.count)
        for index in 0..<478 {
          normalized[index * 3] = Double(points[index * 3]) / Double(width)
          normalized[index * 3 + 1] = Double(points[index * 3 + 1]) / Double(height)
          normalized[index * 3 + 2] = Double(points[index * 3 + 2]) / Double(width)
        }
        latestLandmarks = normalized
      } else {
        latestLandmarks = nil
      }
    }

    if let engine {
      let face = try detect()?.rect
      let result = try engine.process(bgra: pixels, width: width, height: height, bytesPerRow: bytesPerRow, captureMs: captureMs, face: face)
      if let sample = result.sample { pending.append(FacePhysSample(value: Double(sample.value), timestampMs: sample.timestampMs)) }
      if let heartRate = result.heartRate { latestHeartRate = Double(heartRate) }
      if let quality = result.signalQuality { latestQuality = Double(quality) }
      latestFace = face.map {
        FacePhysFaceBox(x: Double($0.x) / Double(width), y: Double($0.y) / Double(height),
                        width: Double($0.width) / Double(width), height: Double($0.height) / Double(height))
      }
    }

    guard captureMs - lastUpdateMs >= HybridFacePhysOutput.updateIntervalMs else { return }
    lastUpdateMs = captureMs
    let update = FacePhysUpdate(
      frameWidth: Double(width),
      frameHeight: Double(height),
      landmarks: latestLandmarks,
      samples: pending,
      heartRate: latestHeartRate,
      signalQuality: latestQuality,
      face: latestFace,
      framesPerSecond: Double(frameTimes.count)
    )
    // Estimates are sent once per PSD run so JS sees one reading per spectrum, as on web.
    pending.removeAll(keepingCapacity: true)
    latestHeartRate = nil
    latestQuality = nil
    onUpdate(update)
  }

  /// Any camera pixel format and orientation -> upright BGRA, 480 px wide. Rotates sensor-
  /// oriented (landscape) buffers in case the portrait connection setting was not honoured.
  private func uprightFrame(_ source: CVPixelBuffer) throws -> CVPixelBuffer? {
    var image = CIImage(cvPixelBuffer: source)
    if image.extent.width > image.extent.height { image = image.oriented(.right) }
    let scale = CGFloat(HybridFacePhysOutput.workingWidth) / image.extent.width
    image = image.transformed(by: CGAffineTransform(scaleX: scale, y: scale))
    image = image.transformed(by: CGAffineTransform(translationX: -image.extent.origin.x, y: -image.extent.origin.y))
    let width = HybridFacePhysOutput.workingWidth
    let height = Int((image.extent.height).rounded())
    guard height > 0 else { return nil }

    if pool == nil || poolSize.width != width || poolSize.height != height {
      let attributes: [String: Any] = [
        kCVPixelBufferPixelFormatTypeKey as String: kCVPixelFormatType_32BGRA,
        kCVPixelBufferWidthKey as String: width,
        kCVPixelBufferHeightKey as String: height,
        kCVPixelBufferIOSurfacePropertiesKey as String: [:],
      ]
      var created: CVPixelBufferPool?
      CVPixelBufferPoolCreate(nil, nil, attributes as CFDictionary, &created)
      pool = created
      poolSize = (width, height)
    }
    guard let pool else { return nil }
    var target: CVPixelBuffer?
    CVPixelBufferPoolCreatePixelBuffer(nil, pool, &target)
    guard let target else { return nil }
    ciContext.render(image, to: target, bounds: CGRect(x: 0, y: 0, width: width, height: height), colorSpace: nil)
    return target
  }
}
