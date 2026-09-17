import Accelerate
import CoreGraphics
import Foundation
import ImageIO

struct EyeImageAnalysis {
  /// Mean BT.601 luminance (0-255) and fraction of near-white pixels on a 512 px thumbnail.
  var meanLuminance: Double
  var clippedFraction: Double
  /// nil when no sufficiently large conjunctiva region was found.
  var hemoglobinGdl: Double?
}

enum ConjunctivaError: LocalizedError {
  case unreadableImage(String)

  var errorDescription: String? {
    switch self {
    case .unreadableImage(let path): return "The eye photo at \(path) could not be read."
    }
  }
}

/// On-device haemoglobin estimate from a lower-eyelid photo:
/// PIL-equivalent resize to 800 px wide -> OpenCV-equivalent HSV red mask with 15 px elliptical
/// close/open -> colour features of the conjunctiva pixels -> ridge regression.
/// Mirrors ml/conjunctiva_colour/train.py exactly, so evaluation numbers apply to the app.
final class ConjunctivaAnalyzer {
  private static let workingWidth = 800

  init() {}

  func analyze(path: String, female: Bool) throws -> EyeImageAnalysis {
    let rgba = try ConjunctivaAnalyzer.loadUprightRGBA(path: path)
    let exposure = ConjunctivaAnalyzer.exposure(rgba)
    var result = EyeImageAnalysis(meanLuminance: exposure.mean, clippedFraction: exposure.clipped)
    let height = max(1, rgba.height * ConjunctivaAnalyzer.workingWidth / rgba.width)
    let working = ConjunctivaAnalyzer.resizeBilinearAntialiased(rgba, width: ConjunctivaAnalyzer.workingWidth, height: height)
    guard let features = ConjunctivaAnalyzer.colourFeatures(working, female: female) else { return result }
    var hemoglobin = ConjunctivaAnalyzer.intercept
    for index in 0..<features.count {
      hemoglobin += ConjunctivaAnalyzer.coefficients[index] * (features[index] - ConjunctivaAnalyzer.featureMean[index]) / ConjunctivaAnalyzer.featureScale[index]
    }
    result.hemoglobinGdl = hemoglobin
    return result
  }

  // MARK: - Image loading

  struct RGBAImage {
    var width: Int
    var height: Int
    var pixels: [UInt8]
  }

  /// Decodes with EXIF orientation applied, like PIL's ImageOps.exif_transpose.
  static func loadUprightRGBA(path: String) throws -> RGBAImage {
    let url = URL(fileURLWithPath: path.hasPrefix("file://") ? String(path.dropFirst(7)) : path)
    guard let source = CGImageSourceCreateWithURL(url as CFURL, nil),
          let properties = CGImageSourceCopyPropertiesAtIndex(source, 0, nil) as? [CFString: Any],
          let pixelWidth = properties[kCGImagePropertyPixelWidth] as? Int,
          let pixelHeight = properties[kCGImagePropertyPixelHeight] as? Int else {
      throw ConjunctivaError.unreadableImage(path)
    }
    let options: [CFString: Any] = [
      kCGImageSourceCreateThumbnailFromImageAlways: true,
      kCGImageSourceCreateThumbnailWithTransform: true,
      kCGImageSourceThumbnailMaxPixelSize: max(pixelWidth, pixelHeight),
    ]
    guard let image = CGImageSourceCreateThumbnailAtIndex(source, 0, options as CFDictionary) else {
      throw ConjunctivaError.unreadableImage(path)
    }
    let width = image.width, height = image.height
    var pixels = [UInt8](repeating: 0, count: width * height * 4)
    let drawn = pixels.withUnsafeMutableBytes { buffer -> Bool in
      guard let context = CGContext(
        data: buffer.baseAddress, width: width, height: height, bitsPerComponent: 8, bytesPerRow: width * 4,
        // Draw in the file's own color space so pixel values match a plain decoder (PIL) exactly.
        space: image.colorSpace?.model == .rgb ? image.colorSpace! : CGColorSpace(name: CGColorSpace.sRGB)!, bitmapInfo: CGImageAlphaInfo.noneSkipLast.rawValue
      ) else { return false }
      context.draw(image, in: CGRect(x: 0, y: 0, width: width, height: height))
      return true
    }
    guard drawn else { throw ConjunctivaError.unreadableImage(path) }
    return RGBAImage(width: width, height: height, pixels: pixels)
  }

