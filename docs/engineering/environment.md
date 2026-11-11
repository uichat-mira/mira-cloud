# Mira Cloud — Environment and promotion contract

**Status:** implemented React Web + Hono API + PostgreSQL/Drizzle workspace with a prod-only Tencent deployment path; dev/test have no servers (2026-11-11).
**Organization owner:** [Environment Model](https://github.com/uichat-mira/.github/blob/main/docs/engineering/environment-model.md).
**Testing owner:** [Testing Standard](https://github.com/uichat-mira/.github/blob/main/docs/engineering/testing-standard.md).

## Current environment reality

Creating or promoting a branch changes **source state**, not automatically a deployed environment.

| Branch | Purpose | Effective environment | Deployment |
| --- | --- | --- | --- |
| `feat/*` | isolated implementation | source + CI | none |
| `dev` | working integration/default | source validation + Mira Gate | **no dev server** |
| `test` | reviewed source candidate | acceptance/source validation | **no test server** |
| `prod` | production source branch | source of the explicitly deployed candidate | manual prod-only Tencent workflow |
| `main` | retained history/compatibility | not an environment | none |

Mira Cloud currently has a prod-only deployment path for `cloud.tomzlab.cn` using the Tencent VPS, host Caddy, React static assets, Hono API and private PostgreSQL. The exact live SHA and health are runtime facts: verify the deployment workflow and T5 smoke before claiming that a particular version is in production.

Cloud Auth and Cloud Pi deployments remain owned by their own repositories and are not implicitly part of the Mira Cloud runtime.

## Promotion

```text
feat/* --PR/checks--> dev --reviewed promotion--> test --reviewed promotion--> prod --explicit deploy--> Tencent production
```

1. Normal changes begin in `feat/*`, target `dev`, and stay small and independently reviewable.
2. `dev` is integration truth for current source. It has no server and therefore cannot produce environment T4 evidence.
3. `test` is an intentionally reviewed source candidate. It also has no server; T4 is unavailable, not passed.
4. `prod` identifies production source. Merging/promoting to `prod` does not itself deploy or prove health.
5. Production deployment is explicit/manual and follows `docs/operations/tencent-production.md`.
6. `main` never implicitly means production.
7. No stage auto-promotes to another, and dev/test must never point at production as a shortcut.

## Validation and evidence

The repository currently exposes:

- `node scripts/check-docs.mjs` — docs/path contract;
- `pnpm check` — workspace static/type/lint/unit/package checks;
- Web package token drift checks and build;
- real ephemeral PostgreSQL integration in Mira Gate;
- production Docker/Compose/Caddy package validation in Mira Gate;
- manual production deployment and public/loopback smoke only when the prod workflow is explicitly run.

Mira Gate is an aggregate **source/runtime-package gate for the tested commit**. It does not prove a deployed environment, Cloud Auth login, Cloud Pi execution, Task/Run behavior, cross-device handoff or T5.

T4 remains unavailable while dev/test have no deployed environment. T5 exists only for an exact production deployment that has actually been executed and smoke-tested.

## Production boundary

The approved production route is Tencent-only and prod-only.

- Use the repository's approved production workflow and pinned SSH host identity.
- Use only Tencent production Secrets; do not reuse Alibaba deployment credentials.
- PostgreSQL must remain private and not expose a public host port.
- Cloud Auth/Cloud Pi are not deployed as a side effect.
- Deployment/rollback evidence belongs to the exact prod SHA.
- Ordinary push/PR CI does not authorize or imply production deployment.

See `docs/operations/tencent-production.md` for the operational contract.

## GitHub branch policy

`prod` is the protected production source branch. Verify live GitHub protection before relying on a remembered setting. `dev` remains the default integration branch; `test` remains a source acceptance branch.

Do not create dev/test GitHub Deployment Environments, URLs, server Secrets or fake smoke checks unless a later explicit runtime contract authorizes them.
