# Capture data foundation

## Purpose boundary

Operational screening and research retention are different purposes. Camera
permission permits capture; it does not grant research use. BioVision records
research data only after the optional `research-captures-and-responses-v2` consent is selected
and only when the server-side collection gate is enabled after governance review.
That consent explicitly covers versioned questionnaire responses as well as confirmed
images. Research storage failure never blocks operational screening or care guidance.
Client research submissions run outside the operational screening path. Production must
add a consent-aware encrypted retry queue and visible retention status rather than making
clinical guidance wait on research infrastructure.

## Source-image rule

The originally encoded, highest-quality JPEG is the immutable source record.
Preview layouts use `contain`, never a destructive crop. Future face, neck,
conjunctiva, sclera, or colour-reference regions are derived assets tied back to
the source checksum. Derived crops must never overwrite the source.
The active eye protocol uses a side-specific single-eye guide. A file must not be
treated as a model-ready conjunctiva crop merely because its modality is
`eye_closeup`; automated ROI presence, laterality, glare, exposure, and sharpness
validation remain required before promotion into a training-ready tier.

## Capture record

Each retained image has:

- a server-generated capture identifier;
- pseudonymous session identifier, modality (`face_neck` or `eye_closeup`), and
  anatomical side (`left`, `right`, or `not_applicable`);
- capture and ingestion timestamps;
- protocol version, source platform, dimensions, MIME type, and byte count;
- SHA-256 of the exact original bytes;
- measured quality metadata (unknown measurements remain `unavailable`);
- consent version and grant timestamp;
- an initial `unlabelled` status.

Exact duplicates for a session, modality, and anatomical side are idempotent. Files are written and
fsynced before an atomic rename, then provenance is committed transactionally.

## Storage boundary

The development adapter stores original bytes under `backend/.data/captures` and
metadata in SQLite. Images are not stored as database blobs. Production must use
encrypted object storage, a managed relational database, private networking,
key rotation, access logs, backups, retention/deletion jobs, and a documented
subject withdrawal workflow before collection is enabled.

## Dataset rules before training

- Link CBC/Hb ground truth only through a separately controlled pseudonymous
  participant key; never filenames or names.
- Split train/validation/test by participant, not by image or session.
- Freeze protocol and model versions used for each study cohort.
- Preserve device/exposure/white-balance metadata where the camera API exposes it.
- Track recaptures and both eyes as related observations, not independent people.
- Require a complete left/right pair for anemia inference. Never silently substitute
  one eye, and keep laterality attached to every derived conjunctiva or sclera ROI.
- Keep rejected/low-quality captures with rejection reasons in a quarantined tier
  when consent permits; they are essential for measuring real-world failure rates.
- Do not activate research collection until clinician, ethics, privacy, security,
  retention, and withdrawal procedures have named owners and approval evidence.

## Questionnaire record

Every retained response is an ordered event with question id, typed answer, answer
timestamp, and question-bank version. The server replays the branch tree before
accepting the record; unknown questions, invalid options, skipped-parent answers,
out-of-order events, and incomplete non-emergency questionnaires are rejected. The
stored response receives a SHA-256 integrity hash and remains linked to the same
pseudonymous session and versioned research consent as the images.

Questionnaire output is care-oriented (`no_specific_concern`,
`follow_up_recommended`, or `prompt_medical_review`). These are not disease labels,
and they must not be used as ground-truth anemia labels. CBC/Hb remains the intended
reference standard for anemia model research.