  // MARK: - Exposure (captures/quality.py)

  static func exposure(_ image: RGBAImage) -> (mean: Double, clipped: Double) {
    let scale = min(1, 512 / Double(max(image.width, image.height)))
    let thumb = scale < 1
      ? resizeBilinearAntialiased(image, width: max(1, Int(Double(image.width) * scale)), height: max(1, Int(Double(image.height) * scale)))
      : image
    var sum = 0, clipped = 0
    let count = thumb.width * thumb.height
    for index in 0..<count {
      let offset = index * 4
      // PIL "L" conversion (ITU-R 601-2, fixed point with rounding).
      let luminance = (Int(thumb.pixels[offset]) * 19595 + Int(thumb.pixels[offset + 1]) * 38470 + Int(thumb.pixels[offset + 2]) * 7471 + 0x8000) >> 16
      sum += luminance
      if luminance >= 250 { clipped += 1 }
    }
    return (Double(sum) / Double(count), Double(clipped) / Double(count))
  }

  // MARK: - Conjunctiva mask and crop (anemia_effnet.py `_crop_conjunctiva`)

  static func redMask(_ image: RGBAImage) -> [UInt8] {
    var mask = [UInt8](repeating: 0, count: image.width * image.height)
    for index in 0..<mask.count {
      let offset = index * 4
      let (h, s, v) = opencvHSV(r: image.pixels[offset], g: image.pixels[offset + 1], b: image.pixels[offset + 2])
      let lowerRed = h <= 10 && s >= 50 && v >= 50
      let upperRed = h >= 160 && s >= 50 && v >= 50
      if lowerRed || upperRed { mask[index] = 255 }
    }
    return mask
  }

  /// OpenCV COLOR_RGB2HSV for 8-bit images: H in 0...180, S and V in 0...255.
  @inline(__always)
  static func opencvHSV(r: UInt8, g: UInt8, b: UInt8) -> (Int, Int, Int) {
    let red = Int(r), green = Int(g), blue = Int(b)
    let value = max(red, green, blue)
    let difference = value - min(red, green, blue)
    let saturation = value == 0 ? 0 : (difference * 255 + value / 2) / value
    guard difference != 0 else { return (0, saturation, value) }
    var hue: Double
    if value == red { hue = 60 * Double(green - blue) / Double(difference) }
    else if value == green { hue = 120 + 60 * Double(blue - red) / Double(difference) }
    else { hue = 240 + 60 * Double(red - green) / Double(difference) }
    if hue < 0 { hue += 360 }
    return (Int((hue / 2).rounded()), saturation, value)
  }

  /// cv2.getStructuringElement(MORPH_ELLIPSE, (15, 15)).
  static let ellipseKernel: [Bool] = {
    let size = 15, radius = 7
    var kernel = [Bool](repeating: false, count: size * size)
    let inverseRadiusSquared = 1.0 / Double(radius * radius)
    for row in 0..<size {
      let dy = row - radius
      guard abs(dy) <= radius else { continue }
      let dx = Int((Double(radius) * (max(0, 1 - Double(dy * dy) * inverseRadiusSquared)).squareRoot()).rounded())
      for column in max(0, radius - dx)...min(size - 1, radius + dx) { kernel[row * size + column] = true }
    }
    return kernel
  }()

