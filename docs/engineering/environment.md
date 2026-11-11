# Mira Cloud — Environment and promotion contract

**Status:** Design baseline plus a tooling-only engineering workspace; no deployable application (2026-11-11).
**Organization owner:** [Environment Model](https://github.com/uichat-mira/.github/blob/main/docs/engineering/environment-model.md).
**Testing owner:** [Testing Standard](https://github.com/uichat-mira/.github/blob/main/docs/engineering/testing-standard.md).

## Reality at bootstrap

This repository has **no frontend or backend runtime to deploy**, and **no configured dev or test servers**. Creating a branch does not provision a server, prove T4, or imply any deployment. No deployment workflow, cloud environment, host, secret, or production endpoint is established by this repository.

| Branch | Source workflow | Effective environment today | Deployment |
| --- | --- | --- | --- |
| `feat/*` | Isolated work, PR into `dev` | Versioned source + CI | None |
| `dev` | Integration branch, GitHub default | Source validation (Docs Contract, `pnpm check` / Mira Gate) | **No dev server configured** |
| `test` | Explicitly promoted, reviewable candidate | Source/contract review and CI | **No test server configured** |
| `prod` | Intentionally promoted source baseline | Versioned design baseline; no live service | **No production deployment configured** |
| `main` | Original bootstrap / historical compatibility | Not an environment, not default release authority | None |

The repository does **not** create GitHub deployment Environments named `dev` or `test` and does not configure environment URLs, deploy tokens, server addresses, secrets, or fake smoke checks. Existing Cloud Auth / Cloud Pi / Desktop deployments are owned by their respective repositories.

## Promotion and reviews

```text
feat/* --PR, checks--> dev --reviewed promotion--> test --reviewed promotion--> prod
```

1. Normal changes begin in `feat/*`, target `dev`, and provide a small independently reviewable diff.
2. `dev` is the integration truth for current design proposals.
3. `test` records an intentionally reviewed **source** candidate. Acceptance evidence must say which checks genuinely ran. With no server, T4 environment E2E is **not available**, not "passed".
4. `prod` is reserved as a future source-of-production branch, but remains an **undelployed design snapshot** until there is an explicitly approved implementation, runtime and promotion contract. T5 cannot be claimed.
5. `main` remains an initial history/compatibility branch. It never implicitly means production and must never configure deploy behavior.
6. No stage auto-promotes to another; no automatic release or external provider calls.

## Available validation

`node scripts/check-docs.mjs` runs local deterministic docs/prototype-path checks. `pnpm check` runs the Node 24 workspace format, lint, TypeScript strict and Vitest T1 checks, and requires every future workspace package to declare a runnable `check` script. GitHub Actions publishes a `Docs Contract` result, an `Engineering Checks` result, and the aggregate **Mira Gate**. These are **source integrity and T1 tooling checks only**: they do not test application functionality, OAuth, deployment, cloud service health or any mobile/desktop journey.

The repository has a tooling-only workspace with no application packages. T2/T3 application layers are not applicable until real application code exists. T4 and T5 are unavailable until real corresponding environments and a working service exist.

## Public MIT repository and `prod` protection

On 2026-11-11, the maintainer switched `uichat-mira/mira-cloud` from Private to **Public** and adopted the root [MIT License](../../LICENSE). The former GitHub API 403 for private repository protection is historical, not current. The repository default branch remains `dev`.

**Native GitHub branch protection was created and read back successfully for `prod`:**
- Require PR with **at least one approval**; dismiss stale reviews; require conversation resolution.
- Require **`Mira Gate`** status and require branch up to date before merging.
- `enforce_admins=true`; **force pushes and branch deletion disabled**.
- The Docs-only Mira Gate separately rejects `prod` promotion PRs not sourced from this repository's `test` branch. Do not equate this source check with production acceptance or full server tests.

This protection is GitHub-enforced for `prod`, not for `dev` or `test` (not requested). A new review or repo setting may change the effective rules; verify live branch protection via GitHub API before relying on it. `prod` remains a **source branch** with no Mira Cloud production runtime, despite the branch protection. No dev/test server or deployment Environment exists.

## Gate for future implementation

Before adding application code, real secrets, OAuth callbacks, a server or deploy workflow, approve the corresponding ownership and Issue contract; specify target runtime and environment, protected credentials, minimal T1/T2/T3 validation and real T4/T5 expectations. The absence of dev/test servers must not be silently "fixed" by pointing them at production.

## 2026-11-11 production authorization update

The maintainer has authorized a manual, prod-only Tencent runtime deployment of the local Web/Hono/PostgreSQL foundation at cloud.tomzlab.cn. This supersedes earlier statements that no production deployment was authorized; the previous text remains as a historical bootstrap description. The actual deployment status requires successful host execution and T5 smoke; dev and test still have no servers. See docs/operations/tencent-production.md.
