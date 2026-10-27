package com.biovision.facephys

// Dependency-free JVM regression checks. Compile alongside ExposureLock.kt, then run
// com.biovision.facephys.ExposureLockTestKt with the Kotlin standard library on the classpath.
fun main() {
  // Feeds 30 fps frames from `startMs` for `seconds`; returns every lock change and when it happened.
  fun ExposureLock.feed(startMs: Double, seconds: Double, face: Boolean, converged: Boolean): List<Pair<Double, Boolean>> {
    val changes = ArrayList<Pair<Double, Boolean>>()
    var t = startMs
    while (t < startMs + seconds * 1000) {
      update(t, face, converged)?.let { changes.add(t to it) }
      t += 1000.0 / 30.0
    }
    return changes
  }

  // Converged quickly: no lock until the face has been in view for 1.5 s, then exactly one lock.
  ExposureLock().apply {
    val changes = feed(0.0, 3.0, face = true, converged = true)
    check(changes.size == 1 && changes[0].second) { "one lock expected, got $changes" }
    check(changes[0].first in 1500.0..1600.0) { "lock must wait for the face to settle, came at ${changes[0].first}" }
  }

  // A camera that never reports convergence still locks, at the 4 s timeout.
  ExposureLock().apply {
    val changes = feed(0.0, 5.0, face = true, converged = false)
    check(changes.size == 1 && changes[0].first in 4000.0..4100.0) { "timeout lock expected near 4 s, got $changes" }
  }

  // No face, no lock, however long the camera runs.
  ExposureLock().apply {
    check(feed(0.0, 10.0, face = false, converged = true).isEmpty()) { "must not lock without a face" }
  }

  // A detector miss shorter than 1.5 s keeps the lock; a real absence releases it once, and the
  // next face has to settle again before it locks.
  ExposureLock().apply {
    feed(0.0, 2.0, face = true, converged = true)
    check(locked) { "should be locked after 2 s with a face" }
    check(feed(2000.0, 1.0, face = false, converged = true).isEmpty()) { "a 1 s dropout must not release the lock" }
    check(feed(3000.0, 1.0, face = true, converged = true).isEmpty()) { "the face returning must not relock or unlock" }
    val gone = feed(4000.0, 2.0, face = false, converged = true)
    check(gone.size == 1 && !gone[0].second && gone[0].first in 5450.0..5600.0) { "release expected 1.5 s after the face left, got $gone" }
    val back = feed(6000.0, 2.0, face = true, converged = true)
    check(back.size == 1 && back[0].second && back[0].first >= 7500.0) { "relock must wait for the face to settle again, got $back" }
  }

  println("ExposureLock: settle wait, convergence timeout, no-face, dropout tolerance, release and relock passed.")
}
