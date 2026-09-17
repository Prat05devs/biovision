# ADR-002: Capture still images and no face video

- Status: superseded by ADR-003 for the optional vital-scan step
- Date: 2026-09-07

## Decision

The face step uses a live preview and ephemeral landmark processing to animate an
alignment mesh. After alignment passes, the user explicitly captures one still face
photo and can review or retake it. The eye flow captures still images separately.

BioVision does not record face/neck video and does not implement rPPG, rBCG, BPM,
HRV, respiration, RGB time-series extraction, or ROI sequence storage.

## Why

This matches the intended interaction, reduces biometric-data exposure and payload
size, and avoids presenting a pulse estimate that cannot be produced from a still
image. A live preview is not consent to record or retain a video.

## Consequences

- Face landmarks exist only long enough to drive alignment UI.
- The shutter requires an explicit user action.
- Face and eye photos have independent preview/retake steps.
- Face images remain temporary and session-local unless a separately reviewed
  operational purpose or explicit research consent is introduced.
- Reports and marketing copy must not claim camera-derived vitals.
