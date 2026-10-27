# iOS launch crash comparison

The three supplied reports are repeated occurrences of one crash in BioVision
1.0.0 (build 6), on the same `iPhone18,2` running iOS 27.0.1 (24A446).

| Incident prefix | Time after process launch | Exception | Faulting thread |
| --- | ---: | --- | --- |
| D6CD28C1 | 207.1 ms | EXC_BREAKPOINT / SIGTRAP | Main |
| 1CF3B65E | 75.5 ms | EXC_BREAKPOINT / SIGTRAP | Main |
| 8F8A6653 | 73.7 ms | EXC_BREAKPOINT / SIGTRAP | Main |

All three have the same executable UUID and the same symbolized main-thread
stack, beginning with
`___UIApplicationEvaluateRuntimeIssueForNoSceneLifecycleAdoption_block_invoke`.
UIKit traps while creating the initial scene. These reports identify missing
scene-lifecycle adoption as the launch failure; they provide no evidence of a
camera, inference, or JavaScript crash.

Apple requires the scene lifecycle for apps built with the iOS 27 SDK:
[UIKit migration guide](https://developer.apple.com/documentation/uikit/transitioning-to-the-uikit-scene-based-life-cycle).
Expo documents the SDK 57 backport and opt-in:
[Expo scene lifecycle guide](https://github.com/expo/fyi/blob/main/ios-scene-lifecycle.md).

The fix uses Expo's SDK 57 scene runtime (minimum Expo 57.0.23), with the
installed version recorded in the npm and CocoaPods lockfiles. `AppDelegate`
provides its React Native factory to `EXExpoAppSceneDelegate`, which creates
the scene's window and starts React Native. The native scene manifest selects
that delegate. `expo-build-properties` enables the same migration during
future prebuilds. Expo forwards scene links and lifecycle events to the existing
app delegate overrides and subscribers.

Run `npm run ios:launch-check` before archiving. It checks the scene manifest,
factory ownership, prebuild opt-in, native runtime version, and existing asset
requirements. Use `npm run ios:launch-check -- --bundle /path/to/BioVision.app`
to check the built app's manifest and model assets as well.

This is a native change: ship a new binary with a build number above 6. The
project is already configured for build 7. Before release, verify a cold launch,
cold and warm `biovision://` links, background/foreground transitions, splash
dismissal, and camera access on a physical iPhone running iOS 27.

Validation completed during the fix: TypeScript, lint, plist validation, Expo
configuration introspection, production iOS JavaScript export, and all 20 source
launch gates passed. CocoaPods resolves Expo 57.0.29 and the matching core patches.
The native plist now uses Xcode's build number instead of its stale hardcoded 5.

The Release simulator build succeeded with Xcode 27.0, and all 28 checks against
the built app passed. The first attempt exhausted local disk space during final
bundling/dSYM generation; the successful retry used `DEBUG_INFORMATION_FORMAT=dwarf`
only as a command-line simulator build override. No release project setting was changed.
Normal launch rendered the welcome screen on the iOS 27 simulator, and a cold
`biovision://settings` link rendered Settings with version 1.0.0 (7).
A subsequent warm `biovision://settings/language` link rendered the language
screen, and the process remained running. Physical-device camera validation and
an App Store archive/upload remain outside this simulator verification.
