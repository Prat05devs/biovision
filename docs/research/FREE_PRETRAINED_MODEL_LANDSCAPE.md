# Free Pretrained Models for BioVision Camera Screening

## Executive decision

No free model found in this review can safely provide Shen.AI-equivalent health screening from BioVision's current still photographs. The gap is not primarily model discovery. It is the combination of input modality, licensing, evidence, and product scope:

- Pulse and respiratory signals require a time series. A still image does not contain a measurable pulse waveform.
- The most credible openly released smartphone heart-rate model found, Google's PHRM-mini, is limited to non-commercial, non-clinical research.
- Free conjunctiva-anemia checkpoints exist, but their reported results come from small, narrow, or poorly documented datasets and have not been externally validated for BioVision's intended Indian adult population.
- The available selfie "skin health" models either use cosmetic or synthetic labels, depend on non-commercial face datasets, or have no clinical evidence for dehydration, smoking, nutritional deficiency, jaundice, or systemic disease.
- Blood pressure, oxygen saturation, glucose, haemoglobin, stress, BMI, and chronic-disease risk cannot be inherited merely by integrating an rPPG heart-rate model. They are separate estimation problems, often requiring calibration, demographics, additional sensors, or proprietary training data.

The recommended free stack is therefore deliberately narrow:

1. **Heart-rate technical pilot:** evaluate the browser-based `vitalcamera-sdk`/FacePhys model on-device, alongside the model-free POS algorithm as a transparent baseline. Both can be tried without acquiring labelled training data. Show pulse only as an experimental wellness measurement with signal quality and abstention.
2. **Anemia research pilot:** evaluate `galihkjaya/anemia-palor-detection` behind the existing FastAPI `ScreeningModel` interface. Keep it disabled for end users until a participant-disjoint, device-diverse local validation against same-day CBC/haemoglobin is complete. Do not expose its haemoglobin regression value.
3. **Appearance observations:** keep MediaPipe landmarks and conservative relative-colour observations. No reviewed pretrained model improves the clinical validity of the existing dark-circle, redness, pigmentation, or lip-contrast checks enough to justify integration.
4. **Do not implement free camera estimates for blood pressure, SpO2, glucose, stress, dehydration, BMI, age, or disease risk.** The reviewed releases do not meet the combined requirements of commercial use, downloadable weights, appropriate inputs, and credible external validation.

This conclusion is based on publicly accessible project repositories, model cards, original papers, and official product documentation reviewed through 11 September 2026. A repository or Hugging Face license label was treated as evidence about that repository only; it was not assumed to override restrictions attached to upstream weights or training data.

## What BioVision actually needs

BioVision currently has two distinct imaging paths:

- one front-camera or gallery still for automatic appearance observations; and
- separate left and right lower-eyelid stills for the legacy anemia endpoint.

The web appearance provider uses MediaPipe Face Landmarker to locate facial regions and then applies untrained relative-colour rules. Native appearance inference abstains. The backend already exposes a clean anemia model protocol accepting the two eye images and returns a signal, observations, quality report, optional internal confidence, and model version. These boundaries are useful: candidate models can be evaluated without allowing them to control the questionnaire or generate diagnoses.

The earlier decision against recording face video must change if camera pulse is added. A viable rPPG flow needs a continuous, timestamped sequence of face frames, generally at 15-30 frames per second, for at least 8 seconds and usually 20-30 seconds. HRV is more demanding because reliable beat-to-beat variation needs a longer, clean interval; the reviewed FacePhys mobile description uses roughly 60 seconds before HRV is available.[^1]

## Decision matrix

