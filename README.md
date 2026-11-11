# Mira Cloud

> **Status: Design / Research only. No implementation has been started.**  
> Design baseline: **v0.4** (2026-11-11).  
> Principle: **One Account, Multiple Runtimes, Shared Work.**

Mira Cloud is the future independent, continuously available agent workspace, growing out of the existing [Cloud Pi](https://github.com/uichat-mira/cloud-pi) runtime. It is **not** a cloud copy of Mira Desktop, an extension of Cloud Auth's database, or a new replacement for established GitHub engineering records.

## Current decisions

- **Identity:** [Cloud Auth](https://github.com/uichat-mira/cloud-auth) remains the unique account, device, authorization and service-credential authority. The independent Mira Cloud Web product will be an OAuth client; its Web OAuth/BFF contract is still a design proposal. The current Cloud Pi operator console may remain inside Cloud Auth.
- **Runtime:** existing Cloud Pi is the prototype for cloud-owned agent runs, scheduling, chat and delivery. Avoid inventing a second execution kernel.
- **Clients:** browser, Mira Mobile (WebView), Mira Desktop (OAuth Cloud Client and separately a local-first Capability Host), and IM channels.
- **Work:** temporary and scheduled tasks, run status, artifacts, memory, skills/MCP, GitHub collaboration, and explicit cross-runtime handoff.
- **Permissions:** same-account sign-in is not tool authority. Desktop-owned runs and files stay local until explicitly shared.
- **UI:** future Web UI aligns with canonical [Mira Mobile design tokens](https://github.com/uichat-mira/mira-mobile/blob/dev/src/theme/tokens.ts). This repository currently contains **no frontend or backend application implementation**.

## Repository governance and environment reality

The working source branch is **`dev`**; ordinary design changes flow through `feat/*` PRs and deliberate `dev → test → prod` source promotions. `main` is a retained bootstrap/history branch and **never means production**. The repository is still **design-only**, so no Mira Cloud runtime is deployed from any branch. In particular, **`dev` and `test` have no configured servers**; do not add fake deployment URLs or claim T4/T5 evidence.

Source validation is `node scripts/check-docs.mjs`, reported as the `Docs Contract` job and the aggregate `Mira Gate` status. These checks validate documentation only, not Agent functionality or deployment. See [environment and promotion contract](docs/engineering/environment.md) and the [organization environment model](https://github.com/uichat-mira/.github/blob/main/docs/engineering/environment-model.md).

GitHub branch protection/Rulesets are not currently available for this private repository under the connected subscription; PR review discipline applies but is not an enforced branch-protection setting.

## Contents

| Path | Purpose |
| --- | --- |
| [`docs/architecture/v0.4.md`](docs/architecture/v0.4.md) | Full product and system architecture proposal; the main design baseline |
| [`docs/product/workbench.md`](docs/product/workbench.md) | User-facing workbench scope and core journeys |
| [`docs/decisions/ADR-001-repository-scope.md`](docs/decisions/ADR-001-repository-scope.md) | Scope and truth-source boundaries for this design phase |
| [`prototypes/workbench-v0.1/`](prototypes/workbench-v0.1/) | Previously created standalone HTML interaction demo, **non-production reference only** |

## What is explicitly **not** authorized by this repository

- No implementation, migration, production deployment or release machinery. **Docs-only CI** is enabled; it is not a runtime test or deploy workflow.
- No GitHub Issues / engineering cards or automatic changes to existing projects merely because they are mentioned in a design.
- No assumption that future API endpoints, OAuth scopes or cross-device capabilities already exist.

## Current source-of-truth links

- [Organization instructions](https://github.com/uichat-mira/.github/blob/main/AGENTS.md)
- [Mira Desktop Phase III product contract](https://github.com/uichat-mira/mira-desktop/issues/315)
- [Cloud Pi product design](https://github.com/uichat-mira/cloud-pi/blob/dev/docs/product-design.md)
- [Cloud Auth OAuth V0 contract](https://github.com/uichat-mira/cloud-auth/blob/dev/docs/oauth-authorization-v0.md)

Design docs are proposals; actual repository code and deployed runtime remain authoritative for implementation state.