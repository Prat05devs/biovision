import Foundation

struct FaceRect {
  var x: Float
  var y: Float
  var width: Float
  var height: Float
}

struct FaceDetection {
  var rect: FaceRect
  /// Right eye, left eye, nose tip, mouth, right ear, left ear (subject's sides), in source pixels.
  var keypoints: [(x: Float, y: Float)]
}

/// MediaPipe BlazeFace short-range detector, the same model the web SDK uses to
/// place the FacePhys crop. Input is letterboxed to 128x128 like MediaPipe's
/// FIT scale mode; returns the best face and its keypoints in source pixel coordinates.
final class BlazeFaceDetector {
  private static let inputSize = 128
  private static let minScore: Float = 0.5
  private static let suppressionIoU: Float = 0.3

  private let interpreter: TFLiteInterpreter
  private let anchors: [(x: Float, y: Float)]

  init() throws {
    interpreter = try TFLiteInterpreter(resource: "blaze_face_short_range.tflite")
    anchors = BlazeFaceDetector.makeAnchors()
  }

  /// `pixels` is upright BGRA, `bytesPerRow` wide rows.
  func detect(bgra pixels: UnsafePointer<UInt8>, width: Int, height: Int, bytesPerRow: Int) throws -> FaceDetection? {
    let size = BlazeFaceDetector.inputSize
    let scale = Float(size) / Float(max(width, height))
    let scaledWidth = Float(width) * scale
    let scaledHeight = Float(height) * scale
    let padX = (Float(size) - scaledWidth) / 2
    let padY = (Float(size) - scaledHeight) / 2

    let input = try interpreter.input("input")
    for row in 0..<size {
      for column in 0..<size {
        let target = (row * size + column) * 3
        let sourceX = (Float(column) + 0.5 - padX) / scale
        let sourceY = (Float(row) + 0.5 - padY) / scale
        guard sourceX >= 0, sourceY >= 0, sourceX < Float(width), sourceY < Float(height) else {
          input[target] = -1; input[target + 1] = -1; input[target + 2] = -1
          continue
        }
        let offset = Int(sourceY) * bytesPerRow + Int(sourceX) * 4
        // BGRA -> RGB in [-1, 1].
        input[target] = Float(pixels[offset + 2]) / 127.5 - 1
        input[target + 1] = Float(pixels[offset + 1]) / 127.5 - 1
        input[target + 2] = Float(pixels[offset]) / 127.5 - 1
      }
    }
    try interpreter.invoke()

    let regressors = try interpreter.output("regressors")
    let scores = try interpreter.output("classificators")
    var candidates: [(rect: FaceRect, keypoints: [Float], score: Float)] = []
    for index in 0..<anchors.count {
      let score = 1 / (1 + exp(-max(-100, min(100, scores[index]))))
      guard score >= BlazeFaceDetector.minScore else { continue }
      let base = index * 16
      let centerX = regressors[base] / Float(size) + anchors[index].x
      let centerY = regressors[base + 1] / Float(size) + anchors[index].y
      let boxWidth = regressors[base + 2] / Float(size)
      let boxHeight = regressors[base + 3] / Float(size)
      var keypoints = [Float](repeating: 0, count: 12)
      for k in 0..<6 {
        keypoints[k * 2] = regressors[base + 4 + k * 2] / Float(size) + anchors[index].x
        keypoints[k * 2 + 1] = regressors[base + 5 + k * 2] / Float(size) + anchors[index].y
      }
      candidates.append((FaceRect(x: centerX - boxWidth / 2, y: centerY - boxHeight / 2, width: boxWidth, height: boxHeight), keypoints, score))
    }
    guard let best = candidates.max(by: { $0.score < $1.score }) else { return nil }

    // MediaPipe blends overlapping detections (weighted NMS) instead of keeping one raw box.
    let cluster = candidates.filter { BlazeFaceDetector.iou($0.rect, best.rect) > BlazeFaceDetector.suppressionIoU }
    let total = cluster.reduce(Float(0)) { $0 + $1.score }
    var blended = FaceRect(x: 0, y: 0, width: 0, height: 0)
    var blendedKeypoints = [Float](repeating: 0, count: 12)
    for candidate in cluster {
      let weight = candidate.score / total
      blended.x += candidate.rect.x * weight
      blended.y += candidate.rect.y * weight
      blended.width += candidate.rect.width * weight
      blended.height += candidate.rect.height * weight
      for k in 0..<12 { blendedKeypoints[k] += candidate.keypoints[k] * weight }
    }

    // Undo the letterbox and convert to source pixels.
    let rect = FaceRect(
      x: (blended.x * Float(size) - padX) / scale,
      y: (blended.y * Float(size) - padY) / scale,
      width: blended.width * Float(size) / scale,
      height: blended.height * Float(size) / scale
    )
    guard rect.width > 1, rect.height > 1 else { return nil }
    let keypoints = (0..<6).map { k in
      ((blendedKeypoints[k * 2] * Float(size) - padX) / scale, (blendedKeypoints[k * 2 + 1] * Float(size) - padY) / scale)
    }
    return FaceDetection(rect: rect, keypoints: keypoints)
  }

  private static func iou(_ a: FaceRect, _ b: FaceRect) -> Float {
    let left = max(a.x, b.x), top = max(a.y, b.y)
    let right = min(a.x + a.width, b.x + b.width), bottom = min(a.y + a.height, b.y + b.height)
    let intersection = max(0, right - left) * max(0, bottom - top)
    let union = a.width * a.height + b.width * b.height - intersection
    return union > 0 ? intersection / union : 0
  }

  /// SSD anchors for face_detection_short_range: strides [8, 16, 16, 16], offset 0.5.
  private static func makeAnchors() -> [(x: Float, y: Float)] {
    var anchors: [(x: Float, y: Float)] = []
    for (stride, perCell) in [(8, 2), (16, 6)] {
      let cells = inputSize / stride
      for y in 0..<cells {
        for x in 0..<cells {
          for _ in 0..<perCell {
            anchors.append(((Float(x) + 0.5) / Float(cells), (Float(y) + 0.5) / Float(cells)))
          }
        }
      }
    }
    return anchors
  }
}