| Candidate | Input and output | Weights/code available | Commercial position | Evidence position | BioVision decision |
|---|---|---|---|---|---|
| Vital Camera SDK / FacePhys browser model | Live face video; BVP, HR, signal quality, experimental HRV | Included TFLite/LiteRT models and browser code | Free use appears permitted under a modified MIT license, but local processing, explicit consent, and metric-transmission conditions are mandatory | FacePhys paper reports strong benchmark performance; the exact packaged SDK build lacks independent product validation | **Pilot first for web HR only** |
| FacePhys Demo | Live webcam; HR and HRV | Approximately 4 MB model in a browser PWA | Same privacy addendum | Useful runnable demonstration, not a medical-device validation | **Reference implementation** |
| VitalLens with local POS | Face video; pulse/HR | No learned weights required; MIT Python package | Permissive for local POS path | Transparent classical baseline; accuracy is capture-dependent | **Use as comparison baseline** |
| pyVHR | Face video; classical rPPG and research deep models | Code and multiple algorithms | GPL-3.0; commercial use is possible but redistribution has copyleft obligations | A research and benchmarking framework, not a production SDK | **Evaluation harness, not app dependency** |
| rPPG-Toolbox | Face video; HR/BVP across many networks | Code and released checkpoints | Responsible AI Source Code License; restrictions include medical diagnosis without human oversight and downstream notice obligations | Strong academic benchmark utility | **Research only unless counsel approves exact use** |
| open-rppg | Face video; HR, SQI, HRV | MIT toolbox; bundled pretrained models have separate/unclear rights | Code license does not clear the model weights | Convenient unified interface, but license chain is unresolved | **Reject for commercial build** |
| Google PHRM-mini | 8-second smartphone face video; HR and daily resting HR | Access by application | Explicitly non-commercial, non-clinical research only | Strongest smartphone evidence reviewed: large real-world validation and skin-tone analysis | **Benchmark inspiration only** |
| Galih K. Jaya dual-head EfficientNet-B0 | One palpebral-conjunctiva photo; anemia class and Hb regression | 21 MB PyTorch checkpoint, MIT-tagged model repo | Potentially commercially usable, subject to dataset and dependency review | 710 Ghanaian paediatric images; 142-image validation split; no external validation | **Anemia evaluation candidate** |
| Eye MedSigLIP linear probe | One conjunctiva image; binary anemia score | Full encoder and linear head on Hugging Face | Repo is Apache-2.0-tagged; upstream MedSigLIP uses HAI-DEF terms | Self-reported 1,162-image test result, but dataset origin and subject separation are not adequately documented | **Secondary experiment only** |
| sHEMO | Eye image; handcrafted Hb regression | Algorithm code | No license found, so commercial rights are not granted | Reported 65-person study; no downloadable production model or broad external validation | **Reject** |
| Glowlytics skin models | Selfie; cosmetic hydration, texture, sun-damage and elasticity scores; acne boxes | ONNX and PyTorch weights, MIT-tagged | Repository is permissive, but source-data rights still require review | Four scores were distilled from Claude-generated labels on UTKFace/FFHQ; they are not instrument-measured hydration or disease labels | **Reject for health screening** |
| BiSeNet face parsing checkpoints | Still face; semantic masks for skin, lips, eyes, hair | Widely mirrored weights | Common code repos are permissive; CelebAMask-HQ is restricted to non-commercial research/education | Good geometry utility, no health prediction | **Do not ship mirrored weights commercially** |
| Sclera-TransFuse / RITNet family | Cropped eye; sclera/iris segmentation | Some checkpoints or code | Incomplete or dataset-dependent license chain | Trained for biometrics/gaze datasets, not conjunctival colour or redness diagnosis | **No advantage over current landmarks for MVP** |
| Shen.AI free tier | 30-second face video; free tier currently lists HR only | Proprietary SDK, no weights | 250 HR scans/month currently advertised; license/account dependency | Product evidence is separate from open model evidence | **Possible demo fallback, not a free model** |

## Camera pulse and Shen.AI-style markers

### What a free rPPG component can reasonably do

Remote photoplethysmography measures tiny colour changes in facial skin across video frames. Face tracking, skin-region selection, frame timing, motion rejection, illumination control, temporal filtering, and confidence gating are all part of the measurement. The output can be a blood-volume-pulse waveform; heart rate is then derived from its dominant frequency or detected beats.

Heart rate is the best-supported free target. Even here, performance changes with motion, illumination, compression, frame rate, camera processing, pulse range, and skin reflectance. A 2025 reliability study describes low light and elevated heart rates as material failure conditions, while a consumer-monitor meta-analysis recommends at least 15 fps and highlights resolution and skin pigmentation as validation concerns.[^2][^3]

HRV is a weaker product target. Deriving SDNN or RMSSD requires accurate beat timing, not merely the correct average pulse frequency. A plausible average HR can coexist with noisy inter-beat intervals. BioVision should only return HRV when a model-specific quality gate accepts a sufficiently long window, and it should be described as experimental until compared with ECG-derived intervals.

Respiratory rate is not automatically provided by the free FacePhys browser release identified here. It may be estimated from modulation of the pulse waveform or motion, but the production FacePhys service and Shen.AI expose it through separately packaged capabilities. BioVision should not calculate respiratory rate from the free HR model merely because the underlying BVP signal exists.

### Recommended pilot: Vital Camera SDK / FacePhys

`KegangWangCCNU/vitalcamera-sdk` is the closest technical fit for BioVision's web target. The repository includes its rPPG, projection, signal-quality, and spectral models, runs in the browser with Web Workers and LiteRT, emits HR, BVP, beat, HRV, face, and error events, and can omit unrelated emotion and gaze modules.[^4] Its companion FacePhys Demo states that processing remains local and that the model is about 4 MB.[^5]

