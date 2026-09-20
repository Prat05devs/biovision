# BioVision

React Native + Expo application for the BioVision AI Health Pre-Screening & Care Navigation MVP.

## Current main experience

The primary journey now uses a camera or gallery face photo, an optional 30-second local face-video scan,
automatic experimental appearance observations, bilateral lower-eyelid photos, a health questionnaire,
and an action plan with source-checked local care.
It no longer asks people to tick facial signs or answer anemia-specific questions in the main flow.
On web, FacePhys estimates heart rate and HRV and a classical POS pipeline provides a comparison baseline.
Raw video is processed locally and discarded. Web appearance observations use MediaPipe landmarks plus experimental relative-colour rules for under-eyes,
forehead, selected skin patches, eye-white redness and lip-to-skin contrast. These are not trained
medical classifiers. Native appearance inference currently abstains.

Deployment and region configuration lives in `configs/deployments/biovision.json`; care data is a
versioned snapshot under `configs/care`, with an interchangeable API provider. See
[implementation, evidence and readiness notes](docs/ENHANCEMENTS_2026_09.md) for extension instructions,
what works, and remaining device/model limitations. Run `npm run test:health` for the new flow checks.

The anemia API can run the pinned MIT EfficientNet research checkpoint described below.

## Run locally

```bash
cp .env.example .env.local
npm install
npm start
```

Use `npm run android`, `npm run ios`, or `npm run web` for a target platform. The default mock mode is deterministic and does not represent a medical result.

### Test the camera

The iOS Simulator has no camera input and cannot use the MacBook camera. To test
the complete camera permission, preview, and still-photo flow with the MacBook
camera, run:

```bash
npm run web
```

Open the local URL in Safari or Chrome and select **Allow** when the browser asks
for camera access. `localhost` is treated as a secure context by modern browsers.
Use a physical iPhone or Android phone to verify the native camera flow and final
capture quality.

The **Choose from gallery** route uses the iOS and Android system photo picker. It accepts one
JPEG, PNG, WebP, HEIC or HEIF image up to 15 MB with a minimum 320-pixel short edge, preserves
the original orientation and aspect ratio, and records gallery provenance separately from camera
capture. Android restores a pending picker result if the operating system recreates the activity.

## Run against the real API

The first backend slice is available in `backend/`. It provides runtime-validated
contracts and a versioned, branch-adaptive symptom questionnaire. It abstains by default;
the pinned research anemia model is enabled explicitly.
When fatigue or breathlessness is reported, its follow-up branch is completed before
the next symptom; a negative answer skips that branch. Current outputs are care guidance,
not disease predictions or probabilities.

```bash
python3 -m venv .venv
.venv/bin/pip install -e './backend[dev,models]'
export BIOVISION_ANEMIA_MODEL_VERSION='galihkjaya/anemia-palor-detection@5659a76e6d3d'
npm run backend:dev
```

Then set `EXPO_PUBLIC_USE_MOCKS=false` and point `EXPO_PUBLIC_API_BASE_URL` at port
8000. Use your computer's LAN address instead of `localhost` on a physical phone.

Run `npm run backend:test` and `npm run backend:check` for the backend verification
suite.

## Backend scope

The backend serves one client path: eye-photo anaemia screening for the **web** build
(`POST /v1/screenings/anemia`), plus `GET /v1/health`. iOS and Android run every
assessment on the device, so they call no endpoint at all.

Research capture retention, the questionnaire/wellbeing/observation engines and the
API-backed care directory were removed once the app moved on-device; recover them from
git history if governance approves a research programme.

## Automatic appearance observations

After confirming a camera or gallery face photo, `scan/observations` inspects it automatically on web. It never asks
the user to label visible signs. Appearance comparison, quality abstention, provider limitations and
unassessed features are explained before the general questionnaire. See the implementation notes
above. The older `configs/observations/face_signs.v1.json` self-report catalogue remains a legacy API
resource, not the current photo-analysis model or a source of automated findings.

## Mental wellbeing — stepped screen

`configs/wellbeing/wellbeing_screen.v1.json` administers PHQ-2 and GAD-2 to everyone and
steps up to the full PHQ-9 / GAD-7 only when the ultra-brief screen scores 3 or more, which
is how those instruments were validated. PHQ and GAD are public domain (released by Pfizer
in 2010 with no copyright restriction), and the config records that provenance per
instrument along with the published cut points and severity bands.

Safety behaviour:

- The **self-harm item (PHQ-9 item 9) stops the screen** and routes straight to support.
  The engine reports `urgentActionRequired` and level `urgent` on any endorsement.
- **Crisis contacts do not depend on a score.** The device reads them from
  `configs/wellbeing/support_resources.v1.json` before the first question, and a persistent
  "Need to talk to someone now?" link appears on every wellbeing screen.
- Verified helplines only. `configs/wellbeing/support_resources.v1.json` carries
  Tele-MANAS (14416) and KIRAN with operator, availability, verification date and source
  URL. A region with no verified entry returns an empty list and the app says so, because
  an unchecked number is worse than no number.
- The server rejects unknown, invalid, inapplicable and incomplete answer sets. An empty
  submission is a 422, not a "monitor" result.

Scores are shown paired with their published severity band, never as a bare number, and
the result screen states that a score is not a diagnosis.

Run `python3 scripts/check_i18n.py` to verify every `t('...')` key and every config
`labelKey` resolves in both `en` and `hi`.

## Safety and data defaults

- BioVision is a pre-screening and care-navigation tool, not a diagnostic app.
- Assessment state and captured image URIs are temporary Zustand state and are not persisted.
- Only the selected language is persisted.
- Setting `EXPO_PUBLIC_USE_MOCKS=false` selects API services and never silently falls back to mock results.
- Endpoint paths and runtime response validation live in the service layer.

## Face-mesh integration

The scan UI supports 478 normalized landmarks, z-depth styling, tessellation connections,
four-frame rolling smoothing, reduced-motion behavior, and searching/lock/tracking/complete
choreography. Alignment enables a user-triggered still photo followed by preview/retake.
Web then performs an explicitly started 30-second local signal scan. The FacePhys SDK,
models, worker files, licence and notice are shipped with the app; its LiteRT execution
stays in the browser. Native capture currently abstains from video estimates until the
LiteRT frame adapter is completed and never displays fabricated measurements.

The anemia capture flow requires two separately reviewed stills—left and right lower eyelid—
and sends them together. Each research record keeps anatomical-side provenance.

To connect native MediaPipe, implement `MediaPipeFrameProvider` in
`src/services/vision/mediaPipeFaceTracking.ts` with a VisionCamera frame processor or native
MediaPipe bridge, then select that service in `src/services/vision/faceTracking.ts`. Process
live frames ephemerally for alignment and signal processing; do not persist raw video.

## Animated icon system

The app uses `morphicons/react-native` with Lucide icon data through the shared
`AppIcon` component. Changing an icon name on the same component animates the
shape transition and respects the device's reduced-motion setting.

```tsx
<AppIcon name={selected ? 'checkCircle' : 'circle'} color={colors.primary} />
```

Add new icons to the typed registry in `src/components/ui/AppIcon.tsx` instead
of importing an icon library directly in a screen. Buttons and feature rows
accept those registry names through their typed `icon` props.
