# Mira Cloud

> **Status: Design / Research only. No implementation has been started.**  
> Design baseline: **product architecture v0.4** and **technology ADR-003** (2026-11-11).  
> Principle: **One Account, Multiple Runtimes, Shared Work.**

Mira Cloud is the future independent, continuously available agent workspace, growing out of the existing [Cloud Pi](https://github.com/uichat-mira/cloud-pi) runtime. It is **not** a cloud copy of Mira Desktop, an extension of Cloud Auth's database, or a new replacement for established GitHub engineering records.

## Current decisions

- **Identity:** [Cloud Auth](https://github.com/uichat-mira/cloud-auth) remains the unique account, device, authorization and service-credential authority. The independent Mira Cloud Web product will be an OAuth client; its Web OAuth/BFF contract is still a design proposal. The current Cloud Pi operator console may remain inside Cloud Auth.
- **Runtime:** existing Cloud Pi is the prototype for cloud-owned agent runs, scheduling, chat and delivery. Avoid inventing a second execution kernel.
- **Clients:** browser, Mira Mobile (WebView), Mira Desktop (OAuth Cloud Client and separately a local-first Capability Host), and IM channels.
- **Work:** temporary and scheduled tasks, run status, artifacts, memory, skills/MCP, GitHub collaboration, and explicit cross-runtime handoff.
- **Permissions:** same-account sign-in is not tool authority. Desktop-owned runs and files stay local until explicitly shared.
- **UI:** future Web UI aligns with canonical [Mira Mobile design tokens](https://github.com/uichat-mira/mira-mobile/blob/dev/src/theme/tokens.ts). This repository currently contains **no frontend or backend application implementation**.

## Open-source license

Mira Cloud is **publicly available under the [MIT License](LICENSE)**. Contributions must respect third-party license and privacy boundaries; product design docs and mock interfaces are not proof of running cloud services.

## Repository governance and environment reality

The working source branch is **`dev`**; ordinary design changes flow through `feat/*` PRs and deliberate `dev → test → prod` source promotions. `main` is a retained bootstrap/history branch and **never means production**. The repository is still **design-only**, so no Mira Cloud runtime is deployed from any branch. In particular, **`dev` and `test` have no configured servers**; do not add fake deployment URLs or claim T4/T5 evidence.

Source validation is `node scripts/check-docs.mjs`, reported as the `Docs Contract` job and the aggregate `Mira Gate` status. These checks validate documentation only, not Agent functionality or deployment. See [environment and promotion contract](docs/engineering/environment.md) and the [organization environment model](https://github.com/uichat-mira/.github/blob/main/docs/engineering/environment-model.md).

**Public, MIT-licensed:** see [LICENSE](LICENSE). GitHub default branch is `dev`. GitHub-native **`prod` branch protection is active**: PR required, at least one approving review, successful `Mira Gate` required with up-to-date branch, stale reviews dismissed, conversations resolved, administrator enforcement, no force pushes or deletion. This does not imply production deployment.

## Repository automation (limited scope)

- **OpenCode paid Worker:** [Mira External Worker](.github/workflows/mira-external-worker.yml) is a thin caller of an immutable [Organization reusable workflow](https://github.com/uichat-mira/.github/blob/main/.github/workflows/mira-external-worker.yml). It runs **only** when a repository maintainer with verified write access explicitly comments `/worker run` on an eligible open Issue, or manually dispatches that Issue from the default `dev` branch. One Issue is serialized at a time; Worker proposes a **Draft PR into dev**, not a merge or release. The run needs the private Actions secret `AI_PROVIDER_OPENCODE_GO_KEY` to be accessible to this repository. The existence of an org secret grant is **not verified** by committing this workflow. Do not invoke a paid run merely to test enrollment.
- **CodeRabbit:** Already installed at the Organization level and has posted on [this repository's PR #6](https://github.com/uichat-mira/mira-cloud/pull/6). Inherited Organization settings are retained; no repository override or duplicate review workflow is necessary. On the current Free plan, complete reviews can be rate-limited or limited to summaries. CodeRabbit is **advisory**, not Mira Gate or acceptance authority. See the [Organization CodeRabbit integration](https://github.com/uichat-mira/.github/blob/main/ai-review/providers/coderabbit.md).
- **prod source guard:** The [Mira Gate](.github/workflows/mira-gate.yml) checks that a PR into `prod` originates from this repository's `test` branch. **GitHub-native `prod` branch protection is also enabled** and enforces PR approval plus passing `Mira Gate` for merge. The original private-repo 403 is historical; changing to Public enabled protection. No production service is deployed.

No other agent, review provider, server, environment or deployment automation is connected by this change.

## Design system and component plan

- [`DESIGN.md`](DESIGN.md) is the **Mira Cloud Web design-consumption specification**. It inherits the current Mira Mobile Token/palette and `DESIGN.md` owners, including four light/dark presets. This is not an independent token database or an implemented CSS package.
- [Component library contract](docs/design/component-library.md): Tailwind 4, Radix only where appropriate, Lucide, locally owned typed React components. Begin inside the future Web app; **no separate npm component package or frontend scaffold now**.
- The existing [workbench prototype](prototypes/workbench-v0.1/) is mock HTML and predates this specification; it has not been migrated or validated for all themes.

## Technology stack initiative

The [AGT-040 initial technology design work item](https://github.com/uichat-mira/mira-cloud/issues/4) is governed by **[ADR-003 · Hono + Drizzle + PostgreSQL + Docker Compose/Caddy](docs/decisions/ADR-003-hono-drizzle-postgres-deployment.md)** and the [initial technical design](docs/architecture/initial-technical-design.md). **ADR-002 is historical and superseded for Core/database/deployment choices.** Future Web remains React/Vite; existing Cloud Pi owns the Pi SDK runtime; Cloud Auth retains independent Fastify identity services. The [agent/contributor coding standard](docs/engineering/coding-standard.md) describes scoped implementation requirements. These documents are design decisions, **not implemented services**.

## Contents

| Path | Purpose |
| --- | --- |
| [`docs/architecture/v0.4.md`](docs/architecture/v0.4.md) | Product architecture v0.4; follow latest technical ADR for backend/storage choices |
| [`docs/architecture/initial-technical-design.md`](docs/architecture/initial-technical-design.md) | Initial Core API, data, auth and failure semantics design |
| [`docs/decisions/ADR-003-hono-drizzle-postgres-deployment.md`](docs/decisions/ADR-003-hono-drizzle-postgres-deployment.md) | Current preferred technology/deployment decision |
| [`docs/engineering/coding-standard.md`](docs/engineering/coding-standard.md) | Agent/contributor coding and security conventions |
| [`docs/decisions/ADR-002-full-stack-technology.md`](docs/decisions/ADR-002-full-stack-technology.md) | Historical technology decision; superseded for new Core, DB and deployment by ADR-003 |
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