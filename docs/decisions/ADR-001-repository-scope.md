# ADR-001 — `mira-cloud` design ownership

- **Status:** Proposed (design phase)
- **Date:** 2026-11-11
- **Decision:** Establish `uichat-mira/mira-cloud` as the **independent Mira Cloud product design home**, initially containing design documents and a labeled interactive reference only.

## Why

The future Mira Cloud is not the Cloud Pi operator console embedded in Cloud Auth. It is its own product, whose Web interface will use Cloud Auth OAuth, whose runtime evolves from Cloud Pi and whose Desktop/Mobile clients have separate identities and authorities. A self-contained design home allows these boundaries to be reviewed before implementation.

## Scope and authority

- Main draft: `docs/architecture/v0.4.md`.
- `cloud-auth` owns identity and authorization implementation.
- `cloud-pi` owns current agent runtime implementation and scheduler truth.
- `mira-desktop` and `mira-mobile` own their local runtime and UX contracts.
- GitHub Issues/Projects/PRs remain engineering records; this design repo does not replace them.
- No frontend/backend implementation, production migration or CI workflow is authorized by this decision.

## Explicitly open

Web OAuth/BFF profile and token lifecycle; Cloud-owned task persistence migration; cross-run handoff details; opt-in memory transfer; cross-node deployment; testable runtime and budget policies.
