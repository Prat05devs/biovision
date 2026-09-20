#include <jni.h>
#include "BioVisionFacePhysOnLoad.hpp"

// Registers the Nitro HybridObjects with the JNI runtime when the library loads.
JNIEXPORT jint JNICALL JNI_OnLoad(JavaVM* vm, void*) {
  return margelo::nitro::biovision::facephys::initialize(vm);
}