The license is not plain MIT. Its Privacy Protection Addendum requires all biometric inference and signal processing to remain on the local device; raw video cannot be sent to a server even with consent. Derived physiological metrics can be transmitted only after explicit, informed, revocable consent, and redistributions must preserve the local-processing guarantees.[^6] That is compatible with a privacy-preserving BioVision design, but it rules out putting this model behind the current FastAPI inference endpoint.

The FacePhys paper reports a 3.6 MB footprint, 9.46 ms per-frame latency, and a 49% error reduction relative to its selected comparisons.[^7] Those are author-reported research results, not an independent validation of the npm package on BioVision devices. The package is also new and lightly adopted. Treat it as an evaluation candidate, pin its exact commit and model hashes, and test it on physical Android and iPhone devices before depending on it.

For the first pilot, enable only face detection, rPPG, spectral estimation, and signal quality. Suppress emotion, gaze, inferred eye state, and speaking. Emotion analysis does not belong in BioVision's wellbeing flow, and those extra models add unrelated privacy, bias, licensing, and performance risk.

### Transparent baseline: POS

The plane-orthogonal-to-skin (POS) algorithm is not a pretrained model. That is an advantage for a baseline: it needs no weights or labelled dataset and makes its assumptions inspectable. The MIT-licensed VitalLens Python client provides a local `pos` mode that returns pulse without an API key, while its higher-fidelity model and advanced metrics use an API service.[^8] pyVHR also implements POS, CHROM, GREEN, ICA, and other classical methods, but its GPL-3.0 license and research-oriented dependencies make it better suited to offline comparison.[^9]

POS should not be selected because it is free alone. It should be run on the same validation clips as FacePhys. A learned model that does not beat the transparent baseline on BioVision's devices and population has no reason to ship.

### Strong model that cannot be used commercially: Google PHRM-mini

Google's PHRM is the strongest smartphone-specific evidence found. The Nature paper reports development on 192,353 videos from 485 people and validation on 162,546 videos from 211 people. It used 8-second clips resampled to 15 fps, a 32 by 32 face representation, motion stabilization, confidence gating, ECG reference measurements, and explicit testing across three skin-pigmentation groups.[^10]

The associated PHRM-mini checkpoint is not eligible for BioVision. Google's release states that the dataset and included model are solely for non-commercial, non-clinical research, require an approved research protocol and academic access, and may not be shared with third parties.[^11] It is valuable as an architecture and validation reference, not as an integration target.

### Why the common academic model zoos are not the default

rPPG-Toolbox is excellent for comparing DeepPhys, TS-CAN, PhysNet, EfficientPhys, PhysFormer, RhythmFormer and related methods. It includes preprocessing, training, evaluation, unsupervised baselines, and released checkpoints.[^12] Its license, however, is a Responsible AI license rather than a standard permissive open-source license. It prohibits diagnosis without human oversight and requires restrictions to flow down to users and derivatives.[^13] Whether a particular pre-screening implementation fits those terms is a legal and product question, so it is not the simplest commercially clean dependency.

`open-rppg` is easier to call and places its source under MIT, but its own README says pretrained models and configurations remain subject to the rights of their original authors.[^14] A single MIT badge on the wrapper therefore does not establish permission to ship every included checkpoint.

Google PHRM, rPPG-Toolbox, open-rppg, and pyVHR are still valuable in an offline evaluation environment. They should not be copied directly into the production app until the license of the exact code, checkpoint, preprocessing assets, and dataset-derived restrictions has been recorded.

### Markers that should stay out of the free build

**Blood pressure.** Camera BP models are not interchangeable with pulse extraction. Some require personal cuff calibration, demographics, a second pulse site, or fine-tuning on the person being tested. One open reproduction explicitly fine-tunes pretrained networks using part of each test subject's data, which is incompatible with a zero-calibration consumer flow.[^15] The American Heart Association states that cuffless devices are highly susceptible to real-world factors and that current evidence does not support using them for diagnosing or managing hypertension.[^16]

**SpO2.** The identified face-video SpO2 repository provides training notebooks, but its pretrained models must be requested and its datasets carry access restrictions.[^17] Ordinary RGB facial video lacks the controlled wavelengths used by pulse oximeters. No reviewed checkpoint met the commercial, downloadable, and independently validated requirements.

**Glucose and HbA1c.** No credible free RGB-face checkpoint was found. These are not direct outputs of rPPG. Claims that a generic camera waveform can provide glucose should be excluded from the product until supported by prospective clinical evidence and an appropriate regulated model.

