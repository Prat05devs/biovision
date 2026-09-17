# ADR-003: Add consented, local face-video signal estimation

- Status: accepted
- Date: 2026-09-11
- Supersedes: ADR-002 for the optional vital-scan step

## Decision

BioVision adds an optional 30-second face-video scan after the reviewed face
photo. The live frames are processed on the device and are not written to the
assessment store, uploaded, or retained. The person explicitly starts this step
after seeing what will be processed.

The web implementation runs the bundled FacePhys models through
`vitalcamera-sdk` and also calculates a classical POS rPPG baseline. Stored scan
state contains derived values, model/version labels, signal quality, duration,
and the assertion `rawVideoRetained: false`.

Native builds expose the same protocol and result contract but abstain until a
reviewed LiteRT frame adapter is installed. They must not fabricate a camera
measurement.

## Result semantics

- `camera_model`: inferred directly by the local FacePhys signal pipeline.
- `derived`: calculated from another camera estimate; lower confidence.
- `demo_only`: reserved for explicit fixtures; the vital scan does not currently
  emit simulated metrics in either mock or production mode.
- `unavailable`: no suitable implementation or acceptable signal.

As of 13 September 2026, the result screen no longer emits simulated BP, SpO2,
glucose, hydration, BMI, biological-age, or disease-risk values. Those metrics
remain visibly unavailable with their required sensor/input. Respiratory rate is
the only additional derived vital and abstains unless a 24-second-or-longer BVP
window contains a dominant respiratory-band amplitude peak. The independent POS
heart-rate baseline is shown only when it agrees with FacePhys.

No result from this feature is a diagnosis or a substitute for a validated
medical device. Poor signal produces an abstention.

## Licensing and privacy

The application includes the upstream licence and notice under
`public/vitalcamera/`. Raw camera frames remain local. Derived physiological
metrics are held only in the in-memory assessment session. Any future server
transmission requires a separate, explicit, informed, and revocable consent
flow consistent with the SDK's Privacy Protection Addendum.
