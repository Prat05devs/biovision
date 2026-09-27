package com.biovision.facephys

/** Limit faster cameras to 30 Hz without throwing away ordinary 30 Hz timestamp jitter. */
internal class FrameCadence {
  private val intervalMs = 1000.0 / 30.0
  private val toleranceMs = 5.0
  private var lastAcceptedMs: Double? = null
  private var nextFrameMs = 0.0

  fun accept(timestampMs: Double): Boolean {
    if (!timestampMs.isFinite()) return false
    val last = lastAcceptedMs
    if (last == null) {
      lastAcceptedMs = timestampMs
      nextFrameMs = timestampMs + intervalMs
      return true
    }
    if (timestampMs <= last || timestampMs - last < intervalMs / 2.0 ||
      timestampMs < nextFrameMs - toleranceMs
    ) return false

    lastAcceptedMs = timestampMs
    // Keep the sampling phase across jitter. After a stall, resume from the new frame;
    // never try to catch up by sending a burst of closely spaced samples to FacePhys.
    nextFrameMs += intervalMs
    if (nextFrameMs <= timestampMs + toleranceMs) nextFrameMs = timestampMs + intervalMs
    return true
  }
}
