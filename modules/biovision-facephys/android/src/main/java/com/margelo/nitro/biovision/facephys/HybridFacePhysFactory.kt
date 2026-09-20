package com.margelo.nitro.biovision.facephys

import com.biovision.facephys.FacePhysException
import com.biovision.facephys.HybridFacePhysOutput
import com.margelo.nitro.NitroModules
import com.margelo.nitro.biovision.facephys.FacePhysOutputOptions
import com.margelo.nitro.biovision.facephys.HybridFacePhysFactorySpec
import com.margelo.nitro.camera.HybridCameraOutputSpec

class HybridFacePhysFactory : HybridFacePhysFactorySpec() {
  override fun createFacePhysOutput(options: FacePhysOutputOptions): HybridCameraOutputSpec {
    // Unlike iOS, the models load from Android assets, which needs a Context.
    val context = NitroModules.applicationContext
      ?: throw FacePhysException("FacePhys needs an application context, but Nitro has not been initialized.")
    return HybridFacePhysOutput(context.applicationContext, options)
  }
}
