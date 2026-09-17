import Foundation
import NitroModules

final class HybridEyeScreener: HybridEyeScreenerSpec {
  private static let queue = DispatchQueue(label: "biovision.eyescreener", qos: .userInitiated)

  func analyze(path: String, female: Bool) throws -> Promise<EyeImageResult> {
    return Promise.parallel(HybridEyeScreener.queue) {
      let result = try ConjunctivaAnalyzer().analyze(path: path, female: female)
      return EyeImageResult(
        meanLuminance: result.meanLuminance,
        clippedFraction: result.clippedFraction,
        hemoglobinGdl: result.hemoglobinGdl
      )
    }
  }

  func detectFace(path: String, maxEdge: Double) throws -> Promise<FaceImageResult> {
    return Promise.parallel(HybridEyeScreener.queue) {
      var image = try ConjunctivaAnalyzer.loadUprightRGBA(path: path)
      let scale = min(1, maxEdge / Double(max(image.width, image.height)))
      if scale < 1 {
        image = ConjunctivaAnalyzer.resizeBilinearAntialiased(
          image, width: max(1, Int(Double(image.width) * scale)), height: max(1, Int(Double(image.height) * scale)))
      }
      let width = image.width, height = image.height

      // The face models read BGRA.
      var bgra = image.pixels
      for index in stride(from: 0, to: bgra.count, by: 4) { bgra.swapAt(index, index + 2) }

      var landmarks: [Double] = []
      try bgra.withUnsafeBufferPointer { buffer in
        let pixels = buffer.baseAddress!
        let detector = try BlazeFaceDetector()
        let landmarker = try FaceLandmarker()
        let detect = { try detector.detect(bgra: pixels, width: width, height: height, bytesPerRow: width * 4) }
        // Like MediaPipe IMAGE mode: detection gives the first region; a second pass on the
        // landmark-derived region refines alignment.
        guard try landmarker.process(bgra: pixels, width: width, height: height, bytesPerRow: width * 4, detection: detect) != nil,
              let points = try landmarker.process(bgra: pixels, width: width, height: height, bytesPerRow: width * 4, detection: detect) else { return }
        let frameWidth = Double(width), frameHeight = Double(height)
        landmarks.reserveCapacity(478 * 3)
        for index in 0..<478 {
          landmarks.append(Double(points[index * 3]) / frameWidth)
          landmarks.append(Double(points[index * 3 + 1]) / frameHeight)
          landmarks.append(Double(points[index * 3 + 2]) / frameWidth)
        }
      }

      let buffer = image.pixels.withUnsafeBufferPointer { ArrayBuffer.copy(of: $0.baseAddress!, size: $0.count) }
      return FaceImageResult(width: Double(width), height: Double(height), pixels: buffer, landmarks: landmarks)
    }
  }
}
