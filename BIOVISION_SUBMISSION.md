# BioVision — App Store, TestFlight and Google Play submission pack

Prepared: **29 October 2026 (India)**. Language of the copy below: English.

This is the consolidated submission reference for the current native app. Copy only the relevant field's text into each console. Internal instructions, evidence tables and placeholders are not public listing copy. Replace every `[REQUIRED: ...]` before submission.

**Current recommendation: Medical as the primary store category; Health & Fitness as Apple's optional secondary category.** This reflects the existing symptom questions, haemoglobin estimation and care guidance. Category choice does not guarantee acceptance or establish medical-device regulatory status.

**Previous rejection:** the owner reports that BioVision crashed during the store's test. The exact rejection notice was not supplied. Repository crash notes describe an iOS build 6 scene-lifecycle launch crash; that is relevant historical evidence, but it cannot be assumed to be the same incident without the rejection's build number and crash log.

## 1. Submission status and immediate priorities

| Item | Finding on 29 October 2026 | Action before submission |
| --- | --- | --- |
| Live homepage | `https://biovision.live/` redirects to `https://www.biovision.live/`, which returned HTTP 200. Published HTML and JavaScript were read. | Keep the public homepage working. |
| Privacy URL | Direct request to `https://biovision.live/privacy` redirected to `https://www.biovision.live/privacy` and returned **404**. | Fix hosting before submitting. |
| Terms URL | Direct request to `https://www.biovision.live/terms` returned **404**. | Fix hosting before submitting. |
| Support URL | Direct request to `https://www.biovision.live/support` returned **404**. | Fix hosting before submitting. |
| Website routing | The deployed JavaScript contains privacy, terms and support content. `landing/vercel.json` already contains an SPA rewrite. | Check the actual Vercel project root/build settings and deployed rewrite. Verify each URL by opening it directly in a fresh browser, then refreshing it. HTTP 200 must show the correct page, not just the homepage. |
| Source launch check | `npm run ios:launch-check` passed **20/20** checks during this preparation. | Run again after final changes and against the archived `.app`. This does not prove that the uploaded build will run correctly. |
| Store-installed runtime testing | No new TestFlight/Play installation or physical-device test was performed for this document. | Complete section 11 on the exact uploaded artifacts. |
| Health-claim evidence | Current medical-information text explicitly says camera pulse estimates have not yet been compared with a medical device on BioVision scans. Eyelid-model evaluation used controlled-light, macro-lens images. | Supply methods and honest limits; product-level validation remains an unresolved submission risk. |
| Developer identity | Website names NavTaksh Wellness; project has an Apple Team ID. Verified seller identity and organization enrollment were not inspected. | Confirm the legal entity and account status in both consoles. |

