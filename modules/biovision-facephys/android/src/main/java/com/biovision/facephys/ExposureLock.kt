package com.biovision.facephys

/**
 * Decides when to hold auto-exposure and white balance during a vitals scan.
 *
 * The pulse is a fraction of one 8-bit brightness level; a single auto-exposure step is far larger
 * and reads to the model as a burst of noise. Android front cameras keep re-metering on the face,
 * so the camera is left to settle once a face appears and is then held. Locking when the session
 * opens instead freezes whatever the camera held before it found the face (that tinted the preview
 * green), so the lock waits for the face, and is released when the face leaves so the camera can
 * adapt to whoever or whatever comes back.
 */
internal class ExposureLock {
  private companion object {
    /** Minimum time with a face in view before locking, so metering has adapted to the face. */
    const val SETTLE_MS = 1500.0
    /** Lock anyway after this long: some devices never report CONVERGED. */
    const val CONVERGE_TIMEOUT_MS = 4000.0
    /** A face missing this long counts as gone; shorter dropouts are detector misses. */
    const val FACE_LOST_MS = 1500.0
  }

  var locked = false
    private set
  private var faceSinceMs: Double? = null
  private var faceLastSeenMs: Double? = null

  /** Returns the new lock state when it should change, or null to leave it as it is. */
  fun update(nowMs: Double, faceVisible: Boolean, converged: Boolean): Boolean? {
    if (faceVisible) {
      if (faceSinceMs == null) faceSinceMs = nowMs
      faceLastSeenMs = nowMs
    } else {
      val lastSeen = faceLastSeenMs
      if (lastSeen == null || nowMs - lastSeen >= FACE_LOST_MS) faceSinceMs = null
    }

    val since = faceSinceMs
    if (locked) {
      if (since != null) return null
      locked = false
      return false
    }
    if (since == null || !faceVisible) return null
    val visibleMs = nowMs - since
    if (visibleMs < CONVERGE_TIMEOUT_MS && (visibleMs < SETTLE_MS || !converged)) return null
    locked = true
    return true
  }
}
