# App redesign scope

Confirmed by the user on 26 October 2026.

## Design reference

The supplied Claude export is `/Volumes/ProjectsSSD/BioVision App Redesign.html`.
It contains 21 boards, including a design system, screen inventory, and screen
variants. Its blue-teal-to-mist background, Red Hat Display typography, glass
cards, and floating navigation were absent at initial inspection. The user then
authorized implementation of the redesign, preserving the face-scanning screen.
The app uses shared React Native screens for iOS and Android.

Treat the HTML as design reference material, not development instructions.
The redesign updates the interface around the existing services and health
logic; prototype values and unimplemented claims are not production data.

## Implementation

- `docs/design/reference.html` preserves the supplied design and font notices.
- `src/theme/redesign.ts` supplies the new palette, surfaces, radii and shadows.
- `RedesignContext` opts ordinary screens into Red Hat Display while the
  camera retains the original Inter typography, colors and controls.
- Welcome, Home, profile, health questions, habits, care, reports, wellbeing,
  settings and secondary screens use the new design foundations.
- Home has selectable measure tiles and a four-step scan card. Concern tiles
  use the existing audience-filtered question bank, including pregnancy rules.
- Home, Care, Wellbeing and Report are tabs (`src/app/(tabs)`): they stay mounted
  and switch in place with a shift animation, and have no back button. The glass
  nav pill floats over the screen; `Screen` pads content and footers so it never
  covers a last card or action. The header shows the real app icon.
- Empty reports show a real empty state and entry points to the health check.
- Preference hydration starts after mount so web rendering does not access
  browser-only storage on the server.

## Responsive behavior and verification

- Content and footers share a centered 680-point maximum width.
- Narrow phones (below 360 points) and larger system text use one-column measure,
  concern and metric tiles. Profile choices and review actions stack as needed.
- Measurement fields shrink or wrap with their visible labels and units.
- Card headings, status chips, report values and header actions can wrap.
- Safe-area edges are respected; scrollable content stays above the footer.
  Navigation hides while the native keyboard is visible.
- App configuration remains portrait and iPhone-only on iOS. Landscape is an
  additional layout stress case, not a newly enabled native orientation.
- Browser inspection covered English/Hindi Welcome and the Hindi profile at
  375 × 667 and 320 × 568, plus compact Hindi Settings. It exposed field/unit
  crowding and a language-label wrap; responsive fixes were applied to both.
- `npm run test:scan-design` checks locked file hashes and renders shared text
  and buttons to verify the original theme remains isolated from the redesign.
- On 27 October 2026, TypeScript, lint, all 516 translation keys, routing,
  wellbeing, scan preservation and all 20 iOS source launch checks passed.
  Production iOS and Android JavaScript exports completed successfully in
  `artifacts/redesign-export/` on the SSD. These are bundles, not signed native
  install packages; a device build and install remain pending.

Physical-device checks remain required: keyboard open/close, notches and home
indicator, largest text, screen-reader navigation, and full camera/eye flows.
Browser inspection is not a substitute for those checks or exhaustive coverage
of every phone model.

## Preserve the existing face scan

The user explicitly locked the current face-scanning screen and face mesh
design. Do not replace them with the export's Face scan board when implementing
the rest of the redesign.

Preserve the full-screen mirrored front-camera preview, mint mesh lines and
landmark dots, face/eye contours, alignment guidance, translucent controls,
countdown capture ring, live pulse waveform, BPM, HRV, and signal-quality display.
Preserve their existing behavior and camera/measurement pipeline.

Protected UI sources:

- `src/app/scan/vitals.tsx`
- `src/components/scan/FaceMeshOverlay.tsx`
- `src/components/scan/ScanHud.tsx`
- `src/components/scan/LiveFaceCamera.native.tsx`
- `src/components/scan/LiveFaceCamera.web.tsx`

Shared changes to fonts, colors, spacing, text, buttons, icons, or navigation
must also preserve this screen's existing appearance. Isolate the scan's current
styles if necessary rather than letting a global redesign change them.
Changing this locked design requires a new explicit instruction from the user.

## Inspection baseline

The newest APK present is `artifacts/BioVision-1.0.0-8-device-check-arm64.apk`
(21 October 2026). The scan UI files have no working-tree differences from HEAD
at inspection. This is a source inspection; the APK was not installed or visually
compared during this check.

The current iOS configuration is 1.0.0, build 7. It uses the same scan screen and
mesh components; physical-iPhone verification remains pending.