Public privacy disclosures and compatible-device information are required by [Google's health policy](https://support.google.com/googleplay/android-developer/answer/16679511?hl=en). Apple requires complete, functional submission material and scrutinizes health accuracy claims under sections 2.1 and 1.4.1 of its [App Review Guidelines](https://developer.apple.com/app-store/review/guidelines/).

## 2. App identity and distribution details

| Field | Value / status |
| --- | --- |
| Product / home-screen name | **BioVision** |
| Proposed App Store name | **BioVision.live**; existing repository notes say “BioVision” alone was unavailable. Confirm the existing record and current name availability. |
| Proposed Google Play name | **BioVision.live: Health Check** |
| iOS bundle identifier | **`live.biovision.app`** |
| Android application ID / package name | **`live.biovision.app`** |
| Expo slug | `biovision` |
| URL scheme | `biovision://` |
| Public version / Android versionName | **`1.0.0`** |
| iOS source build number | **`8`** in `app.json` and Xcode's `CURRENT_PROJECT_VERSION` |
| Android source versionCode | **`9`** in `app.json` and `android/app/build.gradle` |
| Apple development Team ID in source | `9Q56J23Z23`; verify that it belongs to the legal entity submitting the app |
| iOS project / scheme | `ios/BioVision.xcworkspace` / `BioVision` |
| Suggested SKU, only for a new app record | `biovision-ios-1`; an existing App Store Connect record's SKU must be reused |
| App Store numeric Apple ID | `[REQUIRED: copy from App Store Connect → App Information]`; not found in the inspected source |
| Existing public TestFlight invitation | `https://testflight.apple.com/join/46brVNQj`; found on the website, active enrollment was not verified |
| iOS minimum deployment target | **iOS 16.4** in the Xcode project; verify the final archive |
| iOS form factor | iPhone; `supportsTablet: false` |
| Android SDK evidence | Existing merged Release manifest: minimum API **24** / Android **7.0**, target API **36** / Android **16**; verify the newly generated AAB |
| App languages | English and Hindi |
| Orientation | Portrait |
| Initial market recommendation | India; bundled care directory is Dehradun, not nationwide coverage |
| Proposed price | Free; confirm in both consoles |
| Login / purchases | Current app has no account, login or purchase requirement |
| Ads / tracking | Current intended native behavior: no ads, analytics or tracking; validate the final binary and SDKs |
| Provider named on website | NavTaksh Wellness; registered seller/legal name must be confirmed |
| Proposed copyright | `2026 NavTaksh Wellness`, only if this is the actual rights holder |
| Support / feedback email | `admin@wtsolutions.cc` |
| Marketing URL | `https://biovision.live/` |
| Privacy Policy URL | `https://biovision.live/privacy` — currently blocked by the 404 above |
| Support URL | `https://biovision.live/support` — currently blocked by the 404 above |
| Terms URL | `https://biovision.live/terms` — currently blocked by the 404 above |
| Public App Store / Play links | Not verified; do not advertise a production listing as live until it exists |

Identifiers are verified from `app.json`, `ios/BioVision.xcodeproj/project.pbxproj`, `ios/BioVision/Info.plist` and `android/app/build.gradle`. Local numbers are **not** evidence of what has already been uploaded. Choose an unused iOS build number and a higher Android versionCode after checking upload history, and keep native/Expo settings synchronized. Keep the existing bundle/package IDs when updating the same app.

## 3. Best category, based on official definitions

| Store / field | Recommendation for the current app | Reason |
| --- | --- | --- |
| Apple primary category | **Medical** | Symptom reference, personal health information, screening estimates and guidance on seeking care are central to the experience. |
| Apple secondary category | **Health & Fitness** | Lifestyle questions, BMI, wellbeing and stress-related features provide a secondary fit. |
| Google Play application type | **App** | This is a health application. |
| Google Play category | **Medical** | The current product includes symptom checking, haemoglobin interpretation and care navigation. |
| Play tags | Choose up to five relevant tags **from the actual console list**. Prefer medical/health/wellbeing tags where offered and visibly supported. | Tag availability varies; do not invent tags or select unrelated ones just to fill five slots. |

This is an editorial recommendation from the actual feature set. Apple's [category definitions](https://developer.apple.com/app-store/categories/) associate Medical with patient health reference and symptom information, while Health & Fitness covers healthy living and stress management. Google's [health-app explanations](https://support.google.com/googleplay/android-developer/answer/13996367?hl=en) include symptom checkers within medical apps. Google's [category and tag guide](https://support.google.com/googleplay/android-developer/answer/9859673?hl=en) asks developers to choose relevant categories and tags.

**Health & Fitness could become the primary category if the released product's main purpose changes to general wellness.** That would require reviewing the actual features, results, website and declarations together. Selecting that category while retaining the same medical functionality does not remove health-policy obligations.

The older files `docs/app-store/metadata.md` and `docs/play-store/listing.md` recommended Health & Fitness first. This pack recommends Medical for the current scope; use this decision consistently when preparing this submission.

### Account type and regulatory status

Google explicitly requires an **organization account** for health apps such as medical apps; see [Choose a developer account type](https://support.google.com/googleplay/android-developer/answer/13634885?hl=en). Do not treat a personal account's closed-test completion as a substitute for organization eligibility. Apple section 5.1.1(ix) says healthcare/sensitive-information services should be submitted by the providing legal entity; see its [guidelines](https://developer.apple.com/app-store/review/guidelines/).

**Medical store category and regulated medical-device status are separate decisions.** The source contains a non-medical-device disclaimer, but that wording does not establish legal classification or exemption. Verify the intended use and applicable regulatory status before making console declarations. If regulated, use the required declarations and documentation; if it cannot be supported, resolve the affected functionality before release. [Google health declaration guidance](https://support.google.com/googleplay/android-developer/answer/14738291?hl=en).

## 4. Product description, headline and marketing copy

### Professional overview

BioVision is a mobile health pre-screening and care-navigation app designed to help adults organize health concerns and prepare for a conversation with a healthcare professional. It combines optional camera-based estimates, adaptive health questions, lifestyle information and mental wellbeing questionnaires into a plain-language report. Users can also complete the health questions without using the camera. The native app processes assessments on the device, supports English and Hindi, offers report sharing, and includes a directory of doctors and hospitals in Dehradun. Its estimates have limitations and do not replace a clinical assessment or laboratory testing.

### Main headline

```text
Your health check, in your pocket.
```

### Supporting headline

```text
Understand your health concerns and prepare for your next care conversation.
```

### Short pitch

```text
Private health questions, optional camera estimates and a clear report to discuss with your doctor.
```

These are website/press copy options. Store subtitles and short descriptions have separate limits below. Avoid “clinically proven,” “medical-grade,” “accurate diagnosis,” “instant blood test,” “AI doctor,” and promises to rule out illness. Do not imply WHO, NHS, NICE, Apple or Google endorses BioVision because a method uses their references or technology.

## 5. Apple App Store copy

The limits below follow Apple's [app information](https://developer.apple.com/help/app-store-connect/reference/app-information/app-information) and [platform version information](https://developer.apple.com/help/app-store-connect/reference/app-information/platform-version-information/) references. Paste plain text, excluding code fences.

### App name — maximum 30 characters

```text
BioVision.live
```

### Subtitle — maximum 30 characters

```text
Health insights and next steps
```

### Promotional text — maximum 170 characters

```text
Answer health questions, explore optional camera-based estimates and share a clear report with your doctor. Private, on-device, in English and Hindi.
```

### Keywords — maximum 100 bytes

```text
symptoms,doctor,wellbeing,heart,hrv,stress,haemoglobin,anemia,face,scan,Hindi,Dehradun,care
```

### Description — maximum 4,000 characters

```text
BioVision helps you organize health concerns and prepare for a conversation with a healthcare professional. Answer health questions, use optional camera-based estimates and receive a clear report with suggested next steps.

HEALTH QUESTIONS THAT ADAPT TO YOU
Share your symptoms, how long they have been present and how they affect daily life. Questions adapt to your profile and answers. You can complete this check without using the camera.

OPTIONAL CAMERA CHECK
A guided 30-second face scan estimates heart rate and heart-rate variability when the signal is usable. Breathing estimates and derived stress and recovery indicators may also be available. A face photo supports experimental observations of visible colour and brightness patterns. These observations are not a diagnosis of a skin or eye condition.

LOWER-EYELID PHOTOS
Guided photos of both lower eyelids support an experimental haemoglobin estimate from tissue colour. This cannot confirm or rule out anaemia and does not replace a blood test.

LIFESTYLE AND WELLBEING
Review lifestyle information, including sleep, activity and BMI. A separate mental wellbeing check uses PHQ and GAD screening questions. Screening scores do not diagnose a mental health condition.

A REPORT FOR YOUR NEXT STEP
Read plain-language explanations, suggested types of healthcare professional to consult and topics or tests to discuss with them. Share a PDF or text summary when you choose. Concerning answers can prompt advice to seek urgent help; the app cannot assess every emergency.

FIND CARE IN DEHRADUN
Browse doctors and hospitals by specialty, with available contact details and directions. Directory information comes from public sources and may change. Confirm details with the provider. Coverage is currently focused on Dehradun.

PRIVATE, WITH NO ACCOUNT
Native assessments run on your device. Scan images and health answers are not uploaded for analysis. No account, advertising or tracking is required. Photos use temporary app storage. Your language choice and acceptance of the terms are saved locally. Sharing a report is your choice; external services you open have their own privacy practices.

KNOW THE LIMITS
Camera estimates depend on lighting, movement, skin tone, camera quality and capture technique. The eyelid model was evaluated on a public dataset of 217 adults photographed under controlled lighting with a macro lens; those results do not establish accuracy for everyday front-camera scans. Pulse, HRV and breathing estimates have not yet been validated against medical equipment on BioVision scans. Some results may be unavailable when the signal is unsuitable. See Settings > Medical information for methods and limitations.

Available in English and Hindi. Designed for adults. Camera features require a compatible device with a working front camera and suitable lighting; the questionnaire can be used without camera access.

BioVision is not a medical device and does not diagnose, treat, cure, or prevent any medical condition. Always consult a healthcare professional for medical advice, diagnosis, or treatment. Do not change medicines or delay care because of this app. In an emergency, contact local emergency services.
```

Use this description only with the corresponding working features and a supported regulatory position. If camera functionality is disabled for release, update this entire pack and the website/screenshots to match that build. Omitting a feature from the listing while leaving it accessible does not resolve its review obligations.

### What's New / release notes

For the **first public iOS version**, Apple does not expose the What's New field. For subsequent versions, it is required, up to 4,000 characters. Do not describe all existing features as new. [Apple version reference](https://developer.apple.com/help/app-store-connect/reference/app-information/platform-version-information/).

First-release summary for channels that accept it:

```text
Introducing BioVision: adaptive health questions, optional camera-based estimates, lifestyle and wellbeing checks, shareable reports, and care information for Dehradun. Available in English and Hindi, with assessments processed on your device.
```

Crash-fix update copy — **use only after verifying the fix in the submitted build**:

```text
Fixed an issue that could prevent BioVision from opening on some devices. This update includes corrections to app startup and scene lifecycle handling.
```

## 6. TestFlight information

TestFlight has separate beta description, feedback and review fields; see [Provide test information](https://developer.apple.com/help/app-store-connect/test-a-beta-version/provide-test-information/). Beta wording belongs here, not in the production App Store description.

### Beta app description

```text
BioVision combines adaptive health questions, optional face and lower-eyelid camera checks, lifestyle information and mental wellbeing questionnaires into a report you can discuss with a healthcare professional. This beta supports English and Hindi and includes care information for Dehradun. Native assessments run on your device without an account. Camera outputs are estimates with important limitations, not medical diagnoses. Do not use the beta to make treatment decisions or delay care.
```

### What to Test

```text
Please test a fresh install and cold launch, then background and reopen the app. Try both the health-question route without a camera and the full camera route. Check camera permission denial and recovery, scan interruption and retakes, the report, PDF/text sharing, Dehradun care links, and English/Hindi switching. Check that unsuitable camera input produces a clear retry or unavailable state. Report crashes with your device model, OS, app version/build, steps and approximate time. Do not include health photos or personal health details in feedback.
```

Feedback email: `admin@wtsolutions.cc`.

Beta review contact: `[REQUIRED: full name]`, `[REQUIRED: international-format phone]`, `admin@wtsolutions.cc`. Sign-in required: **No**, provided the uploaded build retains the current account-free flow. Use section 8 for review instructions and add the actual build's known limitations.

## 7. Google Play copy

Google Play uses an app name, short description and full description; there is no equivalent manually entered Apple keywords field. Limits: 30 / 80 / 4,000 characters. [Google listing reference](https://support.google.com/googleplay/android-developer/answer/9859152?hl=en&rd=1).

### App name — maximum 30 characters

```text
BioVision.live: Health Check
```

### Short description — maximum 80 characters

```text
Health questions, optional camera estimates and a report for your doctor.
```

### Full description — maximum 4,000 characters

Use the **complete Apple description in section 5**, which is platform-neutral, and append the following compatibility paragraph. Check the combined length before pasting. Do not add hashtags or a repeated keyword list.

```text
ANDROID COMPATIBILITY
Requires Android 7.0 or later. Camera checks require a working front camera and sufficient device performance; availability and signal quality vary by model. No wearable is required. You can answer health questions without camera permission.
```

**Release gate:** the minimum OS is supported by the existing merged manifest, not a new AAB inspection. Add the actual tested device models/versions to compatibility information where needed and restrict unsupported devices in Play Console. Do not claim every Android 7+ phone can perform the camera checks. Google's [health policy](https://support.google.com/googleplay/android-developer/answer/16679511?hl=en) requires device compatibility information for sensor-based health functions.

### Release name — internal console label

```text
BioVision 1.0.0 - Production
```

Use the matching version and track when creating a different release. This internal label is not the public app title.

### Release notes — maximum 500 characters per language

```text
Introducing BioVision: adaptive health questions, optional camera-based estimates, lifestyle and wellbeing checks, shareable reports, and care information for Dehradun. Available in English and Hindi, with assessments processed on your device.
```

For a later release, replace this with verified changes since the preceding published version. Google documents the limit in [Prepare and roll out a release](https://support.google.com/googleplay/android-developer/answer/9859348?hl=en).

## 8. Reviewer instructions and crash resubmission

### App Review notes / Play app-access instructions

The notes below describe the intended native behavior. Run the paths on the uploaded build before using them. Append working evidence links and completed review-contact fields outside this block.

```text
BioVision does not require login, an account or a purchase.

Camera-free review:
1. Open BioVision and review the welcome, Terms and Privacy Policy.
2. On Home, select "Answer questions without the camera".
3. Complete About you and the applicable health questions.
4. Open the report, review the suggested next steps, and test PDF or text sharing.
5. Open the Care tab to inspect the Dehradun directory. Check Settings for language and medical information, and the separate wellbeing check.

Full camera review requires a physical device with a working front camera:
1. Select "Start health scan" and complete About you.
2. Allow camera access and follow the face-framing instructions in even light.
3. Complete the guided 30-second scan and the face-photo review steps shown by the app.
4. Follow the instructions for left and right lower-eyelid photos, review or retake them, and complete the health questions.
5. Open the report. Poor input can return an unavailable result or a retake request.

Methodology: the face scan uses FacePhys remote photoplethysmography. HRV and derived indicators use pulse intervals. Lower-eyelid colour features feed an on-device ridge-regression haemoglobin estimate. Face appearance checks use landmarks and relative colour/brightness rules. These are not clinical diagnoses. Settings > Medical information explains the methods and limits.

The eyelid evaluation used a public dataset of 217 adults with controlled-light macro images; this does not establish front-camera accuracy. Camera pulse, HRV and breathing outputs have not yet been validated against medical equipment on BioVision scans. We do not claim clinical validation of the finished app.

The native app processes assessments on device without uploading health inputs for analysis. It does not use HealthKit or Health Connect. User-selected report sharing and external directions/contact links are optional. No sign-in credentials are needed.
```

Complete these before submission:

| Reviewer field | Required value |
| --- | --- |
| Contact first and last name | `[REQUIRED: actual reviewer contact]` |
| Phone | `[REQUIRED: reachable number with +country code]` |
| Email | `admin@wtsolutions.cc` — confirm monitored |
| Full scan demonstration | `[REQUIRED: reviewer-accessible video URL of the actual submitted build on a physical device]` |
| Tested models / OS versions | `[REQUIRED: actual physical-device test record]` |
| Health-method evidence | `[REQUIRED: accessible methodology and validation/limitations attachment or URL]` |
| Prior rejected version/build | `[REQUIRED: copy from the rejection notice]` |
| Replacement submitted version/build | `[REQUIRED: copy from the processed upload]` |

### Response to the previous crash rejection

Do not send until the root cause is confirmed and the named replacement has passed testing. The following is a template, not a claim that testing has already happened:

```text
We investigated the crash reported for BioVision [REQUIRED: rejected version/build]. The confirmed cause was [REQUIRED: cause supported by the crash log]. We corrected [REQUIRED: specific change] and uploaded [REQUIRED: replacement version/build].

We tested the uploaded replacement through [REQUIRED: TestFlight / Play testing track] on [REQUIRED: models and OS versions]. Verification covered fresh installation, cold launch, background/foreground transitions, camera permission grant/denial, the full camera flow, the camera-free questionnaire and report sharing.

Test evidence: [REQUIRED: accessible video/test record link].
Please review the replacement build. No login is required. The steps in App Review Notes/App Access explain both review paths.
```

For the recorded iOS build 6 incident, see `docs/IOS_LAUNCH_CRASH_2026_10.md`: the symbolized stack points to scene-lifecycle startup, and source now configures Expo scene support. Only cite this as the rejection's cause after matching the supplied crash report. A metadata edit cannot repair a crashing binary.

## 9. Privacy, health declarations, age rating and other console answers

### Privacy answers — conditional on the final native build

| Field / topic | Expected answer or disclosure |
| --- | --- |
| Apple App Privacy | “Data Not Collected” only after confirming app and SDK behavior matches the current on-device design. |
| Play collection/sharing | “No” only if the final app and its SDKs do not collect/share reportable data under Google's definitions. |
| Tracking | No, if verified; no ATT prompt is needed solely for local health processing. |
| Local processing | Native face/eye analysis, answers, profile, questionnaires and directory lookup run locally. |
| Persistent preferences | Language **and accepted terms version** are saved locally. |
| Health answers / results | Current assessment stores are in memory; verify reset and process-restart behavior. Backgrounding an app is not equivalent to deleting its process. |
| Photos | Captures can exist in temporary app storage. Do not say all health data is “never written to disk” or that every photo is immediately deleted on close without testing cleanup. |
| Report exports | PDF generation creates a temporary local file; current sharing code attempts cleanup after sharing/cancellation/failure. A recipient's saved copy remains outside BioVision's control. Photos are excluded from the report. |
| Installed health apps | A short allowlisted availability check is intended to stay local. It does not imply reading health records. Verify actual packaged native modules. |
| External links | Maps, phone, provider websites and user-selected sharing services have their own behavior. Do not promise that the phone never makes any network request. |
| Accounts/deletion | No account exists in the current build. Describe local-data clearing accurately; never invent a server-side deletion facility. Revisit declarations if accounts are added. |
| Web build | The source's web eye-screening path uses an API. Do not apply native “no uploads” claims to a hosted assessment web build without separate disclosure and verification. The marketing website is separate from that assessment flow. |

Apple and Google use different collection definitions. SDK behavior counts; having no server of your own is insufficient evidence. See [Apple App Privacy](https://developer.apple.com/app-store/app-privacy-details/) and [Google Data safety guidance](https://support.google.com/googleplay/android-developer/answer/10787469?hl=en).

**Website inconsistency to resolve:** the privacy text includes both temporary photo storage and “keeps no health data after you close the app.” Confirm actual deletion behavior and align those statements before submitting. The website also permits use under 18 with a guardian while the older Play notes target adults only; select and implement one intended audience consistently.

### Google Health apps declaration

Select all relevant options shown in the current form, using these as mappings rather than blindly selecting every health category:

| Current functionality | Relevant declaration option to evaluate |
| --- | --- |
| Symptom questions and health reference | Medical Reference and Education |
| PHQ/GAD wellbeing screening | Mental and Behavioral Health |
| Doctor/hospital directory and care navigation | Healthcare Services and Management |
| Derived stress/recovery information | Stress Management, Relaxation, Mental Acuity |
| BMI/lifestyle features | Nutrition and Weight Management, if the actual feature meets that definition |
| Camera pulse/body-signal features | Activity and Fitness if applicable to the form's body-vitals definition; describe the actual health use in additional information |
| Regulated device | Select Medical Device Apps only according to verified regulatory status |
| Human-subject research | No active research enrollment/collection in this configuration: `researchCollectionAvailable: false` |
| Health Connect | Not used in the inspected design |

Do not choose “My app doesn't provide any health features.” A consumer symptom checker is not automatically professional Clinical Decision Support. Explain features that do not fit neatly into an option in the form's additional information. [Official declaration options](https://support.google.com/googleplay/android-developer/answer/14738291?hl=en).

Other intended Play answers: **no ads; no restricted app access; no financial or government functionality**. Verify every answer against the final artifact. Open the merged Release manifest to confirm permissions rather than relying solely on `app.json`.

### Other submission fields

| Field | Preparation |
| --- | --- |
| Encryption / export compliance | `ITSAppUsesNonExemptEncryption` is currently false in the iOS configuration. Confirm this accurately describes the final app and third-party libraries before using the declaration. |
| Content rights | Confirm rights to bundled models, datasets/derived assets, fonts, screenshots, provider information and trademarks. Keep required licenses/notices. Public availability alone is not proof of permission. |
| License agreement | Confirm whether Apple's standard EULA is being used or a custom EULA is required. A website Terms URL does not itself configure a custom Apple license agreement. |
| Store contact information | Supply the actual legal/seller details and any required public support contact/address; the review contact is a separate field. |
| Territories / trader declarations | Start with the supported market. If enabling additional regions, complete their trader/legal declarations and check regulatory, care-directory and emergency-information suitability. |
| Release timing | Prefer manual release/managed publishing for the first production launch so approval can be followed by a final coordinated check. This is an operational recommendation. |
| Accessibility labels / claims | Declare only features that have actually been verified with the relevant assistive technologies. |
| Purchases / subscriptions | None in the inspected flow. If added, configure products, reviewer access, pricing and disclosures before submission. |

### Age and audience

- Recommended intended audience: **adults, 18+**. Align onboarding, accepted profile ages, website policy and store settings with that decision.
- Apple: complete the current questionnaire honestly, including medical information and the wellbeing question about self-harm where asked. Do not omit that content to obtain a lower rating. Do not predict the computed rating. If enforcing an adult-only restriction, use the appropriate higher-rating override and explain it. [Apple age-rating instructions](https://developer.apple.com/help/app-store-connect/manage-app-information/set-an-app-age-rating/).
- Play: complete IARC honestly and separately select the intended adult target audience. Target audience and content rating are different fields. Do not assert child exclusion while app and policy expressly support children.

## 10. Screenshots, icons, keywords and hashtags

### Required visual assets

| Asset | Preparation |
| --- | --- |
| Apple app icon | 1024 × 1024 asset; confirm the icon in the uploaded archive matches BioVision branding |
| Apple screenshots | Use accepted current iPhone dimensions, for example **1320 × 2868** portrait for the 6.9-inch set. Supply the required sets shown for the actual supported devices; up to ten screenshots per set, no transparency. |
| Google Play icon | 512 × 512, compliant with Play's format requirements |
| Google Play feature graphic | 1024 × 500 |
| Play phone screenshots | At least two; recommend six purposeful screenshots from the Android release |
| Review demo | Record fresh launch, both assessment paths and report sharing on physical devices. A review demo is separate from an optional public store preview. |

Check [Apple screenshot specifications](https://developer.apple.com/help/app-store-connect/reference/app-information/screenshot-specifications/) and [Google preview asset requirements](https://support.google.com/googleplay/android-developer/answer/9866151?hl=en-GB) when exporting final assets.

Suggested screenshot sequence and captions:

1. Home — “A clearer first step for your health.”
2. Camera-free questions — “Start with what is bothering you.”
3. Face scan — “Optional camera estimates, with limits explained.”
4. Report — “Understand your results and next steps.”
5. Care — “Explore care options in Dehradun.”
6. Wellbeing or language settings — “Check in with yourself, in English or Hindi.”

Use the submitted platform's real UI. Show synthetic/example results only when clearly identified; never expose a person's health data or imply example values are guaranteed outputs. Keep the eye-photo feature and its limitations represented accurately in the description and review evidence even if it is not a standalone marketing screenshot.

### Search phrases for website/marketing planning

BioVision, health pre-screening, symptom questions, health report, care navigation, doctor directory Dehradun, mental wellbeing check, on-device health app, heart rate estimate, HRV estimate, lower-eyelid haemoglobin estimate, English Hindi health app.

Use phrases naturally. The Apple keyword field is the limited field in section 5. Google warns against repetitive/irrelevant listing keywords in its [listing guidance](https://support.google.com/googleplay/android-developer/answer/9859152?hl=en&rd=1).

### Hashtags — social/launch posts only

```text
#BioVision #HealthAwareness #HealthCheckIn #Wellbeing #CareNavigation #DigitalHealth #Dehradun
```

These are optional social-media copy, not required submission fields. Do not paste them into Apple keywords or Google Play tags. Neither store uses a user-entered hashtag field for this listing workflow. Avoid hashtags implying regulatory approval or proven diagnostic performance.

## 11. Prevent another crash rejection: release gate for both platforms

### Test the exact store-distributed build

An Expo development session, successful compile, simulator test or source check is insufficient evidence for the release artifact. Install the processed build through **TestFlight** and **Google Play's testing track**, then record the following for each platform:

| Test | Required outcome |
| --- | --- |
| Fresh install + first launch | Opens to a usable welcome/home screen without Metro, a local server or a developer machine |
| Repeated cold launches | At least five successful force-quit/reopen cycles as a practical release check |
| Device/OS coverage | Test the actual OS/model in the prior rejection, a current device and an older supported device where available; record gaps |
| Offline first launch | Locally bundled screens/models and the questionnaire work without downloading essential assets |
| Permission denied/restricted | No crash or loop; camera-free questions remain reachable; Settings recovery is understandable |
| Permission allowed | Physical front-camera preview, scan start/completion, still capture and eye photos work |
| Weak signal/poor photos | Clear retry/unavailable/error state; no fabricated healthy result |
| Interrupted scan | Background/foreground, screen locking and incoming-call interruptions recover safely or restart clearly |
| Retakes/back navigation | Replacing either eye photo or restarting does not mix stale results with a new assessment |
| Camera-free end-to-end path | Profile → applicable questions → report → care guidance completes |
| Wellbeing path | Questions, scoring, supportive routing and links render without errors; no personal answers in evidence |
| PDF/text sharing | Success, cancellation, unavailable sharing targets and export failures are handled; inspect cleanup |
| External links | Calls, directions, provider sites and support URLs work or fail gracefully |
| English/Hindi + large text | Essential buttons remain reachable; no clipped blocking dialogs |
| Storage/memory pressure | Repeated scans and exports do not crash; test the oldest supported hardware where possible |
| Process restart/reset | Results and captures are handled consistently with the declared retention policy |

Practical release criterion: **no unresolved reproducible crash or blocking path in the advertised flows**. The five-launch check is this project's recommendation, not a claimed Apple/Google numerical requirement.

### iOS checks

```bash
npm run ios:launch-check
npm run typecheck
npm run lint
python3 scripts/check_i18n.py
npm run test:routing
npm run test:wellbeing
```

After producing the actual archive, use its `.app` directory:

```bash
npm run ios:launch-check -- --bundle /absolute/path/to/BioVision.xcarchive/Products/Applications/BioVision.app
```

Then upload, install through TestFlight and complete the matrix. Preserve the archive and matching dSYMs. Check that scene lifecycle, bundle ID, build number, privacy manifest and all native model assets survive packaging. Build with the SDK version accepted by Apple at submission time; its [SDK minimum notice](https://developer.apple.com/news/?id=ueeok6yw) requires iOS 26 SDK or later for uploads from 28 April 2026.

### Android checks

```bash
npm run android:aab
```

Upload the signed AAB to the testing track, inspect the generated manifest/device availability and install the Play-generated app. Run Play's pre-launch report and inspect crashes/ANRs before production. Check current [target API requirements](https://support.google.com/googleplay/android-developer/answer/11926878?hl=en), native-library [16 KB page-size compatibility](https://developer.android.com/guide/practices/page-sizes), camera/model packaging and all declared permissions. Preserve native symbols and mapping files where generated. Confirm Play App Signing and the correct upload key without placing keys/passwords in this document.

If the app crashes again, match the **package, version, build, OS, device, timestamp and symbols** before changing anything. On iOS obtain and symbolicate the crash report; on Android inspect the crash/ANR stack and pre-launch report. Distinguish launch, permission, camera/model and JavaScript errors so the fix addresses the actual failure.

### Verification performed for this document

- Read the deployed homepage HTML and its published JavaScript, plus relevant website/app source and existing store notes.
- Checked live URL responses: homepage 200; privacy, support and terms direct URLs 404.
- Confirmed configured identifiers/version/build values and inspected the existing Android merged Release manifest.
- Ran `npm run ios:launch-check`: **20/20 passed**, source-only mode, current configured iOS build 8.
- Checked metadata text lengths when preparing this document.
- **Not performed:** a new archive/AAB, physical-device runtime testing, store-console verification, medical validation or a new store submission. Other commands above are release instructions, not claimed passing results from this preparation.

## 12. Health-method evidence to attach

Use `ml/conjunctiva_colour/README.md`, `src/i18n/en.json` → medical information, native model implementation and the actual device tests as starting evidence. Reconcile stale statements in the root README and September readiness notes with current native code before using those files as review attachments.

| Evidence | What the submission should accurately explain |
| --- | --- |
| Intended use | Consumer health information, screening limitations, supported audience and role of professional care |
| Pulse/HRV | FacePhys version, capture duration, preprocessing, quality gates, interval derivation and device limitations |
| Stress/recovery/breathing | Which outputs are derived, their meaning and limitations; no claim that they diagnose stress or cardiac/respiratory disease |
| Appearance checks | Landmark/relative-colour heuristics; not trained diagnostic classifiers or emotion detection |
| Eyelid model | Ridge regression; Eyes-Defy-Anemia dataset; 217 adults (95 India, 122 Italy); explain patient-level cross-validation and controlled capture conditions |
| Reported dataset performance | Repository reports combined MAE 1.25 g/dL, sensitivity 0.66, specificity 0.88; India MAE 1.32, sensitivity 0.71, specificity 0.59. These are internal dataset-evaluation figures, not independently verified product accuracy. |
| Generalization gap | Macro-lens controlled-light photos differ from everyday front-camera photos; no claim that performance transfers automatically |
| Population limits | No blanket validation claim for children, pregnancy, all skin tones or all supported devices |
| Wellbeing | PHQ/GAD instruments, scoring/stepping and supportive handling; screening scores are not diagnoses |
| Clinical sources | Exact references/version dates supporting thresholds and care rules, with limits; reference guidance is not product endorsement |
| Regulatory status | Actual determination/evidence; no invented clearance, approval or exemption |

Published model/data references and disclaimers do not substitute for validation of the finished app. If a reviewer cannot validate a health accuracy claim, Apple may reject it under [1.4.1](https://developer.apple.com/app-store/review/guidelines/). Prepare evidence or change the released functionality and all corresponding claims; avoid repeatedly resubmitting the same unsupported behavior with different wording.

## 13. Final submission sequence

1. Match the previous crash notice to the rejected platform/build and retain its report.
2. Fix public privacy/support/terms routing and confirm direct-link access.
3. Confirm verified organization/seller identity, ownership and relevant regulatory status.
4. Freeze the release feature set. Align the app, website, listing, screenshots and privacy disclosures.
5. Resolve age-audience and temporary-photo-retention inconsistencies.
6. Set unique upload build numbers; produce signed release artifacts with bundled assets and symbols.
7. Install the uploaded builds through TestFlight/Play testing; complete the crash and functional matrix, and save evidence.
8. Complete privacy, health, age/content and access declarations from the tested behavior.
9. Paste the correct platform copy, upload actual screenshots and attach reviewer evidence.
10. Fill review-contact fields and replace every required placeholder. Confirm all console validation items and any account-specific testing requirements are complete.
11. Submit the tested processed build for review. A TestFlight beta approval does not approve the public App Store release; Play testing-track availability does not guarantee production approval.
12. If rejected, address every stated issue and reference the exact fix/build in the response. For a crash, supply runtime evidence; for health/privacy issues, correct the underlying behavior or evidence as well as the text.

This pack reduces preventable submission errors. It does not certify future crash-free operation, regulatory compliance or store acceptance.

## 14. Copy-length verification

Counts include spaces and punctuation, excluding code fences. The Play description count includes the shared description, a blank line and the Android compatibility paragraph.

| Field | Prepared length | Limit |
| --- | --- | --- |
| Apple app name | 14 characters | 30 |
| Apple subtitle | 30 characters | 30 |
| Apple promotional text | 149 characters | 170 |
| Apple keywords | 91 UTF-8 bytes | 100 bytes |
| Apple description | 3,208 characters | 4,000 |
| Play app name | 28 characters | 30 |
| Play short description | 73 characters | 80 |
| Play full description with compatibility | 3,473 characters | 4,000 |
| Play first-release notes | 243 characters | 500 per language |

Recheck these limits after any edit or localization. Required placeholders belong to internal preparation/review templates and must be replaced before those fields are submitted.
