from __future__ import annotations

import os
from dataclasses import dataclass
from pathlib import Path


@dataclass(frozen=True)
class Settings:
    environment: str
    allowed_origins: tuple[str, ...]
    max_capture_bytes: int
    clinical_config_version: str
    wellbeing_config_version: str
    support_region: str
    model_version: str | None
    anemia_model_path: Path
    anemia_model_config_path: Path
    config_root: Path
    capture_storage_root: Path
    capture_db_path: Path
    research_collection_enabled: bool


def load_settings() -> Settings:
    backend_root = Path(__file__).resolve().parents[1]
    origins = tuple(
        origin.strip()
        for origin in os.getenv("BIOVISION_ALLOWED_ORIGINS", "http://localhost:8081").split(",")
        if origin.strip()
    )
    return Settings(
        environment=os.getenv("BIOVISION_ENV", "development"),
        allowed_origins=origins,
        max_capture_bytes=int(os.getenv("BIOVISION_MAX_CAPTURE_BYTES", str(15 * 1024 * 1024))),
        clinical_config_version="assessment-branching-draft-v2",
        wellbeing_config_version="wellbeing-stepped-screen-v1",
        support_region=os.getenv("BIOVISION_SUPPORT_REGION", "IN"),
        model_version=os.getenv("BIOVISION_ANEMIA_MODEL_VERSION"),
        anemia_model_path=Path(
            os.getenv(
                "BIOVISION_ANEMIA_MODEL_PATH",
                str(Path(__file__).resolve().parents[2] / "ml/models/anemia-palor-detection/model.pt"),
            )
        ),
        anemia_model_config_path=Path(
            os.getenv(
                "BIOVISION_ANEMIA_MODEL_CONFIG_PATH",
                str(Path(__file__).resolve().parents[2] / "ml/models/anemia-palor-detection/config.json"),
            )
        ),
        config_root=Path(
            os.getenv(
                "BIOVISION_CONFIG_ROOT",
                str(Path(__file__).resolve().parents[2] / "configs"),
            )
        ),
        capture_storage_root=Path(
            os.getenv("BIOVISION_CAPTURE_STORAGE_ROOT", str(backend_root / ".data" / "captures"))
        ),
        capture_db_path=Path(
            os.getenv("BIOVISION_CAPTURE_DB_PATH", str(backend_root / ".data" / "biovision.db"))
        ),
        research_collection_enabled=os.getenv(
            "BIOVISION_RESEARCH_COLLECTION_ENABLED", "false"
        ).lower() in {"1", "true", "yes"},
    )


settings = load_settings()
