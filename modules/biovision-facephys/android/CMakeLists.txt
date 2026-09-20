project(BioVisionFacePhys)
cmake_minimum_required(VERSION 3.9.0)

set(PACKAGE_NAME BioVisionFacePhys)
set(CMAKE_CXX_STANDARD 20)

# The Kotlin classes hold every implementation; this library exists only to carry the
# Nitro-generated JNI bridge for the two HybridObjects.
add_library(${PACKAGE_NAME} SHARED src/main/cpp/cpp-adapter.cpp)

include(${CMAKE_SOURCE_DIR}/../nitrogen/generated/android/BioVisionFacePhys+autolinking.cmake)

find_library(LOG_LIB log)
# HybridFacePhysFactorySpec.hpp includes <VisionCamera/HybridCameraOutputSpec.hpp>, which
# VisionCamera ships as a prefab package.
find_package(react-native-vision-camera REQUIRED CONFIG)

target_link_libraries(
  ${PACKAGE_NAME}
  ${LOG_LIB}
  android
  react-native-vision-camera::VisionCamera
)