**Stress and parasympathetic activity.** These are derived interpretations of HRV and context rather than directly observed camera labels. They are especially sensitive to capture length, activity, breathing, time of day, and individual baseline. BioVision already has validated questionnaire-based wellbeing instruments; facial emotion or short-video "stress" should not replace them.

**BMI, age, smoking, dehydration, and disease risk.** Some commercial SDKs mix camera-derived vitals with user-provided age, sex, height, weight, cholesterol, diabetes, smoking, and treatment status. Shen.AI's own documentation lists those non-image inputs for several risk indices.[^18] Calling the final output a camera prediction would obscure where the data came from.

### Comparison with Shen.AI

Shen.AI documents real-time on-device video analysis for HR, HRV, breathing rate, stress index, parasympathetic activity, cardiac workload, blood pressure, age, and BMI classification, plus risk indices that use additional user inputs.[^19] Its current public pricing lists a no-cost prototype tier of 250 scans per month for heart rate only. HRV and breathing start in a EUR 500/month tier, while blood pressure and broader vitals begin in higher tiers.[^20]

The appropriate free target is therefore not “all Shen markers.” It is the one marker Shen itself places in its free tier: heart rate. An open implementation can add ownership and offline operation, but it does not inherit Shen.AI's certification, clinical studies, capture UI, quality system, or support.

## Anemia from conjunctiva photographs

### Best downloadable candidate: dual-head EfficientNet-B0

`galihkjaya/anemia-palor-detection` is the most practical checkpoint found for a server-side experiment. Its Hugging Face repository is tagged MIT, contains a roughly 21 MB EfficientNet-B0 model, accepts a 224 by 224 RGB palpebral-conjunctiva image, and emits both a binary anemia logit and an estimated haemoglobin value.[^21]

The model card reports training on 710 images from CP-AnemiC, a paediatric Ghana dataset with laboratory-confirmed Hb. It reports 84% accuracy and 0.902 AUC on a 142-image validation split, with anemia recall of 0.78. The Hb head reports MAE 1.515 g/dL and RMSE 2.041 g/dL.[^21] These numbers are internal validation results reported by the uploader. They are not evidence of performance on Indian adults, different phones, or BioVision's bilateral capture protocol. The card itself acknowledges the population gap, small dataset, image-quality sensitivity, and absence of clinical validation.

The model's Hb regression should remain disabled. An error around 1.5 g/dL can cross clinically meaningful thresholds, and a validation-set average does not describe individual limits of agreement. BioVision's safer low/moderate/elevated signal can eventually be calibrated against local outcomes, but it must not be created by arbitrarily mapping this checkpoint's current sigmoid or Hb output.

Before even an internal pilot, verify that the actual checkpoint file matches the documented architecture, load it in an isolated process, scan the pickle-based artifact, pin a SHA-256 digest, preserve its license text, and confirm the CP-AnemiC data terms permit distribution of a derived commercial model. A model-card `license: mit` field is useful evidence, but it is not a substitute for a complete provenance chain.

### Secondary candidate: Eye MedSigLIP linear probe

`Sidharth1743/eye-medsiglip-linear-probe` bundles a frozen MedSigLIP vision encoder, a linear head, scaling statistics, and a threshold configuration. Its model card reports a latest test set of 1,162 images, AUC 0.912, accuracy 0.824, and recall 0.921 at threshold 0.31.[^22] It is labelled Apache-2.0 on Hugging Face, while the upstream MedSigLIP model is governed by Google's Health AI Developer Foundations terms.[^23]

It ranks below the smaller EfficientNet candidate for three reasons. First, the model card gives counts but does not clearly identify the full dataset sources, participant identities, device distribution, or whether related images from one participant are kept in a single split. Image-level leakage can materially inflate medical-image results. Second, the 400 million-parameter MedSigLIP vision encoder is much heavier than EfficientNet-B0 and is unsuitable for a simple React Native bundle without aggressive conversion and performance work.[^23] Third, the result is a self-published linear probe rather than a peer-reviewed external validation.

MedSigLIP itself is a useful foundation model when a team has a legitimate labelled cohort and wants data-efficient training. It is not a magic zero-data anemia classifier. The linear probe is exactly the task-specific component that still depends on the quality and representativeness of anemia labels.

### Other anemia leads

**sHEMO** publishes a handcrafted OpenCV pipeline and reports a 65-participant result, including sensitivity of 89% and haemoglobin error of plus or minus 0.32 g/dL.[^24] The repository has no detected license and no production checkpoint. Its README also overstates the method as a replacement for blood testing. Lack of permission and narrow evidence make it unsuitable for commercial integration.

