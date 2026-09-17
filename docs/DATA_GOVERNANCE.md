# Clinical dataset governance

Raw clinical images, videos, CBC records, access tokens, and signed data-use
agreements must never be committed to this repository.

Before a dataset can enter a training run:

1. Record it in `ml/data/sources/registry.json`.
2. Obtain authoritative licence terms and confirm that the grant covers the intended
   commercial or research use. A third-party mirror's licence label is insufficient.
3. Record ethics/consent scope, storage location, retention period, authorised users,
   attribution requirements, and deletion procedure outside Git.
4. Confirm a stable participant identifier exists and split by participant before any
   image preprocessing or augmentation.
5. Approve a checksum-pinned immutable source version. Generated split manifests may
   be committed only when they contain no personal or re-identifying data.
6. Keep non-commercial datasets physically and logically separated from production
   model training inputs.

Run `npm run data:check` to validate the source registry. An empty `approvedUses`
array means the dataset is quarantined and must not enter an experiment.

