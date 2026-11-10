# Mira Cloud — Repository-specific instructions

## Scope

This repository currently houses the Mira Cloud **product vision, interaction references and system architecture only**. Its product design baseline is `docs/architecture/v0.4.md`, and the proposed implementation technology baseline is `docs/decisions/ADR-002-full-stack-technology.md`. There is no authorized frontend/backend implementation yet.

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

The [AGT-040 technology initiative](https://github.com/uichat-mira/mira-cloud/issues/4) authorizes technology documentation only. ADR-002 selects future implementation options, but it is **not** evidence that Web OAuth, a new Core API, a new SQLite store, independent Task orchestration, or cross-endpoint handoff already runs. Do not install deps, scaffold apps, migrate Cloud Pi state, or configure `dev`/`test` servers without separate implementation authority. Cloud Pi's current Pi Runtime / file store and Cloud Auth's actual OAuth contracts remain their respective truth sources.
