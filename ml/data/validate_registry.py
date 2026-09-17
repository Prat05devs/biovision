from __future__ import annotations

import json
from pathlib import Path
from typing import Any

REGISTRY = Path(__file__).with_name("sources") / "registry.json"
REQUIRED_FIELDS = {
    "id",
    "url",
    "population",
    "region",
    "participantKeyAvailable",
    "license",
    "access",
    "commercialUse",
    "approvedUses",
    "notes",
}


def validate(document: dict[str, Any]) -> None:
    if document.get("schemaVersion") != 1:
        raise ValueError("Unsupported data-source registry schema")
    datasets = document.get("datasets")
    if not isinstance(datasets, list) or not datasets:
        raise ValueError("At least one dataset is required")
    identifiers: set[str] = set()
    for dataset in datasets:
        missing = REQUIRED_FIELDS.difference(dataset)
        if missing:
            raise ValueError(f"Dataset is missing fields: {sorted(missing)}")
        identifier = dataset["id"]
        if identifier in identifiers:
            raise ValueError(f"Duplicate dataset id: {identifier}")
        identifiers.add(identifier)
        if dataset["approvedUses"] and dataset["commercialUse"].startswith("blocked"):
            raise ValueError(f"Blocked dataset {identifier} cannot have approved uses")
        if not dataset["participantKeyAvailable"]:
            raise ValueError(f"Dataset {identifier} cannot support leakage-safe patient splits")


if __name__ == "__main__":
    validate(json.loads(REGISTRY.read_text(encoding="utf-8")))
    print(f"Validated {REGISTRY}")

