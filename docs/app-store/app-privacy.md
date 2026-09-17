# App Privacy ("nutrition label") answers

**Do you or your third-party partners collect data from this app?** → **No, we do not collect data from this app.**

Why this is accurate:
- Camera frames, photos, answers, profile and location are processed only on the device and are
  not transmitted off the device (Apple defines "collect" as transmitting off the device in a way
  that allows access beyond real-time servicing of the request).
- No analytics, crash reporting, advertising or tracking SDKs are included
  (`ios/BioVision/PrivacyInfo.xcprivacy` → `NSPrivacyTracking = false`, no collected data types).
- Sharing a PDF is initiated by the user through the iOS share sheet.

If a server, analytics or crash reporting is added later, these answers must be updated before that build ships.
