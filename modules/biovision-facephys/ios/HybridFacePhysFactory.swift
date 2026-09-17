import NitroModules
import VisionCamera

final class HybridFacePhysFactory: HybridFacePhysFactorySpec {
  func createFacePhysOutput(options: FacePhysOutputOptions) throws -> any HybridCameraOutputSpec {
    return HybridFacePhysOutput(options: options)
  }
}
