# Store submission checklist (App Store and Google Play)

Checked against Apple's App Review Guidelines and Google Play's Health Content and Services,
target-API, package-visibility and testing rules on 21 October 2026. Listing copy:
`docs/app-store/metadata.md` and `docs/play-store/listing.md`. Console answers:
`docs/app-store/app-privacy.md` and `docs/play-store/console-answers.md`.

## Already done in the code (21 October 2026)
- [x] iOS launch crash fixed (scene lifecycle, build 7). `npm run ios:launch-check` passes.
- [x] Exact disclaimer on the welcome screen, in Settings → Medical information, in the Terms and in
      both store descriptions: "not a medical device and does not diagnose, treat, cure, or prevent
      any medical condition … consult a healthcare professional" (Play health policy; Apple 1.4.1).
- [x] Medical information explains method and accuracy with real figures and limits (Apple 1.4.1
      rejects accuracy claims it cannot validate). All copy says "estimate", not "measure".
- [x] No blood pressure, blood oxygen, glucose or temperature values anywhere (Apple 1.4.1 bans
      sensor-only claims for these).
- [x] Unused permissions removed: location (no feature used it) on both platforms, plus Android
      storage, microphone and display-over-other-apps. Only the camera is requested (Apple 5.1.1(iii),
      Play health policy). `app.json` blocks them so a prebuild cannot add them back.
- [x] Android cloud backup off (`allowBackup=false`).
- [x] Privacy policy (app and website) rewritten for both platforms: no "iPhone" on Android, the
      installed health-apps check disclosed, deletion explained, direct contact email (Apple 5.1.1(i),
      Play privacy policy rules). Version bumped so everyone re-accepts once.
- [x] Research opt-in hidden in this build (avoids Apple 5.1.3 ethics-board requirements).
- [x] Questions only appear for the people they apply to (sex, pregnancy, age).
- [x] Self-harm screening asked gently with a "why we ask" note, and routed to helplines.
- [x] Target SDK 36 (Play rule for new apps from 31 August 2026).

## You must do before submitting
- [ ] **Deploy `landing/`** so https://biovision.live/privacy, /terms and /support show the
      21 October text. Store reviewers open these links.
- [ ] **Developer accounts as an organization.** Apple 5.1.1(ix) expects apps that handle sensitive
      health information to be submitted by a legal entity, not an individual. On Google Play an
      organization account also skips the 12-tester rule.
- [ ] **If the Play account is personal:** run a closed test with 12 testers opted in for 14 days in a
      row before applying for production.
- [ ] **Record a demo video** of the full scan on a real phone and put its link in the Apple review
      notes ([DEMO VIDEO LINK] in `metadata.md`). Reviewers often cannot complete a camera health scan.
- [ ] **Fill the review contact** (name, phone) in `metadata.md`.
- [ ] **Screenshots from the build you submit**, showing real screens, with no claims beyond the
      description. iOS 6.9-inch (1320 × 2868); Play phone screenshots plus a 1024 × 500 graphic.
- [ ] **Answer the age-rating and IARC questionnaires** as written in the docs (honestly; the self-harm
      screening question must be declared if asked).
- [ ] **Play Console App content:** privacy policy, app access, ads, content rating, target audience
      18+, data safety "no data collected", health apps declaration, government/financial "no".
- [ ] **App Store Connect:** App Privacy "Data Not Collected", export compliance (pre-answered), the
      new age rating, review notes from `metadata.md`.
- [ ] **Upload release builds:** iOS archive with a new build number; Android `.aab` from
      `npm run android:aab` (not the test APKs).
- [ ] **Send me the text of any earlier Google Play rejection** so it can be checked against this list.

## Writing rules for any new text (in the app, the listings or the website)
- Say "estimate", "screening", "may", "suggests". Never "measure", "accurate", "diagnose", "detect",
  "clinically proven", "replaces a blood test".
- Never mention blood pressure, oxygen, glucose or temperature as something the app gives.
- Keep the disclaimer sentence wherever results are described, and always point to a doctor.
- Use "your phone", never a platform name, in shared text.
- Health data: say exactly what is used, where it is processed, and that nothing leaves the phone.
  If that ever changes, the privacy policy, Data safety and App Privacy must change in the same release.