  /// Binary dilation (max) or erosion (min) with the elliptical kernel. Pixels outside the
  /// image never contribute, matching OpenCV's default morphology border.
  static func morph(_ source: [UInt8], width: Int, height: Int, dilate: Bool) -> [UInt8] {
    let size = 15, radius = 7
    var offsets: [(Int, Int)] = []
    for row in 0..<size { for column in 0..<size where ellipseKernel[row * size + column] { offsets.append((column - radius, row - radius)) } }
    // Per row, the kernel's horizontal half-span; a sliding window reduces work to rows x runs.
    var spans = [Int](repeating: -1, count: size)
    for (dx, dy) in offsets { spans[dy + radius] = max(spans[dy + radius], abs(dx)) }

    // Horizontal running max/min per span width, then combine rows.
    let target: UInt8 = dilate ? 255 : 0
    var output = [UInt8](repeating: dilate ? 0 : 255, count: source.count)
    var rowExtremes = [[UInt8]](repeating: [], count: radius + 1)
    for span in Set(spans.filter { $0 >= 0 }) {
      var row = [UInt8](repeating: 0, count: source.count)
      for y in 0..<height {
        let base = y * width
        // Prefix count of target pixels for O(1) window queries.
        var prefix = [Int](repeating: 0, count: width + 1)
        for x in 0..<width { prefix[x + 1] = prefix[x] + (source[base + x] == target ? 1 : 0) }
        for x in 0..<width {
          let lo = max(0, x - span), hi = min(width - 1, x + span)
          let hits = prefix[hi + 1] - prefix[lo]
          if dilate { row[base + x] = hits > 0 ? 255 : 0 }
          else { row[base + x] = hits > 0 ? 0 : 255 }
        }
      }
      rowExtremes[span] = row
    }
    for y in 0..<height {
      for x in 0..<width {
        var hit = false
        for dyIndex in 0..<size {
          let span = spans[dyIndex]
          guard span >= 0 else { continue }
          let sy = y + dyIndex - radius
          guard sy >= 0, sy < height else { continue }
          if rowExtremes[span][sy * width + x] == target { hit = true; break }
        }
        output[y * width + x] = hit ? target : (dilate ? 0 : 255)
      }
    }
    return output
  }

  static func conjunctivaMask(_ image: RGBAImage) -> [UInt8] {
    var mask = redMask(image)
    mask = morph(morph(mask, width: image.width, height: image.height, dilate: true), width: image.width, height: image.height, dilate: false)
    return morph(morph(mask, width: image.width, height: image.height, dilate: false), width: image.width, height: image.height, dilate: true)
  }

  /// Features in training order: chromaticity means and medians, erythema index stats,
  /// HSV saturation/value means, conjunctiva area fraction, sex.
  static func colourFeatures(_ image: RGBAImage, female: Bool) -> [Double]? {
    let mask = conjunctivaMask(image)
    var rs: [Double] = [], gs: [Double] = [], bs: [Double] = [], ei: [Double] = []
    var saturation = 0.0, value = 0.0
    for index in 0..<mask.count where mask[index] == 255 {
      let offset = index * 4
      let r = Double(image.pixels[offset]) + 1, g = Double(image.pixels[offset + 1]) + 1, b = Double(image.pixels[offset + 2]) + 1
      let sum = r + g + b
      rs.append(r / sum); gs.append(g / sum); bs.append(b / sum)
      ei.append(log(r) - log(g))
      let (_, s, v) = opencvHSV(r: image.pixels[offset], g: image.pixels[offset + 1], b: image.pixels[offset + 2])
      saturation += Double(s); value += Double(v)
    }
    let count = rs.count
    guard count >= 200 else { return nil }
    let mean = { (values: [Double]) in values.reduce(0, +) / Double(values.count) }
    // numpy.percentile(method="lower")
    let lower = { (values: [Double], percent: Double) -> Double in
      let sorted = values.sorted()
      return sorted[Int(floor(Double(sorted.count - 1) * percent / 100))]
    }
    let eiMean = mean(ei)
    let eiStd = (ei.reduce(0) { total, value in total + (value - eiMean) * (value - eiMean) } / Double(count)).squareRoot()
    return [
      mean(rs), mean(gs), mean(bs), lower(rs, 50), lower(gs, 50),
      eiMean, lower(ei, 50), lower(ei, 75), eiStd,
      saturation / Double(count), value / Double(count),
      Double(count) / Double(mask.count), female ? 1 : 0,
    ]
  }

