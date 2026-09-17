"""Verified mental-health support directory.

Only helplines published by a government or equivalent official body are served.
A region with no verified entry returns an empty list so the app can say that
plainly instead of showing a number nobody checked.
"""

from __future__ import annotations

import json
from dataclasses import dataclass
from pathlib import Path
from typing import Any

from app.config import settings


@dataclass(frozen=True)
class SupportResource:
    id: str
    name_key: str
    description_key: str
    phone: str | None
    alternate_phone: str | None
    website: str | None
    operator: str
    availability: str
    cost: str
    kind: str
    verified: bool
    verified_on: str
    source_url: str

    def as_payload(self) -> dict[str, object]:
        return {
            "id": self.id,
            "nameKey": self.name_key,
            "descriptionKey": self.description_key,
            "phone": self.phone,
            "alternatePhone": self.alternate_phone,
            "website": self.website,
            "operator": self.operator,
            "availability": self.availability,
            "cost": self.cost,
            "kind": self.kind,
            "verified": self.verified,
            "verifiedOn": self.verified_on,
            "sourceUrl": self.source_url,
        }


@dataclass(frozen=True)
class SupportRegion:
    code: str
    emergency_number: str | None
    resources: tuple[SupportResource, ...]


def _load(path: Path) -> tuple[str, dict[str, SupportRegion]]:
    document: dict[str, Any] = json.loads(path.read_text(encoding="utf-8"))
    regions: dict[str, SupportRegion] = {}
    for code, raw in document["regions"].items():
        resources: list[SupportResource] = []
        for entry in raw["resources"]:
            if not entry.get("verified"):
                # An unverified entry is dropped at load time rather than served
                # with a flag a caller might ignore.
                continue
            if not entry.get("sourceUrl") or not entry.get("verifiedOn"):
                raise ValueError(f"{entry['id']} is marked verified without provenance")
            resources.append(
                SupportResource(
                    id=str(entry["id"]),
                    name_key=str(entry["nameKey"]),
                    description_key=str(entry["descriptionKey"]),
                    phone=entry.get("phone"),
                    alternate_phone=entry.get("alternatePhone"),
                    website=entry.get("website"),
                    operator=str(entry["operator"]),
                    availability=str(entry["availability"]),
                    cost=str(entry["cost"]),
                    kind=str(entry["kind"]),
                    verified=True,
                    verified_on=str(entry["verifiedOn"]),
                    source_url=str(entry["sourceUrl"]),
                )
            )
        regions[code] = SupportRegion(
            code=code,
            emergency_number=raw.get("emergencyNumber"),
            resources=tuple(resources),
        )
    return str(document["version"]), regions


DIRECTORY_VERSION, REGIONS = _load(
    settings.config_root / "wellbeing" / "support_resources.v1.json"
)


def region(code: str | None = None) -> SupportRegion:
    requested = (code or settings.support_region).upper()
    return REGIONS.get(requested, SupportRegion(requested, None, ()))
