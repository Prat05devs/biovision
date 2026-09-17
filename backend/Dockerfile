# Build from the repository root:
#   docker build -f backend/Dockerfile -t biovision-api .
FROM python:3.12-slim AS runtime

ENV PYTHONDONTWRITEBYTECODE=1 PYTHONUNBUFFERED=1
WORKDIR /app

# OpenCV's headless wheel still needs these shared libraries at runtime.
RUN apt-get update \
  && apt-get install -y --no-install-recommends libglib2.0-0 libgl1 \
  && rm -rf /var/lib/apt/lists/*

COPY backend/pyproject.toml backend/README.md ./
COPY backend/app ./app
COPY configs ./configs
# CPU-only PyTorch keeps the image a fraction of the CUDA build's size.
RUN pip install --no-cache-dir --extra-index-url https://download.pytorch.org/whl/cpu ".[models]"

# Run ml/models/anemia-palor-detection/download.sh first; the weights are not committed.
COPY ml/models/anemia-palor-detection/model.pt ml/models/anemia-palor-detection/config.json ./models/anemia/
RUN echo "8c8d521750f08bb00bc45fd43c914a4980539a40bc418a857e8cf8fd3cdae00e  models/anemia/model.pt" | sha256sum -c -

ENV BIOVISION_ENV=production \
    BIOVISION_CONFIG_ROOT=/app/configs \
    BIOVISION_ANEMIA_MODEL_VERSION=galihkjaya/anemia-palor-detection@5659a76e6d3d \
    BIOVISION_ANEMIA_MODEL_PATH=/app/models/anemia/model.pt \
    BIOVISION_ANEMIA_MODEL_CONFIG_PATH=/app/models/anemia/config.json \
    BIOVISION_CAPTURE_STORAGE_ROOT=/tmp/biovision/captures \
    BIOVISION_CAPTURE_DB_PATH=/tmp/biovision/biovision.db

USER 65532:65532
EXPOSE 8000
HEALTHCHECK --interval=30s --timeout=5s --start-period=60s CMD python -c "import urllib.request; urllib.request.urlopen('http://127.0.0.1:8000/v1/health')"
CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000", "--proxy-headers"]
