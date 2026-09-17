# BioVision backend

This FastAPI service implements the production API boundary and a deterministic,
auditable assessment engine. It returns an `unavailable` image signal by default and
can explicitly load a pinned experimental EfficientNet anemia checkpoint.

## Run

```bash
cd backend
python3.12 -m venv .venv
. .venv/bin/activate
pip install -e '.[dev,models]'
export BIOVISION_ANEMIA_MODEL_VERSION='galihkjaya/anemia-palor-detection@5659a76e6d3d'
uvicorn app.main:app --reload
```

Set `EXPO_PUBLIC_API_BASE_URL=http://<development-host>:8000` and
`EXPO_PUBLIC_USE_MOCKS=false` in the app environment. A physical phone cannot use
the computer's `localhost`; use the computer's LAN address.

Clinical configuration is versioned in `../configs/`. The current question weights
are explicitly marked as engineering defaults pending clinician approval.

The anemia adapter loads `../ml/models/anemia-palor-detection/model.pt` with
`weights_only=True`, reproduces the upstream HSV crop and ImageNet preprocessing,
averages usable left/right predictions, and returns anemia probability plus estimated
haemoglobin. The model was trained on 710 paediatric samples from Ghana and is not
clinically validated for BioVision's target population.

## Deploy

The iOS app and the web app call the same hosted API, so both get identical anemia results.

```bash
# from the repository root
docker build -f backend/Dockerfile -t biovision-api .
docker run --rm -p 8000:8000 biovision-api
curl http://localhost:8000/v1/health
```

The image installs CPU PyTorch, copies the pinned anemia checkpoint (the build fails if its
SHA-256 differs from the model card), and enables it with `BIOVISION_ANEMIA_MODEL_VERSION`.
Without that variable the API deliberately abstains with `signal: "unavailable"`.

Run it behind HTTPS on any container host (Cloud Run, Fly.io, Render, ECS, a VM with Caddy).
Then set `EXPO_PUBLIC_API_BASE_URL=https://<your-host>` in `.env.production` and, for the web
build, add its origin to `BIOVISION_ALLOWED_ORIGINS`. Native apps do not send an `Origin`
header, so CORS does not affect iOS. Allow at least 2 GB of memory; the model loads when the
container starts, so wait for `/v1/health` before routing traffic.
