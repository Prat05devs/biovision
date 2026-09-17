from __future__ import annotations

import hashlib
import json
import os
import sqlite3
import tempfile
from dataclasses import dataclass
from datetime import UTC, datetime
from pathlib import Path
from uuid import uuid4


@dataclass(frozen=True)
class StoredCapture:
    capture_id: str
    sha256: str
    object_key: str
    byte_count: int
    duplicate: bool


@dataclass(frozen=True)
class StoredQuestionnaire:
    response_id: str
    sha256: str
    duplicate: bool


class CaptureStore:
    """Local durable adapter used in development and single-node deployments.

    Original image bytes live in object-like filesystem storage; SQLite stores
    immutable provenance and consent metadata. Production can replace this
    adapter with encrypted object storage and PostgreSQL without changing the
    API contract.
    """

    def __init__(self, storage_root: Path, db_path: Path) -> None:
        self.storage_root = storage_root
        self.db_path = db_path
        self.storage_root.mkdir(parents=True, exist_ok=True)
        self.db_path.parent.mkdir(parents=True, exist_ok=True)
        self._initialize()

    def _connect(self) -> sqlite3.Connection:
        connection = sqlite3.connect(self.db_path)
        connection.row_factory = sqlite3.Row
        connection.execute("PRAGMA foreign_keys = ON")
        connection.execute("PRAGMA journal_mode = WAL")
        return connection

    def _initialize(self) -> None:
        with self._connect() as connection:
            connection.executescript(
                """
                CREATE TABLE IF NOT EXISTS research_consents (
                    id TEXT PRIMARY KEY,
                    session_id TEXT NOT NULL,
                    purpose TEXT NOT NULL,
                    version TEXT NOT NULL,
                    granted_at TEXT NOT NULL,
                    recorded_at TEXT NOT NULL,
                    UNIQUE(session_id, purpose, version)
                );

                CREATE TABLE IF NOT EXISTS captures (
                    id TEXT PRIMARY KEY,
                    session_id TEXT NOT NULL,
                    modality TEXT NOT NULL CHECK(modality IN ('face_neck', 'eye_closeup')),
                    anatomical_side TEXT NOT NULL DEFAULT 'not_applicable'
                        CHECK(anatomical_side IN ('left', 'right', 'not_applicable')),
                    object_key TEXT NOT NULL UNIQUE,
                    sha256 TEXT NOT NULL,
                    byte_count INTEGER NOT NULL CHECK(byte_count > 0),
                    mime_type TEXT NOT NULL,
                    width INTEGER NOT NULL CHECK(width > 0),
                    height INTEGER NOT NULL CHECK(height > 0),
                    captured_at TEXT NOT NULL,
                    ingested_at TEXT NOT NULL,
                    protocol_version TEXT NOT NULL,
                    source_platform TEXT NOT NULL,
                    quality_json TEXT NOT NULL,
                    consent_id TEXT NOT NULL REFERENCES research_consents(id),
                    label_status TEXT NOT NULL DEFAULT 'unlabelled',
                    UNIQUE(session_id, modality, anatomical_side, sha256)
                );

                CREATE INDEX IF NOT EXISTS captures_session_idx ON captures(session_id);
                CREATE INDEX IF NOT EXISTS captures_modality_idx ON captures(modality);
                CREATE INDEX IF NOT EXISTS captures_sha_idx ON captures(sha256);

                CREATE TABLE IF NOT EXISTS questionnaire_responses (
                    id TEXT PRIMARY KEY,
                    session_id TEXT NOT NULL,
                    question_bank_version TEXT NOT NULL,
                    started_at TEXT NOT NULL,
                    completed_at TEXT NOT NULL,
                    answer_events_json TEXT NOT NULL,
                    sha256 TEXT NOT NULL,
                    consent_id TEXT NOT NULL REFERENCES research_consents(id),
                    recorded_at TEXT NOT NULL,
                    UNIQUE(session_id, question_bank_version, sha256)
                );

                CREATE INDEX IF NOT EXISTS questionnaire_session_idx
                    ON questionnaire_responses(session_id);
                """
            )
            columns = {
                str(row["name"])
                for row in connection.execute("PRAGMA table_info(captures)").fetchall()
            }
            if "anatomical_side" not in columns:
                connection.execute(
                    "ALTER TABLE captures ADD COLUMN anatomical_side TEXT NOT NULL "
                    "DEFAULT 'not_applicable'"
                )
            connection.execute(
                "CREATE INDEX IF NOT EXISTS captures_side_idx "
                "ON captures(session_id, modality, anatomical_side)"
            )

    def save(
        self,
        *,
        image: bytes,
        session_id: str,
        modality: str,
        anatomical_side: str,
        mime_type: str,
        width: int,
        height: int,
        captured_at: str,
        protocol_version: str,
        source_platform: str,
        quality: dict[str, object],
        consent_version: str,
        consent_granted_at: str,
    ) -> StoredCapture:
        digest = hashlib.sha256(image).hexdigest()
        with self._connect() as connection:
            existing = connection.execute(
                "SELECT id, object_key, byte_count FROM captures "
                "WHERE session_id = ? AND modality = ? AND anatomical_side = ? AND sha256 = ?",
                (session_id, modality, anatomical_side, digest),
            ).fetchone()
            if existing:
                return StoredCapture(
                    capture_id=str(existing["id"]),
                    sha256=digest,
                    object_key=str(existing["object_key"]),
                    byte_count=int(existing["byte_count"]),
                    duplicate=True,
                )

        capture_id = f"capture_{uuid4().hex}"
        consent_id = f"consent_{uuid4().hex}"
        month = datetime.now(UTC).strftime("%Y-%m")
        object_key = f"{month}/{capture_id}.jpg"
        destination = self.storage_root / object_key
        destination.parent.mkdir(parents=True, exist_ok=True)

        file_descriptor, temporary_name = tempfile.mkstemp(
            prefix=f".{capture_id}.", suffix=".tmp", dir=destination.parent
        )
        try:
            with os.fdopen(file_descriptor, "wb") as temporary_file:
                temporary_file.write(image)
                temporary_file.flush()
                os.fsync(temporary_file.fileno())
            os.replace(temporary_name, destination)

            ingested_at = datetime.now(UTC).isoformat()
            with self._connect() as connection:
                existing_consent = connection.execute(
                    "SELECT id FROM research_consents "
                    "WHERE session_id = ? AND purpose = ? AND version = ?",
                    (session_id, "model_research", consent_version),
                ).fetchone()
                if existing_consent:
                    consent_id = str(existing_consent["id"])
                else:
                    connection.execute(
                        "INSERT INTO research_consents "
                        "(id, session_id, purpose, version, granted_at, recorded_at) "
                        "VALUES (?, ?, ?, ?, ?, ?)",
                        (
                            consent_id,
                            session_id,
                            "model_research",
                            consent_version,
                            consent_granted_at,
                            ingested_at,
                        ),
                    )
                connection.execute(
                    "INSERT INTO captures "
                    "(id, session_id, modality, anatomical_side, object_key, sha256, byte_count, mime_type, "
                    "width, height, captured_at, ingested_at, protocol_version, source_platform, "
                    "quality_json, consent_id) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)",
                    (
                        capture_id,
                        session_id,
                        modality,
                        anatomical_side,
                        object_key,
                        digest,
                        len(image),
                        mime_type,
                        width,
                        height,
                        captured_at,
                        ingested_at,
                        protocol_version,
                        source_platform,
                        json.dumps(quality, sort_keys=True, separators=(",", ":")),
                        consent_id,
                    ),
                )
        except Exception:
            Path(temporary_name).unlink(missing_ok=True)
            destination.unlink(missing_ok=True)
            raise

        return StoredCapture(capture_id, digest, object_key, len(image), False)

    def save_questionnaire(
        self,
        *,
        session_id: str,
        question_bank_version: str,
        started_at: str,
        completed_at: str,
        answer_events: list[dict[str, object]],
        consent_version: str,
        consent_granted_at: str,
    ) -> StoredQuestionnaire:
        canonical_events = json.dumps(answer_events, sort_keys=True, separators=(",", ":"))
        digest = hashlib.sha256(canonical_events.encode("utf-8")).hexdigest()
        recorded_at = datetime.now(UTC).isoformat()
        with self._connect() as connection:
            existing = connection.execute(
                "SELECT id FROM questionnaire_responses "
                "WHERE session_id = ? AND question_bank_version = ? AND sha256 = ?",
                (session_id, question_bank_version, digest),
            ).fetchone()
            if existing:
                return StoredQuestionnaire(str(existing["id"]), digest, True)

            consent = connection.execute(
                "SELECT id FROM research_consents "
                "WHERE session_id = ? AND purpose = ? AND version = ?",
                (session_id, "model_research", consent_version),
            ).fetchone()
            if consent:
                consent_id = str(consent["id"])
            else:
                consent_id = f"consent_{uuid4().hex}"
                connection.execute(
                    "INSERT INTO research_consents "
                    "(id, session_id, purpose, version, granted_at, recorded_at) "
                    "VALUES (?, ?, ?, ?, ?, ?)",
                    (
                        consent_id,
                        session_id,
                        "model_research",
                        consent_version,
                        consent_granted_at,
                        recorded_at,
                    ),
                )
            response_id = f"questionnaire_{uuid4().hex}"
            connection.execute(
                "INSERT INTO questionnaire_responses "
                "(id, session_id, question_bank_version, started_at, completed_at, "
                "answer_events_json, sha256, consent_id, recorded_at) "
                "VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)",
                (
                    response_id,
                    session_id,
                    question_bank_version,
                    started_at,
                    completed_at,
                    canonical_events,
                    digest,
                    consent_id,
                    recorded_at,
                ),
            )
        return StoredQuestionnaire(response_id, digest, False)
