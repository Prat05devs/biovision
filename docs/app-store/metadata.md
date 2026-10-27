# App Store Connect listing — BioVision

Wording rules for every field below and for screenshots (App Review 1.4.1, 2.3):
say **estimate**, never "measure", "accurate", "diagnose" or "detect"; never mention blood
pressure, blood oxygen, SpO2, glucose or temperature; keep the medical disclaimer in the
description; no other platform names (Android, Google Play).

**Name (30):** BioVision.live
**Subtitle (30):** Face scan health check
**Category:** Primary **Health & Fitness** · Secondary **Medical**
**Price:** Free · **Availability:** India (add more countries later)
**Copyright:** 2026 NavTaksh Wellness

## Age rating
Answer the questionnaire in App Store Connect honestly; do not pick a rating directly.
- Medical or treatment-focused information: **Frequent** (the app is about health).
- The wellbeing check asks one screening question about thoughts of self-harm, then shows
  helplines. If the questionnaire asks about suicide or self-harm themes, answer **Infrequent**.
- Everything else (violence, sexual content, profanity, gambling, alcohol/drug use as content,
  user-generated content, unrestricted web access): **None** / **No**.
- Contests, messaging, advertising: **No**.
Apple computes the rating from these answers; expect 13+ or higher.

## Promotional text (170)
A 30-second face scan, two eye photos and a few questions. Get a private health report and the right doctor to see near you.

## Description
BioVision gives you a quick, private health check-in using your iPhone's front camera and a few questions.

30-SECOND FACE SCAN
• Estimated heart rate and heart-rate variability (RMSSD, SDNN)
• Estimated stress index and recovery score
• Estimated breathing rate
• Face and skin signs: under-eye shading, eye redness, lip colour, skin tone
• Live pulse waveform while you scan

EYE CHECK
• A haemoglobin estimate from the colour of your inner lower eyelid, compared with WHO ranges for your age, sex and pregnancy

HEALTH QUESTIONS
• Tell us what is bothering you: tiredness, breathing, heart, skin, mood, headaches, sugar and thyroid, stomach, joints, ENT, eyes or women's health
• Questions adapt to you: only what applies to your age, sex and pregnancy is asked
• Danger signs send you straight to emergency help

NO CAMERA? NO PROBLEM
• Answer the same questions without the scan and still get your report and doctor suggestion

A CLEAR REPORT
• Every result explained in plain language with its typical range
• Which doctor to see, how soon, and which tests to ask about
• Share a PDF report with your doctor or family

FIND CARE
• Over 200 doctors and hospitals in Dehradun from hospitals' official websites, by speciality, with directions and call buttons

PRIVATE BY DESIGN
Everything is analysed on your iPhone. No account, no uploads, no ads, no tracking. English and Hindi.

HOW ACCURATE IS IT?
Every value is an estimate. The haemoglobin model was tested on 217 adults with laboratory results; its estimate was off by about 1.3 g/dL on average. Full methods and limits are in the app under Settings → Medical information.

BioVision is not a medical device and does not diagnose, treat, cure, or prevent any medical condition. Always consult a healthcare professional for medical advice, diagnosis, or treatment. In an emergency, call 112.

## Keywords (100)
health check,heart rate,HRV,stress,hemoglobin,anemia,face scan,doctor,Dehradun,wellness,Hindi

## URLs
- Support URL: https://biovision.live/support
- Marketing URL (optional): https://biovision.live
- Privacy Policy URL: https://biovision.live/privacy
- Terms of Use (EULA) URL: https://biovision.live/terms

Deploy `landing/` before submitting: the policy on the website must match the one in the app
(both were updated on 21 October 2026, and `landing/src/content/legal.json` is synced from
`src/i18n/en.json`).

## App Review notes
No login is required, and every feature is available without an account or purchase.

Quickest path for review (no camera needed): on the home screen tap "Answer questions without the camera", fill in About you, answer the questions, and the report opens. This exercises the questionnaire, the report, the doctor suggestions and Share PDF.

Full scan (needs a physical iPhone with a front camera; the simulator has none):
1. Accept the welcome screen and tap "Start health scan".
2. Enter age, sex, height and weight.
3. Allow camera access. In even light, fit your face inside the mesh and tap the round button for the 30-second scan.
4. Take two eye photos (gently pull down the lower eyelid), answer the questions and view the report.
A screen recording of the full scan on an iPhone: [DEMO VIDEO LINK]

Medical claims and methodology (Guideline 1.4.1):
- BioVision is not a medical device and makes no diagnostic claim. It shows estimates with typical ranges, tells the user to consult a healthcare professional, and routes danger signs to 112 and the Tele-MANAS helpline (14416).
- Heart rate, HRV and breathing come from the published FacePhys rPPG model, run on the device. When signal quality is too low the app shows no value instead of a guess.
- Haemoglobin is a ridge-regression model on eyelid colour, trained and cross-validated on the public Eyes-Defy-Anemia dataset (217 adults with laboratory haemoglobin, India and Italy): mean absolute error 1.25 g/dL, sensitivity 0.66, specificity 0.88 for low haemoglobin. These figures and their limits are shown to users in Settings → Medical information.
- The app does not estimate blood pressure, blood oxygen, blood glucose or temperature.

Privacy: all analysis runs on the device. The app has no server for health data, no analytics, no advertising and no tracking, and it does not use HealthKit. Camera frames are processed in memory and never recorded. App Privacy is "Data Not Collected".

**Contact for review:** _name_ · _phone_ · admin@wtsolutions.cc