  // MARK: - PIL Image.resize(BILINEAR) with its antialiasing triangle filter

  static func resizeBilinearAntialiased(_ image: RGBAImage, width: Int, height: Int) -> RGBAImage {
    let horizontal = resampleAxis(image.pixels, inWidth: image.width, inHeight: image.height, outLength: width, horizontal: true)
    let vertical = resampleAxis(horizontal, inWidth: width, inHeight: image.height, outLength: height, horizontal: false)
    return RGBAImage(width: width, height: height, pixels: vertical)
  }

  private static func resampleAxis(_ pixels: [UInt8], inWidth: Int, inHeight: Int, outLength: Int, horizontal: Bool) -> [UInt8] {
    let inLength = horizontal ? inWidth : inHeight
    let scale = Double(inLength) / Double(outLength)
    let filterScale = max(scale, 1)
    let support = 1.0 * filterScale
    let outWidth = horizontal ? outLength : inWidth
    let outHeight = horizontal ? inHeight : outLength
    var output = [UInt8](repeating: 0, count: outWidth * outHeight * 4)

    for outIndex in 0..<outLength {
      let center = (Double(outIndex) + 0.5) * scale
      let start = max(0, Int(center - support + 0.5))
      let end = min(inLength, Int(center + support + 0.5))
      var weights = [Double](repeating: 0, count: max(0, end - start))
      var total = 0.0
      for index in start..<end {
        let distance = abs((Double(index) - center + 0.5) / filterScale)
        let weight = max(0, 1 - distance)
        weights[index - start] = weight
        total += weight
      }
      if total > 0 { for index in 0..<weights.count { weights[index] /= total } }

      let lines = horizontal ? inHeight : inWidth
      for line in 0..<lines {
        var accumulated = [Double](repeating: 0, count: 4)
        for index in start..<end {
          let weight = weights[index - start]
          guard weight != 0 else { continue }
          let offset = horizontal ? (line * inWidth + index) * 4 : (index * inWidth + line) * 4
          for channel in 0..<4 { accumulated[channel] += Double(pixels[offset + channel]) * weight }
        }
        let target = horizontal ? (line * outWidth + outIndex) * 4 : (outIndex * outWidth + line) * 4
        for channel in 0..<4 { output[target + channel] = UInt8(max(0, min(255, accumulated[channel].rounded()))) }
      }
    }
    return output
  }


  // MARK: - Colour model (generated from ml/conjunctiva_colour/conjunctiva_ridge_v1.json)

  /// Ridge regression on conjunctiva colour, trained on Eyes-Defy-Anemia (217 adults, 95 from India,
  /// CC BY-SA 4.0). 5-fold cross-validation, India: r=0.63, MAE=1.32 g/dL.
  static let modelVersion = "conjunctiva-colour-ridge-v1"
  private static let featureMean: [Double] = [0.42046929947331174, 0.261609245563747, 0.31792145496294133, 0.4093792921803581, 0.265459277460007, 0.4749682689448676, 0.435548780935414, 0.5737713466737169, 0.18697841380395727, 94.52740119944488, 144.3390686756015, 0.3467870111792218, 0.39631336405529954]
  private static let featureScale: [Double] = [0.015082733572985141, 0.013204804030219218, 0.012040989541079971, 0.013651967893569187, 0.014633156760237593, 0.08012872104066246, 0.08337831322877347, 0.11321863023778342, 0.046506663462437335, 11.81629608048305, 16.37552944824575, 0.17391351295657528, 0.4891309451736537]
  private static let coefficients: [Double] = [0.8732175470741446, -0.8067124627615723, -0.20912132060929522, -0.8765145936870447, 0.002195046824494895, 0.5156053233171534, -0.32837002577166174, -0.6450462067871685, -0.08650535967744882, 0.3868673230045019, 0.20459701548430964, 1.0877658470738614, -0.6222760964000974]
  private static let intercept = 12.797096774193552
}
