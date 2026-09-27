package com.biovision.facephys

import com.facebook.react.BaseReactPackage
import com.facebook.react.bridge.NativeModule
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.module.model.ReactModuleInfoProvider
import com.margelo.nitro.biovision.facephys.BioVisionFacePhysOnLoad

/**
 * Loads the Nitro C++ library that registers the FacePhysFactory and EyeScreener hybrids.
 * Registered in MainApplication because this module is local to the repo, so React Native's
 * autolinking (which only scans published packages) never sees it.
 */
class BioVisionFacePhysPackage : BaseReactPackage() {
  override fun getModule(name: String, reactContext: ReactApplicationContext): NativeModule? = null

  override fun getReactModuleInfoProvider(): ReactModuleInfoProvider = ReactModuleInfoProvider { HashMap() }

  companion object {
    init {
      BioVisionFacePhysOnLoad.initializeNative()
    }
  }
}
