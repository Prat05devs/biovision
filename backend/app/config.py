from __future__ import annotations

import os
from dataclasses import dataclass
from pathlib import Path


@dataclass(frozen=True)
class Settings:
    environment: str
    allowed_origins: tuple[str, ...]
    max_capture_bytes: int
    model_version: str | None
    anemia_model_path: Path
    anemia_model_config_path: Path


def load_settings() -> Settings:
    repository_root = Path(__file__).resolve().parents[2]
    origins = tuple(
        origin.strip()
        for origin in os.getenv("BIOVISION_ALLOWED_ORIGINS", "http://localhost:8081").split(",")
        if origin.strip()
    )
    return Settings(
        environment=os.getenv("BIOVISION_ENV", "development"),
        allowed_origins=origins,
        max_capture_bytes=int(os.getenv("BIOVISION_MAX_CAPTURE_BYTES", str(15 * 1024 * 1024))),
        model_version=os.getenv("BIOVISION_ANEMIA_MODEL_VERSION"),
        anemia_model_path=Path(
            os.getenv(
                "BIOVISION_ANEMIA_MODEL_PATH",
                str(repository_root / "ml/models/anemia-palor-detection/model.pt"),
            )
        ),
        anemia_model_config_path=Path(
            os.getenv(
                "BIOVISION_ANEMIA_MODEL_CONFIG_PATH",
                str(repository_root / "ml/models/anemia-palor-detection/config.json"),
            )
        ),
    )


settings = load_settings()
