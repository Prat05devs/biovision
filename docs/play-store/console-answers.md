# Play Console answers — BioVision

Policy → App content. Every section must be complete before a release can go to review, including
on closed testing. Answers must match what the app actually does; if a server, analytics or crash
reporting is ever added, update Data safety and the privacy policy before that build ships.

## Privacy policy
https://biovision.live/privacy — must load publicly, without login or geoblocking, and match the
in-app policy (Settings → Privacy Policy). Deploy `landing/` first.

## App access
**All functionality is available without special access.** No login, no account, no purchase.
Add this note for reviewers: "The face scan needs a physical phone with a front camera. To test
without a camera, tap 'Answer questions without the camera' on the home screen."

## Ads
**No, my app does not contain ads.**

## Content rating (IARC questionnaire)
Category: pick the non-game category that fits best (for a health tool this is usually the
utility/productivity/other type; check the wording the form shows).
- Violence, sexuality, language, controlled substances, gambling: **No**.
- User-generated content, sharing location, chat with other users: **No**.
- Digital purchases: **No**.
- If asked about content that discusses suicide or self-harm: **Yes** — the wellbeing check asks
  one screening question and then shows helplines. Answering honestly may raise the rating; that
  is fine and avoids a later takedown.

## Target audience and content
**Target age groups: 18 and over only.** The app is designed for adults (it says so in the
privacy policy). Choosing any under-13 group brings the app under the Families policy and its
extra requirements. Answer **No** to "could the app unintentionally appeal to children".

## News app
**No.**

## Data safety
**Does your app collect or share any of the required user data types?** → **No.**

Why this is accurate: Google counts data as collected only when it is transmitted off the device.
BioVision processes camera frames, photos, profile and answers only on the phone, in memory, and
the installed-apps check for the Health apps card also stays on the phone. Sharing a PDF is started
by the user through the Android share sheet, which Google treats as user-initiated, not collection.
- Is all user data encrypted in transit? → **Not applicable** (nothing is transmitted).
- Do you provide a way for users to request deletion? → Nothing is kept; say so in the policy
  (section "Deleting your data").

## Health apps declaration
Required for every app. Declare the features honestly; for BioVision these are:
- Health and fitness features that estimate body signals from the camera (heart rate, HRV,
  breathing, haemoglobin estimate).
- Symptom questions with doctor suggestions and emergency routing.
- A mental wellbeing check (PHQ/GAD screening questions) with crisis helplines.
- A directory of doctors and hospitals.
- **Not regulated as a medical device.** The required disclaimer ("not a medical device and does
  not diagnose, treat, cure, or prevent any medical condition", plus "consult a healthcare
  professional") is in the store description, on the welcome screen and in Settings.
- Health Connect: **not used.**
- Human subjects research: **No** (the research opt-in is switched off in this build:
  `researchCollectionAvailable: false` in `configs/deployments/biovision.json`).

## Government apps, financial features
**No** to both.

## Permissions
The release manifest requests only CAMERA, INTERNET, ACCESS_NETWORK_STATE and VIBRATE. No
location, storage, microphone, overlay or all-packages permission, so no Permissions Declaration
Form is needed. The health-app check uses a fixed `<queries>` list, not QUERY_ALL_PACKAGES.

## Testing before production
- **Personal developer account created after 13 November 2023:** a closed test with at least
  12 testers opted in for 14 days in a row is required before you can apply for production.
  Keep all 12 opted in for the whole 14 days. Organization accounts are exempt.
- Upload an **.aab** (`npm run android:aab`), not the test APKs. Target SDK is 36, which meets the
  rule for new apps and updates from 31 August 2026.
- Use **Play App Signing**; keep the upload key from `~/.gradle/gradle.properties` backed up.
- Run the **pre-launch report** on the closed track and fix anything it flags before production.
