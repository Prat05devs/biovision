# ADR-001: Ship a safe backend boundary before model inference

- Status: accepted
- Date: 2026-09-07

## Decision

The first production integration provides the real API, deterministic assessment
rules, validation, version stamps, and explicit abstention. The anemia endpoint
returns `unavailable` until a clinically reviewed model artifact is registered.

## Why

This lets the app and backend contract be exercised without presenting a simulated
model score as a health result. Questionnaire context may guide navigation, but it
does not overwrite an unavailable image signal.

## Consequences

The app can run with mocks disabled today, but image-derived screening remains
unavailable. Enabling a model requires prospective validation and an approval record.

