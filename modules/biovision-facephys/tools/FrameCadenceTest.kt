package com.biovision.facephys

// Dependency-free JVM regression checks. Compile alongside FrameCadence.kt, then run
// com.biovision.facephys.FrameCadenceTestKt with the Kotlin standard library on the classpath.
fun main() {
  fun accepted(times: List<Double>): List<Double> {
    val cadence = FrameCadence()
    return times.filter { cadence.accept(it) }
  }

  val steady = List(900) { 1000.0 + it * 1000.0 / 30.0 }
  check(accepted(steady).size == 900) { "30 fps frames must all reach the model" }
  val jitter = steady.mapIndexed { index, time -> time + if (index % 2 == 0) 2.0 else -2.0 }
  check(accepted(jitter).size == 900) { "Normal camera jitter must not halve the sample rate" }
  var previous = 0.0
  val oldCount = jitter.count { time ->
    if (time - previous < 1000.0 / 30.0 - 1.0) false else { previous = time; true }
  }
  check(oldCount == 450) { "Fixture must reproduce the old filter's frame loss" }
  for (fps in listOf(15, 24, 30, 60, 120)) {
    val result = accepted(List(fps * 30) { 1000.0 + it * 1000.0 / fps })
    check(result.size == minOf(fps, 30) * 30) { "Unexpected throughput at $fps fps: ${result.size}" }
  }
  val resumed = accepted(listOf(1000.0, 1033.333, 5000.0, 5001.0, 5033.333))
  check(resumed == listOf(1000.0, 1033.333, 5000.0, 5033.333)) { "No catch-up burst after a pause" }
  check(accepted(listOf(Double.NaN, Double.POSITIVE_INFINITY, 1000.0, 1000.0, 999.0, 1033.333)).size == 2)
  println("PASS: jitter regression (old 450/900, new 900/900), 15–120 fps, pauses, invalid timestamps")
}
