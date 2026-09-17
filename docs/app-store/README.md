# Shipping BioVision to TestFlight and the App Store

## 0. One-time prerequisites

1. **Paid Apple Developer Program membership** (₹8,700 / US$99 per year) —
   <https://developer.apple.com/programs/enroll/>. A free Apple ID can install on your own
   iPhone but **cannot** archive for or upload to App Store Connect.
2. After enrolment, in Xcode → Settings → Accounts, sign in and select the new paid team.
3. In `ios/BioVision.xcworkspace` → target **BioVision** → Signing & Capabilities:
   choose the paid team, keep "Automatically manage signing" on.
   Bundle identifier: `com.teambiovision.biovision` (change it here and in `app.json` if taken).
4. In App Store Connect (<https://appstoreconnect.apple.com>) → Apps → **+ New App**:
   Platform iOS · Name "BioVision" (use "BioVision Health" if the name is taken) ·
   Primary language English (India) or English (U.S.) · Bundle ID as above · SKU `biovision-ios-1`.
5. Host `privacy-policy.html` and `terms-of-use.html` at public HTTPS URLs
   (GitHub Pages, Netlify Drop or Google Sites all work), and create a simple support page or
   a support email address. App Store Connect requires a Privacy Policy URL and a Support URL.

## 1. Build the archive in Xcode

1. `npm install` (runs patch-package) and `cd ios && pod install`.
2. Open `ios/BioVision.xcworkspace` (the workspace, not the project).
3. Scheme **BioVision**, destination **Any iOS Device (arm64)**.
4. Bump the build number for every upload: target → General → Build (1, 2, 3 …).
   Version stays `1.0.0` until the public release.
5. **Product → Archive.** The Release configuration bundles the JavaScript and all models.
6. Organizer opens → select the archive → **Distribute App → App Store Connect → Upload**.

Command-line alternative (from the repo root):

```bash
cd ios
xcodebuild -workspace BioVision.xcworkspace -scheme BioVision -configuration Release \
  -destination 'generic/platform=iOS' -archivePath build/BioVision.xcarchive -allowProvisioningUpdates archive
xcodebuild -exportArchive -archivePath build/BioVision.xcarchive \
  -exportOptionsPlist ../docs/app-store/ExportOptions.plist -exportPath build/export -allowProvisioningUpdates
```

Export compliance is pre-answered (`ITSAppUsesNonExemptEncryption = NO`), so builds go straight
to processing (10–30 minutes).

## 2. TestFlight

- **Internal testing** (up to 100 people added as users in your App Store Connect team):
  available as soon as the build finishes processing — no review.
- **External testing** (up to 10,000 people via email or public link): the first build needs
  Beta App Review (usually under 24 hours). Paste the review notes from `metadata.md`.

## 3. App Store release

Fill in the listing from `metadata.md`, the App Privacy answers from `app-privacy.md`,
upload screenshots (6.9-inch 1320 × 2868 is required; the app is iPhone-only so no iPad set),
select the build, and **Submit for Review**.

## Before every upload

```bash
npm run typecheck && npm run lint && python3 scripts/check_i18n.py \
  && npm run test:routing && npm run test:health && node scripts/check-ios-launch.cjs
```
