# Mira Cloud

> **Status: React/Hono/PostgreSQL foundation with a prod-only Tencent delivery path; authenticated Cloud work remains unverified.**
> Design baseline: **product architecture v0.4** and **technology ADR-003** (2026-11-11).  
> Principle: **One Account, Multiple Runtimes, Shared Work.**

Mira Cloud is the future independent, continuously available agent workspace, growing out of the existing [Cloud Pi](https://github.com/uichat-mira/cloud-pi) runtime. It is **not** a cloud copy of Mira Desktop, an extension of Cloud Auth's database, or a new replacement for established GitHub engineering records.

## Engineering base (implemented)

This repository now has a reproducible **Node 24 / pnpm 10 / TypeScript strict** workspace scaffold. It contains a Hono API, responsive React Web shell and Drizzle/PostgreSQL persistence, plus a **prod-only Tencent deployment path**. This does **not** establish Cloud Auth business login, Cloud Pi execution integration or a live authenticated work product.

Prerequisites: Node.js 24 and Corepack. pnpm is pinned by `packageManager` in `package.json`.

```bash
corepack enable
pnpm install --frozen-lockfile
pnpm check
```

`pnpm check` runs Prettier, ESLint, TypeScript strict checking and Vitest T1 unit tests. Before recursing, it also verifies that every `apps/*` / `packages/*` workspace package declares a runnable `check` script, so a later Web/API package cannot be silently skipped. This covers local unit/source/HTTP testing; the separate required PostgreSQL Integration job establishes real DB T3, never OAuth, Agent execution, hosted T4/T5 or deployment.

The workspace has real Web/API packages and a separate prod-only infrastructure delivery path; design documents and `prototypes/` remain non-runtime references. Verify live deployment and integrations separately.

## Current decisions

- **Identity:** [Cloud Auth](https://github.com/uichat-mira/cloud-auth) remains the unique account, device, authorization and service-credential authority. The independent Mira Cloud Web product will be an OAuth client; its Web OAuth/BFF contract is still a design proposal. The current Cloud Pi operator console may remain inside Cloud Auth.
- **Runtime:** existing Cloud Pi is the prototype for cloud-owned agent runs, scheduling, chat and delivery. Avoid inventing a second execution kernel.
- **Clients:** browser, Mira Mobile (WebView), Mira Desktop (OAuth Cloud Client and separately a local-first Capability Host), and IM channels.
- **Work:** temporary and scheduled tasks, run status, artifacts, memory, skills/MCP, GitHub collaboration, and explicit cross-runtime handoff.
- **Permissions:** same-account sign-in is not tool authority. Desktop-owned runs and files stay local until explicitly shared.
- **UI:** Web consumes the AGT-047 MiraDesign Foundation from pinned [Mira Desktop theme sources](https://github.com/uichat-mira/mira-desktop/blob/dev/desktop/src/shared/theme/colorThemes.ts). The workbench currently uses Fixture views; its legacy Composer Modal does not implement the [reviewed Intelligent UI delegation design](docs/product/delegation-intelligent-ui.md). The prod-only infrastructure path is not proof of authenticated business workflows.

## Open-source license

Mira Cloud is **publicly available under the [MIT License](LICENSE)**. Contributions must respect third-party license and privacy boundaries; product design docs and mock interfaces are not proof of running cloud services.

## Repository governance and environment reality

The working source branch is **`dev`**; ordinary design changes flow through `feat/*` PRs and deliberate `dev → test → prod` source promotions. `main` is a retained bootstrap/history branch and **never means production**. A **prod-only Tencent deployment path** is configured, but source state alone does not prove the deployed version or runtime health. **`dev` and `test` have no configured servers**; do not add fake deployment URLs or claim T4/T5 evidence.

Source validation has three layers: `node scripts/check-docs.mjs` (the `Docs Contract` job) and `pnpm check` (the Node 24 workspace tooling and T1 `Engineering Checks` job). Both are aggregated by the `Mira Gate` status. They validate documentation, source configuration and unit-level tooling only, not Agent functionality or deployment. See [environment and promotion contract](docs/engineering/environment.md) and the [organization environment model](https://github.com/uichat-mira/.github/blob/main/docs/engineering/environment-model.md).

**Public, MIT-licensed:** see [LICENSE](LICENSE). GitHub default branch is `dev`. GitHub-native **`prod` branch protection is active**: PR required, at least one approving review, successful `Mira Gate` required with up-to-date branch, stale reviews dismissed, conversations resolved, administrator enforcement, no force pushes or deletion. This does not imply production deployment.

## Repository automation (limited scope)

- **OpenCode paid Worker:** [Mira External Worker](.github/workflows/mira-external-worker.yml) is a thin caller of an immutable [Organization reusable workflow](https://github.com/uichat-mira/.github/blob/main/.github/workflows/mira-external-worker.yml). It runs **only** when a repository maintainer with verified write access explicitly comments `/worker run` on an eligible open Issue, or manually dispatches that Issue from the default `dev` branch. One Issue is serialized at a time; Worker proposes a **Draft PR into dev**, not a merge or release. The run needs the private Actions secret `AI_PROVIDER_OPENCODE_GO_KEY` to be accessible to this repository. The existence of an org secret grant is **not verified** by committing this workflow. Do not invoke a paid run merely to test enrollment.
- **CodeRabbit:** Already installed at the Organization level and has posted on [this repository's PR #6](https://github.com/uichat-mira/mira-cloud/pull/6). Inherited Organization settings are retained; no repository override or duplicate review workflow is necessary. On the current Free plan, complete reviews can be rate-limited or limited to summaries. CodeRabbit is **advisory**, not Mira Gate or acceptance authority. See the [Organization CodeRabbit integration](https://github.com/uichat-mira/.github/blob/main/ai-review/providers/coderabbit.md).
- **prod source guard:** The [Mira Gate](.github/workflows/mira-gate.yml) checks that a PR into `prod` originates from this repository's `test` branch. **GitHub-native `prod` branch protection is also enabled** and enforces PR approval plus passing `Mira Gate` for merge. The original private-repo 403 is historical; changing to Public enabled protection. No production service is deployed.

No other agent, review provider, server, environment or deployment automation is connected by this change.

## Design system and component plan

- [`DESIGN.md`](DESIGN.md) is the **Mira Cloud Web design-consumption specification**. Mira Desktop shared design assets are the pinned visual/token and generic-component baseline; Mira Mobile contributes responsive/touch/WebView interaction guidance only.
- [MiraDesign component guide](docs/design/mira-design-components.md) and [Web design guidelines](docs/design/mira-design-guidelines.md) are the Cloud-native documentation baseline. The [final cutover matrix](docs/design/mira-design-cutover.md) covers the full pinned Desktop shared-UI inventory and records migrated, adapted, consolidated, deferred and excluded outcomes. No independently published npm component library.
- The existing [workbench prototype](prototypes/workbench-v0.1/) is mock HTML and predates this specification; it has not been migrated or validated for all themes.

## Technology stack initiative

The [AGT-040 initial technology design work item](https://github.com/uichat-mira/mira-cloud/issues/4) is governed by **[ADR-003 · Hono + Drizzle + PostgreSQL + Docker Compose/Caddy](docs/decisions/ADR-003-hono-drizzle-postgres-deployment.md)** and the [initial technical design](docs/architecture/initial-technical-design.md). **ADR-002 is historical and superseded for Core/database/deployment choices.** Future Web remains React/Vite; existing Cloud Pi owns the Pi SDK runtime; Cloud Auth retains independent Fastify identity services. The [agent/contributor coding standard](docs/engineering/coding-standard.md) describes scoped implementation requirements. Architecture decisions and implementation evidence are distinct: Web/API/persistence and a prod-only infrastructure path exist, while authenticated Cloud work and cross-runtime integration still require independent proof.

## Contents

| Path | Purpose |
| --- | --- |
| [`docs/architecture/v0.4.md`](docs/architecture/v0.4.md) | Product architecture v0.4; follow latest technical ADR for backend/storage choices |
| [`docs/architecture/initial-technical-design.md`](docs/architecture/initial-technical-design.md) | Initial Core API, data, auth and failure semantics design |
| [`docs/decisions/ADR-003-hono-drizzle-postgres-deployment.md`](docs/decisions/ADR-003-hono-drizzle-postgres-deployment.md) | Current preferred technology/deployment decision |
| [`docs/engineering/coding-standard.md`](docs/engineering/coding-standard.md) | Agent/contributor coding and security conventions |
| [`docs/decisions/ADR-002-full-stack-technology.md`](docs/decisions/ADR-002-full-stack-technology.md) | Historical technology decision; superseded for new Core, DB and deployment by ADR-003 |
| [`docs/product/workbench.md`](docs/product/workbench.md) | Workspace product contract and entrypoint for domain-specific UX decisions |
| [`docs/product/delegation-intelligent-ui.md`](docs/product/delegation-intelligent-ui.md) | Approved D01–D31 product contract for long-running intelligent work delegation |
| [`docs/product/delegation-technical-validation.md`](docs/product/delegation-technical-validation.md) | Unverified implementation risks and evidence gates for delegation |
| [`docs/decisions/ADR-001-repository-scope.md`](docs/decisions/ADR-001-repository-scope.md) | Scope and truth-source boundaries for this design phase |
| [`prototypes/workbench-v0.1/`](prototypes/workbench-v0.1/) | Previously created standalone HTML interaction demo, **non-production reference only** |

## What is explicitly **not** authorized by this repository

- No authenticated Cloud work or Cloud Pi scheduler migration is implied by source or docs. The **prod-only Tencent delivery path exists**, but this document does not authorize a deployment; `Mira Gate` and ephemeral PostgreSQL T3 are not live T4/T5 evidence.
- No GitHub Issues / engineering cards or automatic changes to existing projects merely because they are mentioned in a design.
- No assumption that future API endpoints, OAuth scopes or cross-device capabilities already exist.

## Current source-of-truth links

- [Organization instructions](https://github.com/uichat-mira/.github/blob/main/AGENTS.md)
- [Mira Desktop Phase III product contract](https://github.com/uichat-mira/mira-desktop/issues/315)
- [Cloud Pi product design](https://github.com/uichat-mira/cloud-pi/blob/dev/docs/product-design.md)
- [Cloud Auth OAuth V0 contract](https://github.com/uichat-mira/cloud-auth/blob/dev/docs/oauth-authorization-v0.md)

Design docs are proposals; actual repository code and deployed runtime remain authoritative for implementation state.
## Local Hono HTTP transport (AGT-043)

The `apps/api` package implements a minimal Hono HTTP process; local runs and tests do not establish that a given production version is live or connected to an Agent backend. It uses Node 24, Hono, Zod and a bounded request-ID/error contract.

```bash
pnpm install --frozen-lockfile
pnpm --filter @mira-cloud/api dev
# On another local shell: curl -i http://127.0.0.1:3000/api/v1/health
pnpm check
pnpm --filter @mira-cloud/api build
```

`GET /api/v1/health` returns this process's own liveness/version; it makes **no** statement about Cloud Auth, Cloud Pi or PostgreSQL availability. `?detail=basic` is the only optional diagnostic query parameter. Unexpected/duplicate parameters return `INVALID_QUERY` (400), unsupported methods `METHOD_NOT_ALLOWED` (405), missing routes `NOT_FOUND` (404), and internal exceptions a scrubbed `INTERNAL_ERROR` (500). Errors carry a request ID. All HTTP integration tests use an actual ephemeral TCP listener and disable machine-wide proxy routing for loopback requests.

Cloud Auth and Cloud Pi integration are not implied by this local HTTP contract. Production infrastructure and credentials are governed separately by [Tencent production delivery](docs/operations/tencent-production.md); no secrets belong in this repository.

## Local React Web workspace (AGT-042)

The `apps/web` package provides a responsive **React 19 / Vite / Tailwind CSS 4** static workbench. It does not connect to Cloud Auth, Cloud Pi or a database, and displays unavailable actions instead of fake runs.

AGT-047 establishes the MiraDesign Foundation in `apps/web/src/theme/mira-design/`. Its visual tokens come from byte-identical snapshots of `uichat-mira/mira-desktop` pinned at full Git commit `5036067d3a87ba95d798e01ededc7fbd678327de` (`colorThemes.ts`, `styles.css`, `tailwind.config.cjs`). The upstream files are verified by Git blob SHA tests and mapped into semantic Web CSS and Tailwind CSS 4 theme variables via `pnpm --filter @mira-cloud/web tokens:generate`. CI verifies the generated artifacts, all four Desktop presets in light/dark, text contrast and that the former Mobile-derived token authority is gone. No new manual color palette is maintained.

```bash
pnpm install --frozen-lockfile
pnpm --filter @mira-cloud/web dev
pnpm --filter @mira-cloud/web build
pnpm check
```

The only persisted Web preference is local appearance. No credentials, user data or Cloud session are saved by this UI shell. AGT-045 adds live infrastructure status checks without adding authentication or task execution.

## PostgreSQL / Drizzle metadata foundation (AGT-044)

AGT-044 adds exactly one **Mira Cloud-owned** table: `task_metadata` (UUID, external Cloud Auth owner reference, idempotency key, SHA-256 definition hash, positive spec revision, description and creation time). This is not an independent Cloud Pi Task/Run or scheduler.

- A bounded `pg` Pool (default max **4**, maximum **5**) is only created when `DATABASE_URL` is configured; credentials are never committed.
- The typed repository always filters by owner. A unique (owner, idempotency key) index prevents duplicate records. A conflicting payload fails instead of silently reusing a key. There is **no public create-task HTTP endpoint**; future callers must derive owner identity from verified Cloud Auth claims.
- `GET /api/v1/health` reports only Hono process liveness. `GET /api/v1/ready` reports database readiness, returning a safe 503 for missing/unreachable/unauthorized connections without secrets.
- Drizzle Kit generates reviewable SQL under `apps/api/drizzle/`. Never run an unreviewed schema push against production.
- GitHub Actions runs an **ephemeral PostgreSQL 16.8-alpine** service, applies versioned migrations twice and tests concurrent idempotency, owner filtering, schema constraints, rollback, rejected credentials and bounded connections. This is required by Mira Gate.

```bash
pnpm install --frozen-lockfile
pnpm --filter @mira-cloud/api db:check
pnpm check
# Only with an isolated local PostgreSQL and a test DATABASE_URL:
pnpm --filter @mira-cloud/api db:migrate
pnpm --filter @mira-cloud/api test:integration
```

CI test credentials are ephemeral only. No hosted dev/test database, production database, open 5432 port, production volume, deploy workflow or promotion is configured by this card.

## Live local Web → API → PostgreSQL status (AGT-045)

The workbench's **基础服务连接** card now checks real same-origin endpoints rather than always saying "not connected": `GET /api/v1/health` for Hono process liveness and `GET /api/v1/ready` for PostgreSQL readiness. It clearly distinguishes checking, API unavailable, invalid API responses, unconfigured DB, unreachable DB and ready. Use **重新检查** to refresh after a connection or database change; stale/aborted requests cannot replace newer results.

### Local startup

From two terminals after `pnpm install --frozen-lockfile`:

```bash
# Terminal A: optional DATABASE_URL for a locally controlled PostgreSQL 16 instance.
# With DATABASE_URL set, apply reviewed migrations before starting the API:
pnpm --filter @mira-cloud/api db:migrate
pnpm --filter @mira-cloud/api dev
# Hono listens at http://127.0.0.1:3000

# Terminal B:
pnpm --filter @mira-cloud/web dev
# Vite serves http://127.0.0.1:5173, proxies /api to local 127.0.0.1:3000
```

Without `DATABASE_URL`, the Hono API still starts and reports **database not configured**, not "user logged out" or a fake ready state. Without Hono, Web reports the API as unreachable. Restart services or repair the DB and use the explicit **重新检查** control.

The Vite proxy is **only for local dev/preview**; do not infer its behavior as the Tencent production API routing or proof of an OAuth session/Agent Runtime. The prod-only infrastructure contract is governed by [the Tencent runbook](docs/operations/tencent-production.md).

GitHub CI's required PostgreSQL Integration job now launches **actual Vite + compiled Hono + ephemeral PostgreSQL** and tests ready → API offline → DB unconfigured → DB unreachable → ready again through real proxied HTTP requests. The Web's contract and retry/race behavior are covered by component tests. This is local/CI T1–T3 only, **not** browser device T4, live prod, or an authenticated Cloud Pi connection.

## Tencent production delivery

The chosen domain is **cloud.tomzlab.cn**. A production-only manual GitHub
workflow clones the pinned prod commit on Tencent, builds React/Hono there, and deploys the current React/Hono/PostgreSQL infrastructure
foundation using the previously verified Tencent SSH host key and Organization
password secrets. See [the production runbook](docs/operations/tencent-production.md).

This is not Cloud Auth Web OAuth, Cloud Pi integration, or an authenticated
Task/Run product. A source merge does not mean a live public deployment;
actual HTTPS and database health are verified separately.
