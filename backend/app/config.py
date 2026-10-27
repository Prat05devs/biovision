from __future__ import annotations

import os
from dataclasses import dataclass
from pathlib import Path
from urllib.parse import urlsplit


@dataclass(frozen=True)
class Settings:
    environment: str
    allowed_origins: tuple[str, ...]
    max_capture_bytes: int
    model_version: str | None
    anemia_model_path: Path
    anemia_model_config_path: Path
    allowed_hosts: tuple[str, ...]
    max_concurrent_screenings: int
    upload_timeout_seconds: float

    @property
    def max_request_bytes(self) -> int:
        # Two images plus bounded multipart/form metadata.
        return 2 * self.max_capture_bytes + 64 * 1024


def load_settings() -> Settings:
    repository_root = Path(__file__).resolve().parents[2]
    origins = tuple(
        origin.strip()
        for origin in os.getenv("BIOVISION_ALLOWED_ORIGINS", "http://localhost:8081").split(",")
        if origin.strip()
    )
    environment = os.getenv("BIOVISION_ENV", "development")
    hosts = tuple(host.strip() for host in os.getenv(
        "BIOVISION_ALLOWED_HOSTS", "localhost,127.0.0.1,testserver"
    ).split(",") if host.strip())
    max_capture_bytes = int(os.getenv("BIOVISION_MAX_CAPTURE_BYTES", str(15 * 1024 * 1024)))
    concurrency = int(os.getenv("BIOVISION_MAX_CONCURRENT_SCREENINGS", "1"))
    timeout = float(os.getenv("BIOVISION_UPLOAD_TIMEOUT_SECONDS", "15"))
    if not 1 <= max_capture_bytes <= 15 * 1024 * 1024:
        raise ValueError("BIOVISION_MAX_CAPTURE_BYTES must be between 1 and 15728640.")
    if not 1 <= concurrency <= 4 or not 0 < timeout <= 60:
        raise ValueError("Screening concurrency must be 1–4 and upload timeout must be 0–60 seconds.")
    if not hosts or any("*" in host or "/" in host or ":" in host for host in hosts):
        raise ValueError("BIOVISION_ALLOWED_HOSTS must contain explicit hostnames, without ports.")
    if environment == "production":
        if not os.getenv("BIOVISION_ALLOWED_HOSTS") or not os.getenv("BIOVISION_ALLOWED_ORIGINS"):
            raise ValueError("Production requires explicit allowed hosts and HTTPS origins.")
        for origin in origins:
            parsed = urlsplit(origin)
            if (parsed.scheme != "https" or not parsed.hostname or parsed.username
                    or parsed.password or parsed.path or parsed.query or parsed.fragment
                    or "*" in origin):
                raise ValueError("Production origins must be exact HTTPS origins without paths.")
        if not origins:
            raise ValueError("Production requires at least one allowed HTTPS origin.")
    return Settings(
        environment=environment,
        allowed_origins=origins,
        max_capture_bytes=max_capture_bytes,
        allowed_hosts=hosts,
        max_concurrent_screenings=concurrency,
        upload_timeout_seconds=timeout,
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