**Student and notebook repositories** commonly include copied image folders, train/test notebooks, or generated application scaffolds without patient provenance, exact CBC timing, participant-disjoint splits, model calibration, or an explicit license. A model file being downloadable is not enough to support either commercial use or a health claim.

**Segmentation-only models** can help isolate conjunctiva but cannot predict anemia by themselves. The reviewed sclera and eye-segmentation networks were primarily trained for biometric recognition, iris segmentation, gaze tracking, or different camera geometry. BioVision's guided lower-eyelid capture is materially different. A small locally labelled conjunctiva mask set may eventually be needed even if the classifier is reused.

### Why local validation is unavoidable

Conjunctival pallor has biological plausibility, but visual pallor alone is an imperfect screening sign. A meta-analysis of paediatric clinical examination found no highly accurate single pallor sign and highlighted heterogeneity by observer, haemoglobin method, population, and phenotype.[^25] In a 390-person adult study, observer agreement for conjunctival pallor was poor.[^26] A camera may quantify colour more consistently than a person, but it does not remove lighting, auto-white-balance, sensor, ethnicity, age, disease-spectrum, or label-timing effects.

BioVision does not necessarily need a large new training programme before learning anything. It does need an evaluation cohort. The minimum defensible study pairs each consented eye capture with a same-day laboratory CBC/Hb, keeps every image from one participant in one split, records phone model and lighting, includes relevant age and sex groups, and reports sensitivity, specificity, ROC-AUC, calibration, failure rate, and subgroup results with confidence intervals. If the candidate fails, those data can later support calibration or fine-tuning; if it succeeds, they provide the evidence needed to decide whether integration is responsible.

## Still-photo appearance models

### No qualified all-in-one model

No reviewed pretrained checkpoint can validly infer BioVision's desired systemic interpretations from a normal selfie. The visual observations and possible causes must remain separate:

| Visible property that a camera may describe | Interpretation it must not make from the image alone |
|---|---|
| Under-eye colour contrast | anemia, sleep deprivation, thyroid disease, allergy, or nutritional deficiency |
| Lip-to-skin contrast | smoking, dehydration, vitamin deficiency, or adrenal disease |
| Local red-looking patches | acne, infection, rosacea, allergy, or urgency |
| Eye-white redness | specific eye disease, blood pressure, fatigue, or intoxication |
| Scleral yellow colour | bilirubin level, liver disease, or a jaundice diagnosis |
| Apparent puffiness or asymmetry | edema, kidney disease, allergy, or fluid status |
| Texture in a compressed selfie | instrument-measured hydration or transepidermal water loss |

BioVision's existing labels such as “under-eye contrast noticed” and “eye-white redness noticed” are therefore closer to what the pixels support than disease names would be.

### Glowlytics: downloadable but unsuitable labels

The Glowlytics model card is unusually explicit. It provides a 0.6 MB ONNX model for four selfie scores and a 43 MB acne detector. The skin-score network was trained by knowledge distillation from Claude Sonnet 4 labels on 4,717 UTKFace and FFHQ images.[^27] Those are AI-generated opinions about appearance, not measurements from a corneometer, dermatologist, bilirubin assay, or clinical diagnosis. A high reported correlation with the teacher labels measures imitation of the teacher, not validity against a physiological ground truth.

UTKFace and FFHQ provenance also raises a separate commercial-rights question even though the model repository is tagged MIT. This checkpoint should not replace BioVision's conservative rules or be described as detecting hydration, sun damage, or elasticity.

### Face parsing and sclera segmentation

Face parsing can improve the geometry of skin, lip, and eye masks. Popular BiSeNet weights are trained on CelebAMask-HQ, whose published use terms are non-commercial research and education.[^28] Permissively licensed inference code does not erase that training-data restriction. MediaPipe Face Landmarker is already bundled in BioVision and provides adequate geometry for the current observation stage without adding this uncertainty.

Sclera-TransFuse provides test code and checkpoint links for sclera segmentation on a 683-image UBIRIS.v2 subset, but it describes the code as unfinished and is designed for sclera segmentation/recognition rather than redness or jaundice.[^29] RITNet implementations target eye-tracking imagery, often near-infrared head-mounted cameras. Their mask quality on a consumer lower-eyelid photograph is unknown.

Segmentation would still be useful in a later pipeline: isolate visible sclera or palpebral conjunctiva first, reject small/occluded regions, then calculate calibrated colour features or run a validated classifier. It is a quality component, not a diagnosis.

### Dark circles, acne, jaundice, and edema

