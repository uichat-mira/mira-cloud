# Mira Cloud — Repository-specific instructions

## Scope

This repository currently houses the Mira Cloud **product vision, interaction references and system architecture only**. Its product design baseline is `docs/architecture/v0.4.md`, and the current implementation technology design baseline is `docs/decisions/ADR-003-hono-drizzle-postgres-deployment.md`. There is no authorized frontend/backend implementation yet.

Before engineering judgments or mutations involving the `uichat-mira` organization, read the current [organization AGENTS.md](https://github.com/uichat-mira/.github/blob/main/AGENTS.md), relevant instructions, actual target-repository code and applicable Issue/PR/task contracts. Never infer runtime facts from design diagrams.

## Design truth

- Mira Cloud Auth owns accounts, OAuth and service grants, **not** Mira Cloud business data.
- Cloud Pi owns current cloud-agent runtime facts; any future Core or persistence change is proposed until implemented and verified.
- Mira Desktop, Mobile and Cloud have separate runtime and data ownership. Login does not grant remote tool permissions.
- GitHub Issues/Projects/PRs remain authoritative for engineering workflow; Mira Cloud only references them.
- UI color, typography and theme decisions are grounded in the **current** Mira Mobile source; do not create a drifting second token standard.
- Files under `prototypes/` are reference artifacts, not deployable implementations.

## Change boundaries

Design changes may be made only when requested. Do not create Issues, implement services, alter production, change credentials, or deploy without the applicable explicit authorization. If design is accepted for implementation later, create scoped contracts in the appropriate owning repositories and follow organization branch and testing rules.

## Branches, environment stages and testing

Follow the current Organization [environment model](https://github.com/uichat-mira/.github/blob/main/docs/engineering/environment-model.md) and [testing standard](https://github.com/uichat-mira/.github/blob/main/docs/engineering/testing-standard.md). The repository-specific [environment contract](docs/engineering/environment.md) records the actual state.

- `feat/* → dev → test → prod` is a source promotion path, not a command to provision servers.
- `dev` is the working integration/default branch, and `test` is a source acceptance branch. **Neither has a configured server.** `prod` is only a future production source; no Mira Cloud runtime deployment has been authorized.
- Retained `main` does not mean production, is not a deployment branch, and should not bypass `prod`.
- Docs-only `Mira Gate` validates source integrity. Do not report T3/T4/T5, smoke, OAuth, Agent execution or service availability based on this CI.
- Do not introduce dev/test GitHub deployment Environments, hostnames, API keys, release secrets or deploy workflows absent a separately authorized runtime contract. Never point non-production to production as a workaround.
- Keep GitHub engineering work items in the canonical Issue/Project fields; governance changes to the repository do not grant authority to create, accept, close or promote unrelated work items.


## Technology design vs execution

The [AGT-040 technology design contract](https://github.com/uichat-mira/mira-cloud/issues/4) authorizes technology documentation only. ADR-003 supersedes ADR-002 for Core, database and deployment choices, but it is **not** evidence that Web OAuth, a new Core API, a new PostgreSQL database, independent Task orchestration, or cross-endpoint handoff already runs. Do not install deps, scaffold apps, migrate Cloud Pi state, or configure `dev`/`test` servers without separate implementation authority. Cloud Pi's current Pi Runtime / file store and Cloud Auth's actual OAuth contracts remain their respective truth sources.


## Implementation guidance for future authorized tasks

- Read [initial technical design](docs/architecture/initial-technical-design.md) and [coding standard](docs/engineering/coding-standard.md) when working on API/contracts/schema/agent-facing code. The files are **repo-specific extension points** to the current Organization constitution; they do not copy or replace Organization governance.
- Backend preference **Hono + TypeScript + Drizzle + PostgreSQL**; production packaging candidate **Docker Compose + Caddy**; no deployed implementation exists. Cloud Auth Fastify and existing Cloud Pi SDK remain independent owners.
- Never confuse a signed-in Cloud Client with a permitted local Host tool invocation; no unscoped credentials, long-running Agent work inside HTTP requests, or duplicate Scheduler/Run writers.
- Explicitly isolate database queries, ORM migrations, auth adapters and external runtime boundaries. Design/PR text does not waive the need for T1/T2/T3 evidence once code exists.
- **No dev/test servers, deployment environments, URLs or secrets.** Production design is not an authorization to deploy.
