import Foundation

/// MediaPipe Face Landmarker (the model inside face_landmarker.task that the web app
/// runs): 478 landmarks from a rotated, square 256x256 face crop. Like MediaPipe's
/// VIDEO mode, the next region comes from the previous landmarks and BlazeFace only
/// runs when tracking is lost.
final class FaceLandmarker {
  private static let inputSize = 256
  private static let roiScale: Float = 1.5
  private static let minPresence: Float = 0.55

  private let interpreter: TFLiteInterpreter
  private let input: UnsafeMutableBufferPointer<Float32>
  private let landmarksOutput: UnsafeBufferPointer<Float32>
  private let presenceOutput: UnsafeBufferPointer<Float32>
  private var trackedRegion: Region?

  private struct Region {
    var centerX: Float
    var centerY: Float
    var size: Float
    var angle: Float
  }

  init() throws {
    interpreter = try TFLiteInterpreter(resource: "face_landmarks_detector.tflite")
    input = try interpreter.input("input_12")
    landmarksOutput = try interpreter.output("Identity")
    presenceOutput = try interpreter.output("Identity_1")
  }

  func reset() { trackedRegion = nil }

  /// Returns 478 x (x, y, z) landmarks in source pixels, or nil when no face is present.
  func process(
    bgra pixels: UnsafePointer<UInt8>, width: Int, height: Int, bytesPerRow: Int,
    detection: () throws -> FaceDetection?
  ) throws -> [Float]? {
    if trackedRegion == nil, let face = try detection() {
      trackedRegion = FaceLandmarker.region(from: face)
    }
    guard let region = trackedRegion else { return nil }

    writeCrop(pixels: pixels, width: width, height: height, bytesPerRow: bytesPerRow, region: region)
    try interpreter.invoke()
    let presence = 1 / (1 + exp(-presenceOutput[0]))
    guard presence >= FaceLandmarker.minPresence else {
      trackedRegion = nil
      return nil
    }

    let size = Float(FaceLandmarker.inputSize)
    let cosine = cos(region.angle), sine = sin(region.angle)
    var points = [Float](repeating: 0, count: 478 * 3)
    for index in 0..<478 {
      let localX = (landmarksOutput[index * 3] / size - 0.5) * region.size
      let localY = (landmarksOutput[index * 3 + 1] / size - 0.5) * region.size
      points[index * 3] = region.centerX + localX * cosine - localY * sine
      points[index * 3 + 1] = region.centerY + localX * sine + localY * cosine
      points[index * 3 + 2] = landmarksOutput[index * 3 + 2] / size * region.size
    }
    trackedRegion = FaceLandmarker.region(from: points)
    return points
  }

  /// Detection -> ROI: rotation from the eye keypoints, 1.5x the longer box side.
  private static func region(from face: FaceDetection) -> Region {
    let rightEye = face.keypoints[0], leftEye = face.keypoints[1]
    return Region(
      centerX: face.rect.x + face.rect.width / 2,
      centerY: face.rect.y + face.rect.height / 2,
      size: max(face.rect.width, face.rect.height) * roiScale,
      angle: atan2(leftEye.y - rightEye.y, leftEye.x - rightEye.x)
    )
  }

  /// Landmarks -> next ROI: rotation from the outer eye corners (33, 263), bounding box x1.5.
  private static func region(from points: [Float]) -> Region {
    var minX = Float.greatestFiniteMagnitude, minY = Float.greatestFiniteMagnitude
    var maxX = -Float.greatestFiniteMagnitude, maxY = -Float.greatestFiniteMagnitude
    for index in 0..<478 {
      minX = min(minX, points[index * 3]); maxX = max(maxX, points[index * 3])
      minY = min(minY, points[index * 3 + 1]); maxY = max(maxY, points[index * 3 + 1])
    }
    return Region(
      centerX: (minX + maxX) / 2,
      centerY: (minY + maxY) / 2,
      size: max(maxX - minX, maxY - minY) * roiScale,
      angle: atan2(points[263 * 3 + 1] - points[33 * 3 + 1], points[263 * 3] - points[33 * 3])
    )
  }

  /// Bilinear, rotated square crop into RGB [0, 1]; edges clamp to the nearest pixel.
  private func writeCrop(pixels: UnsafePointer<UInt8>, width: Int, height: Int, bytesPerRow: Int, region: Region) {
    let size = FaceLandmarker.inputSize
    let cosine = cos(region.angle), sine = sin(region.angle)
    let step = region.size / Float(size)
    let maxX = width - 1, maxY = height - 1
    for row in 0..<size {
      let localY = (Float(row) + 0.5) * step - region.size / 2
      for column in 0..<size {
        let localX = (Float(column) + 0.5) * step - region.size / 2
        let sourceX = region.centerX + localX * cosine - localY * sine - 0.5
        let sourceY = region.centerY + localX * sine + localY * cosine - 0.5
        let x0 = Int(floor(sourceX)), y0 = Int(floor(sourceY))
        let fx = sourceX - Float(x0), fy = sourceY - Float(y0)
        let xa = min(max(x0, 0), maxX), xb = min(max(x0 + 1, 0), maxX)
        let ya = min(max(y0, 0), maxY), yb = min(max(y0 + 1, 0), maxY)
        let topLeft = ya * bytesPerRow + xa * 4, topRight = ya * bytesPerRow + xb * 4
        let bottomLeft = yb * bytesPerRow + xa * 4, bottomRight = yb * bytesPerRow + xb * 4
        let target = (row * size + column) * 3
        let wTopLeft = (1 - fx) * (1 - fy) / 255, wTopRight = fx * (1 - fy) / 255
        let wBottomLeft = (1 - fx) * fy / 255, wBottomRight = fx * fy / 255
        // BGRA source -> RGB tensor.
        input[target] = Float(pixels[topLeft + 2]) * wTopLeft + Float(pixels[topRight + 2]) * wTopRight
          + Float(pixels[bottomLeft + 2]) * wBottomLeft + Float(pixels[bottomRight + 2]) * wBottomRight
        input[target + 1] = Float(pixels[topLeft + 1]) * wTopLeft + Float(pixels[topRight + 1]) * wTopRight
          + Float(pixels[bottomLeft + 1]) * wBottomLeft + Float(pixels[bottomRight + 1]) * wBottomRight
        input[target + 2] = Float(pixels[topLeft]) * wTopLeft + Float(pixels[topRight]) * wTopRight
          + Float(pixels[bottomLeft]) * wBottomLeft + Float(pixels[bottomRight]) * wBottomRight
      }
    }
  }
}
