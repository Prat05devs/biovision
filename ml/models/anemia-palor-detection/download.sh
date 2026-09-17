#!/usr/bin/env bash
# Downloads the pinned backend checkpoint (not committed) and verifies its SHA-256.
set -euo pipefail
cd "$(dirname "$0")"
curl -fL -o model.pt "https://huggingface.co/galihkjaya/anemia-palor-detection/resolve/5659a76e6d3d42a9059e559f4182e07a7eb6387d/model.pt"
echo "8c8d521750f08bb00bc45fd43c914a4980539a40bc418a857e8cf8fd3cdae00e  model.pt" | shasum -a 256 -c -