Dark-circle checkpoints found through model marketplaces and small repositories generally lack clinical ground truth, commercial provenance, or independent validation. A Roboflow project advertising a CC BY 4.0 dark-circle detector is a cosmetic object detector with 1,114 images, not a health model.[^30] It may draw a box around under-eye appearance but cannot establish cause, severity, or care need.

Acne and dermatology models are frequently trained on close-up clinical or lesion images, not full-face selfies. Even a valid lesion classifier would expand BioVision beyond its current approved disease scope. The same is true for melanoma and general skin-disease models; they are not substitutes for a visible-cue module.

Jaundice work often targets neonates, uses colour calibration cards, isolates sclera under controlled acquisition, or does not release a commercially cleared checkpoint. No reviewed adult-selfie model met the required license and evidence bar. Yellow-looking sclera is particularly sensitive to warm lighting and white balance, so a naive colour threshold can create harmful reassurance or alarm.

Facial edema research exists, including before/after dialysis models, but those systems depend on a personal baseline and a specific clinical population.[^31] A generic one-selfie swelling classifier was not found. The feature should remain unassessed unless BioVision later supports a consented longitudinal comparison designed for that purpose.

## Proposed BioVision architecture

### Phase 0: preserve current safe behaviour

- Keep the production anemia registry on `UnavailableAnemiaModel`.
- Keep appearance outputs descriptive and independent of questionnaire urgency.
- Keep every model output able to abstain.
- Record exact provider, model version, threshold version, input quality, and reason for abstention.

### Phase 1: web-only pulse experiment

Add a separate, explicit “experimental camera pulse” flow rather than silently reusing the still-photo scan. The flow should:

1. explain that the camera will process a short live sequence locally;
2. request explicit measurement consent;
3. hold a stable face under even light for 20-30 seconds;
4. keep raw frames in memory only and never upload or persist them;
5. collect timestamps, face box, pose/motion indicators, illumination indicators, BVP, and model SQI;
6. return unavailable when quality is insufficient;
7. show a rounded HR result and quality, with no diagnosis or normal/abnormal judgment; and
8. discard the frame buffer at completion, cancellation, backgrounding, navigation, or error.

The current React web build can integrate a browser SDK directly. The native app cannot assume browser Workers, DOM video elements, or WebAssembly behave identically. Native implementation would require a tested bridge or port using VisionCamera frames and an on-device runtime. Because BioVision already includes React Native Vision Camera, a native frame pipeline is technically possible, but it should follow the web pilot only after model conversion and device benchmarks.

Run the POS baseline and FacePhys candidate on the same clips offline. A pilot acceptance gate should include measurement coverage as well as error: a system that is accurate only after rejecting most darker-skin, low-cost-phone, or low-light captures is not acceptable.

### Phase 2: offline anemia bake-off

Build an evaluation adapter around the existing Python protocol, isolated from the user-facing registry:

```text
left eye + right eye
        |
        v
decode and EXIF orientation
        |
        v
quality checks -> abstain on blur, glare, clipping, or inadequate conjunctiva
        |
        v
candidate model scores each eye independently
        |
        v
evaluation record only: scores, model hash, quality, CBC/Hb reference
```

Do not invent a bilateral fusion rule before evaluation. Comparing left score, right score, mean, maximum, disagreement, and quality-weighted combinations on a held-out participant set will show whether two images help. Thresholds must be selected on a validation set and frozen before the test set is examined.

The first comparison should include the dual-head EfficientNet classifier score, the MedSigLIP probe score if its provenance is clarified, and a simple colour-feature baseline. The goal is not to select the model with the highest uploaded AUC; it is to find the approach that remains calibrated and usable on BioVision's actual capture conditions.

### Phase 3: guarded product integration

Only after the acceptance gates pass should a candidate replace `UnavailableAnemiaModel`. The product adapter should:

- verify file hashes at startup;
- load with a safe tensor format or a tightly controlled PyTorch environment;
- implement deterministic preprocessing matching the evaluated version;
- treat quality failure and model exceptions as `unavailable`;
- return the existing low/moderate/elevated vocabulary rather than raw Hb or disease probability;
- keep internal confidence out of user copy;
- record versioned audit metadata without retaining the image unless separate research consent applies; and
- never allow the image score to suppress urgent symptom guidance.

## Validation gates

### Pulse pilot

The reference should be synchronized ECG or a validated contact PPG device. Test at rest and after mild activity, across several lighting levels, supported phone models, glasses, facial hair, motion, and a deliberately broad range of objectively measured or consistently classified skin tones. Predefine:

- mean absolute error and mean absolute percentage error;
- Bland-Altman bias and limits of agreement;
- valid-measurement coverage and rejection reasons;
- time to first stable result;
- performance by phone, lighting, motion, pulse range, age, sex, and skin tone; and
- battery, thermal, dropped-frame, and crash behaviour.

