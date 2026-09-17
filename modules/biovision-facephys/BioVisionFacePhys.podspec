require "json"

package = JSON.parse(File.read(File.join(__dir__, "package.json")))

Pod::Spec.new do |s|
  s.name         = "BioVisionFacePhys"
  s.version      = package["version"]
  s.summary      = package["description"]
  s.homepage     = "https://github.com/KegangWangCCNU/FacePhys-Demo"
  s.license      = package["license"]
  s.authors      = "BioVision"
  s.platforms    = { :ios => "16.0" }
  s.source       = { :git => "", :tag => "#{s.version}" }

  s.source_files = ["ios/**/*.{swift}", "ios/**/*.{m,mm}"]
  s.resource_bundles = { "BioVisionFacePhysModels" => ["assets/*"] }
  s.frameworks = ["AVFoundation", "Accelerate", "CoreImage"]
  # Real-time frame processing: keep this pod optimized even in Debug app builds.
  s.pod_target_xcconfig = { "SWIFT_OPTIMIZATION_LEVEL" => "-O", "GCC_OPTIMIZATION_LEVEL" => "3" }

  load "nitrogen/generated/ios/BioVisionFacePhys+autolinking.rb"
  add_nitrogen_files(s)

  s.dependency "React-jsi"
  s.dependency "React-callinvoker"
  s.dependency "VisionCamera"
  s.dependency "TensorFlowLiteC", "2.17.0"
  install_modules_dependencies(s)
end
