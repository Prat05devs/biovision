# Conjunctiva colour haemoglobin model (v1)

Ridge regression on colour features of the automatically detected conjunctiva region.
Runs on the phone in `modules/biovision-facephys/ios/ConjunctivaAnalyzer.swift`, which computes
the features exactly as `train.py` does (checked to within 0.002 g/dL on identical pixels).

## Data
Eyes-Defy-Anemia (Dimauro et al.), CC BY-SA 4.0: 217 adult lower-eyelid photos with laboratory
haemoglobin — 95 from India, 122 from Italy. Download from Kaggle
(`harshwardhanfartale/eyes-defy-anemia`) and unzip so `eda/dataset anemia/{India,Italy}` exists,
then run `python train.py` from the parent directory of `eda/`.

## Cross-validated performance (5-fold x 20, patient-level)
| | r | MAE g/dL | AUC | Sensitivity | Specificity |
|---|---|---|---|---|---|
| India (95) | 0.64 | 1.32 | 0.71 | 0.71 | 0.59 |
| All (217) | 0.75 | 1.25 | 0.88 | 0.66 | 0.88 |

Sensitivity/specificity use the app's rule: low haemoglobin when the estimate is more than 0.5 g/dL
below the WHO cut-off (12.0 g/dL women, 13.0 g/dL men).

For comparison, the previous EfficientNet checkpoint (trained on Ghanaian children) scored r = 0.05
on the same 95 Indian patients.

## Limits
Training photos were taken with a smartphone and macro attachment under controlled light. Front-camera
photos in the app differ; accuracy should be re-measured on BioVision captures with paired CBC results.