An average error without coverage and subgroup results is insufficient. Google's PHRM work is a useful template because it combines an error target with confidence gating and skin-tone non-inferiority testing.[^10]

### Anemia pilot

Use same-day laboratory Hb as the reference. Define the intended population and threshold before collecting results. Report:

- participant count as well as image count;
- sensitivity and specificity with confidence intervals;
- positive and negative predictive values at the study prevalence;
- ROC-AUC and precision-recall AUC;
- calibration curve and Brier score;
- failure/abstention rate;
- results by age, sex, skin tone, phone model, lighting, and relevant clinical subgroup;
- bilateral disagreement; and
- decision-curve or referral burden at the proposed operating point.

All images from one participant must stay together. If multiple crops or augmentations from the same eye appear across train and test, the estimate is invalid for product selection.

## Effort and integration ranking

| Work item | Initial engineering effort | New labelled training data | Validation data | Expected product value |
|---|---:|---:|---:|---|
| Browser HR using Vital Camera SDK | Low to medium | None | Required | High for a visible demo; moderate clinically |
| POS baseline in offline evaluator | Low | None | Required | High as a sanity check |
| Native HR port | High | None if weights remain compatible | Required on every supported device class | Medium to high |
| EfficientNet anemia adapter | Low to medium | None for initial bake-off | Essential | Potentially high if it generalizes |
| MedSigLIP anemia adapter | Medium to high | None for bake-off | Essential | Unclear relative to its size |
| More facial appearance classifiers | Medium | Usually required | Essential and feature-specific | Low under current product scope |
| Free camera BP/SpO2/glucose | Very high | Yes, with clinical references | Extensive | Do not pursue for MVP |

## Recommended next implementation ticket

Create a non-production feature flag named `experimentalCameraPulse`. On web only, integrate the pinned heart-rate subset of Vital Camera SDK under its local-processing license. Add an explicit video-measurement consent screen, a 30-second capture state machine, motion/lighting/SQI rejection, and a result object containing `status`, rounded `heartRateBpm`, `quality`, `durationMs`, `provider`, and `modelVersion`. Never persist or upload video. Leave HRV and every other marker disabled.

In parallel at the engineering level, create an offline anemia evaluation command that invokes candidate adapters without registering either one in production. It should accept a manifest of bilateral images and reference Hb values, enforce participant-grouped splits, and emit a versioned metrics file. This does not require training a new model; it establishes whether either free checkpoint is usable before product integration.

## Sources

