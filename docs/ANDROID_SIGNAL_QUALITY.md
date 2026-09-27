# Android face-scan signal investigation

## Scope and current model paths

The reported symptom is low or declining signal quality on an Android phone and tablet,
including in daylight, despite a working face mesh. No physical device was connected during
this investigation. The patch fixes reproducible input-pipeline defects; it does not establish
that the reported devices now produce usable physiological estimates.

- Native live capture: VisionCamera → CameraX RGBA ImageAnalysis → BlazeFace face box.
- Mesh: local MediaPipe face-landmark TFLite model → normalized landmarks → existing overlay.
- Vitals: 36×36 RGB face crop → recurrent FacePhys TFLite model → BVP samples → SQI and
  PSD TFLite models. The last two consume 450 samples. Android implements a native port of
  vitalcamera-sdk 0.6.9; changing the browser SDK alone does not repair Android.
- Shared JS accumulation: 30-second scan; initial eight-second warm-up; median of the last
  twelve SQI readings determines final acceptance at 0.38. A visible face does not bypass SQI.
- Native eye screening: separate bilateral still-image conjunctiva colour/ridge path.
- Appearance: still-image landmarks and relative-colour rules. Assessment questions and care
  routing are separate local rules. None of these paths needs changing for this patch.

Repository README sections describing native vitals as unimplemented are stale; the native
source code above is the implementation used for this investigation.

## Confirmed defects and patch

### Frame rejection around 30 fps

The old filter rejected frames less than 32.33 ms after the previously accepted frame.
For nominal 30 fps timestamps alternating +2/-2 ms around schedule, it discards every second
frame: 450 of 900 frames survive a 30-second input. This is a deterministic regression fixture,
not a measurement of the user's devices.

`FrameCadence` retains a sampling deadline across jitter, tolerates five milliseconds around
that deadline, and avoids catch-up bursts after a pause. It preserves all frames in this
fixture while limiting 60/120 fps inputs to 30 fps. Invalid/non-increasing timestamps are rejected.

This matters because 450 samples take 15 seconds at 30 fps and 30 seconds at 15 fps. The
signal model's input window and slowly adapting frame interval therefore differ materially
when the filter drops frames. The mesh can still look functional at the lower rate.

### Resolution request before rotation

The old resolution request was 480×640. CameraX ResolutionStrategy uses sensor-coordinate
sizes, rather than the portrait dimensions of the rotated analysis buffer. Request 640×480,
which becomes 480×640 on typical portrait phone sensors, retaining the existing rotation,
fallback strategy, downscaling and landmark mapping. Actual selected sizes remain device-
dependent and must be checked in the diagnostics.

### Diagnostics

Each three-second native summary now includes source/working dimensions, analyzer-delivered
frame rate, processed frame rate, generated BVP sample rate, explicit cadence skips, mean/max
analysis time, model dt, crop green level and the latest SQI. SQI is retained separately for
logging so the JS event's reset does not hide it. No image/video capture or upload was added.

`received` counts frames delivered to the analyzer, not all sensor exposures: CameraX can
drop frames upstream. `processing` excludes CameraX conversion/rotation and initial model
loading, so a sub-33 ms figure alone does not prove a sustainable 30 fps pipeline.

## Device verification and next decisions

Build/install a new native Android binary; a Metro/JS reload cannot apply Kotlin changes.
Capture the existing log tag while repeating the same 30-second scan:

```sh
adb logcat -s BioVisionFacePhys:I '*:S'
```

1. Compare old/new builds on the affected phone and tablet, with matched framing and lighting.
   Look for near-30 processed frames and BVP samples per second after startup, dt near 33 ms,
   and very few cadence skips on a 30 fps input. Confirm final SQI and accepted-result rate
   across multiple scans, not just an isolated high score.
2. Verify mesh alignment, preview tint, still capture, retry, background/resume, eye scan and
   question routing. No corresponding UI/flow/threshold code was edited.
3. If `received` is low despite few skips, profile CameraX conversion/rotation and individual
   model stages. All inference currently shares one executor; mesh, face detection, rPPG,
   SQI and PSD compete for the frame budget. CameraX documents conversion overhead and
   roughly 10–15 ms rotation overhead at 640×480 on a mid-range device. Moving expensive
   work requires profiling and separate mesh-alignment regression coverage.
4. If throughput is good but SQI remains poor, measure crop stability and camera exposure/
   white-balance changes. Test imaging changes one at a time; do not lock white balance
   immediately at startup (the source records an earlier green-preview problem).
5. Camera options currently assume 30–30 fps and 50 Hz antibanding, and capability lookup
   selects the first front camera rather than explicitly using VisionCamera's chosen ID.
   Verify actual selected-camera capabilities/capture results before altering these settings.
6. The engine/output can persist across screens and gaps. Missing faces do not clear the BVP
   ring/recurrent state, and model dt is slowly smoothed. Investigate this separately if failures
   correlate with retries, backgrounding or tracking loss. Changing reset semantics requires
   dedicated lifecycle tests; it is not included in this patch.

Do not lower SQI thresholds, force the meter upward, pad dropped frames with fabricated
samples, or extend the scan as a substitute for fixing capture. Signal quality is an estimate
of the physiological waveform's usability; it is not a face-positioning progress bar.

## Verification

- `tools/FrameCadenceTest.kt`: executable Kotlin checks for steady and jittered 30 fps, 15/24/
  60/120 fps, pauses, duplicates, out-of-order and non-finite timestamps; passes against the
  actual production `FrameCadence` class. The old-filter fixture confirms 450/900 accepted
  versus 900/900 after the patch.
- `node scripts/test-vitals.cjs`: passed.
- `node scripts/test-facephys-hrv.cjs`: passed (400 SDK comparison windows).
- `npm run typecheck`: passed.
- `cd android && ./gradlew :biovision-facephys:compileDebugKotlin --offline --console=plain`:
  passed; existing Camera2Interop/Gradle deprecation warnings remain.
- `git diff --check`: passed.
- Physical-device signal improvement remains unverified.

## Primary references

- [CameraX resolution-coordinate guidance from the CameraX team](https://groups.google.com/a/android.com/g/camerax-developers/c/8Yzm-5V_GkA/m/5wvpL771CwAJ)
- [CameraX analysis conversion and rotation costs](https://developer.android.com/reference/androidx/camera/core/ImageAnalysis.Builder?authuser=19)
- [CameraX analysis and backpressure](https://developer.android.com/media/camera/camerax/analyze)
- [Upstream vitalcamera-sdk](https://github.com/KegangWangCCNU/vitalcamera-sdk)
