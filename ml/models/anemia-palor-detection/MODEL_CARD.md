# Anemia pallor model artifact

- Source: `https://huggingface.co/galihkjaya/anemia-palor-detection`
- Pinned revision: `5659a76e6d3d42a9059e559f4182e07a7eb6387d`
- Artifact: `model.pt`
- SHA-256: `8c8d521750f08bb00bc45fd43c914a4980539a40bc418a857e8cf8fd3cdae00e`
- Upstream licence declaration: MIT
- Architecture: EfficientNet-B0 with anemia-classification and haemoglobin-regression heads
- Training data stated by the author: CP-AnemiC, 710 paediatric samples from Ghana

The checkpoint is loaded with PyTorch `weights_only=True`. BioVision averages
usable left and right conjunctiva predictions. It abstains when neither image
contains a sufficiently large HSV-detected conjunctiva region.

This artifact has no external clinical validation in BioVision's intended
population. The estimated haemoglobin value is experimental and must not be
presented as a laboratory result.