[^1]: FacePhys, “[FacePhys SDKs](https://github.com/FacePhys/FacePhys),” mobile on-device integration notes, accessed 11 September 2026.
[^2]: *npj Digital Medicine*, “[The reliability of remote photoplethysmography under low illumination and elevated heart rates](https://doi.org/10.1038/S41746-025-02192-Y),” 2025.
[^3]: *Journal of Clinical Monitoring and Computing*, “[Effectiveness of consumer-grade contactless vital signs monitors: a systematic review and meta-analysis](https://pmc.ncbi.nlm.nih.gov/articles/PMC8266631/),” 2021.
[^4]: Kegang Wang, “[Vital Camera SDK](https://github.com/KegangWangCCNU/vitalcamera-sdk),” GitHub repository and included model inventory, accessed 11 September 2026.
[^5]: Kegang Wang, “[FacePhys Demo](https://github.com/KegangWangCCNU/FacePhys-Demo),” GitHub repository, accessed 11 September 2026.
[^6]: Kegang Wang, “[FacePhys Demo License](https://github.com/KegangWangCCNU/FacePhys-Demo/blob/main/LICENSE),” MIT License with Privacy Protection Addendum, 2025.
[^7]: Wang et al., “[FacePhys: State of the Heart Learning](https://arxiv.org/abs/2512.06275),” arXiv:2512.06275, 2025.
[^8]: Rouast Labs, “[VitalLens Python](https://github.com/Rouast-Labs/vitallens-python),” local POS and API-backed modes, accessed 11 September 2026.
[^9]: PHuSe Lab, “[pyVHR](https://github.com/phuselab/pyVHR),” GPL-3.0 Python framework for rPPG, accessed 11 September 2026.
[^10]: Liao et al., “[Passive heart-rate monitoring during smartphone use in everyday life](https://www.nature.com/articles/s41586-026-10507-6),” *Nature* 655, 728-736, 2026.
[^11]: Google Health, “[Google Heart Rate Measurement Study Dataset and PHRM-mini terms](https://github.com/Google-Health/consumer-health-research/tree/main/rppg),” accessed 11 September 2026.
[^12]: Liu et al., “[rPPG-Toolbox: Deep Remote PPG Toolbox](https://arxiv.org/abs/2210.00716),” NeurIPS Datasets and Benchmarks, 2023; [repository](https://github.com/ubicomplab/rPPG-Toolbox).
[^13]: UW Ubicomp Lab, “[rPPG-Toolbox Responsible AI Source Code License](https://github.com/ubicomplab/rPPG-Toolbox/blob/main/LICENSE),” version 1.1.
[^14]: Kegang Wang, “[open-rppg](https://github.com/KegangWangCCNU/open-rppg),” licensing section, accessed 11 September 2026.
[^15]: Schrumpf et al., “[Assessment of non-invasive blood pressure prediction from PPG and rPPG signals using deep learning](https://github.com/Rochesterzcc/BP-rPPG-PPG),” CVPR Workshops, 2021.
[^16]: American Heart Association, “[Cuffless Devices for the Measurement of Blood Pressure](https://professional.heart.org/en/science-news/cuffless-devices-for-the-measurement-of-blood-pressure),” scientific statement summary, updated 11 December 2025.
[^17]: Hamoud et al., “[Contactless Oxygen Saturation Detection Based on Face Analysis](https://github.com/BatolHamoud443/Contactless-Oxygen-Saturation-Detection-Based-on-Face-Analysis),” GitHub repository and checkpoint-access notice, accessed 11 September 2026.
[^18]: Shen.AI, “[Health Indices Overview](https://developer.shen.ai/health-indices/overview),” input requirements for wellness and risk indices, accessed 11 September 2026.
[^19]: Shen.AI, “[SDK Documentation](https://developer.shen.ai/),” supported video-derived metrics and platforms, accessed 11 September 2026.
[^20]: Shen.AI, “[Pricing](https://shen.ai/pricing),” public plans and free HR allowance, accessed 11 September 2026.
[^21]: Galih K. Jaya, “[Explainable Dual-Head EfficientNet-B0 for Anemia Detection](https://huggingface.co/galihkjaya/anemia-palor-detection),” Hugging Face model card, accessed 11 September 2026; Appiahene et al., “[CP-AnemiC](https://doi.org/10.1016/J.MEDNTD.2023.100244),” *Medicine in Novel Technology and Devices* 18, 2023.
[^22]: Sidharthan, “[Eye MedSigLIP Linear Probe](https://huggingface.co/Sidharth1743/eye-medsiglip-linear-probe),” Hugging Face model card, accessed 11 September 2026.
[^23]: Google, “[MedSigLIP model card](https://huggingface.co/google/medsiglip-448)” and “[Health AI Developer Foundations](https://developers.google.com/health-ai-developer-foundations),” accessed 11 September 2026.
[^24]: Ghosal et al., “[sHEMO: Smartphone Spectroscopy for Blood Hemoglobin Level Monitoring in Smart Anemia-Care](https://github.com/sagnikgh1899/sHEMO),” IEEE Sensors Journal 21(6), 2021.
[^25]: Chalco et al., “[Accuracy of clinical pallor in the diagnosis of anaemia in children: a meta-analysis](https://pubmed.ncbi.nlm.nih.gov/16336667/),” *BMC Pediatrics* 5, 2005.
[^26]: Kalantri et al., “[Accuracy and reliability of pallor for detecting anaemia](https://pubmed.ncbi.nlm.nih.gov/20049324/),” *PLOS ONE* 5(1), 2010.
[^27]: Mufasabrownie, “[Glowlytics Skin Analysis Models](https://huggingface.co/mufasabrownie/glowlytics-skin-models),” Hugging Face model card, accessed 11 September 2026.
[^28]: Lee et al., “[HandsOff supplemental material](https://openaccess.thecvf.com/content/CVPR2023/supplemental/Xu_HandsOff_Labeled_Dataset_CVPR_2023_supplemental.pdf),” license table identifying CelebAMask-HQ as non-commercial research/education, CVPR 2023.
[^29]: Li et al., “[Sclera-TransFuse](https://github.com/lhqqq/Sclera-TransFuse),” GitHub repository, accessed 11 September 2026.
[^30]: Sedanur Yilmaz, “[Dark Circles Object Detection Model](https://universe.roboflow.com/sedanur-ylmaz/dark-circles-19mqw-uvedb),” Roboflow Universe, accessed 11 September 2026.
[^31]: Yu et al., “[Edema Estimation From Facial Images Taken Before and After Dialysis](https://arxiv.org/abs/2212.07582),” arXiv:2212.07582, 2022.
