from __future__ import annotations

import json
import os
from typing import Any

from app.config import settings


def load_directory(region_id: str | None = None) -> dict[str, Any]:
    deployment_id = os.getenv("BIOVISION_DEPLOYMENT_ID", "biovision")
    if not deployment_id.replace("-", "").replace("_", "").isalnum():
        raise ValueError("Invalid deployment identifier")
    manifest = json.loads((settings.config_root / "deployments" / f"{deployment_id}.json").read_text())
    selected = region_id or manifest["defaultRegion"]
    region = manifest["regions"].get(selected)
    if region is None:
        raise LookupError("Region is not configured")
    # Resolve files only from the trusted manifest registry, never from URL path input.
    for path in (settings.config_root / "care").glob("*.json"):
        directory = json.loads(path.read_text())
        if directory.get("version") == region["directoryId"]:
            return {"facilities": directory["facilities"], "directoryVersion": directory["version"], "region": selected}
    raise LookupError("No directory is registered for this region")
