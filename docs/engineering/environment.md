# Mira Cloud — Environment and promotion contract

**Status:** Design-only repository (2026-11-11).
**Organization owner:** [Environment Model](https://github.com/uichat-mira/.github/blob/main/docs/engineering/environment-model.md).
**Testing owner:** [Testing Standard](https://github.com/uichat-mira/.github/blob/main/docs/engineering/testing-standard.md).

## Reality at bootstrap

This repository has **no frontend or backend runtime to deploy**, and **no configured dev or test servers**. Creating a branch does not provision a server, prove T4, or imply any deployment. No deployment workflow, cloud environment, host, secret, or production endpoint is established by this repository.

| Branch | Source workflow | Effective environment today | Deployment |
| --- | --- | --- | --- |
| `feat/*` | Isolated work, PR into `dev` | Versioned source + CI | None |
| `dev` | Integration branch, GitHub default | Source validation (Docs Contract / Mira Gate) | **No dev server configured** |
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

`node scripts/check-docs.mjs` runs local deterministic docs/prototype-path checks. GitHub Actions publishes a `Docs Contract` result and aggregates it in **Mira Gate**. This is **source integrity only**: it does not test functionality, OAuth, deployment, cloud service health or any mobile/desktop journey.

T1–T3 runtime layers are not applicable while this remains a design-only repository. T4 and T5 are unavailable until real corresponding environments and a working service exist.

## Protection limitation

When normalized, GitHub reported that branch protection and Rulesets are unavailable for this **private** repository under the current subscription. A direct API attempt to **set `prod` protection** (required approving review, required `Mira Gate` status, no force pushes/deletion) returned **403, upgrade plan or make public** on 2026-11-11. No protection was applied. **Keep the repository Private.**

As a *detective but non-enforcing substitute*, the existing Docs-only Mira Gate also checks that a pull request targeting `prod` originates from the same repository's `test` branch. This check can fail a PR, but **without native GitHub protection it cannot prevent force-pushes, direct writes, PR merge bypasses or deletion**; never report `prod` as protected. Once plan policy permits protection, set it through GitHub branch protection/Rulesets and verify via API. Until then the repository owner must manually enforce PR-only promotions and refrain from direct writes.

## Gate for future implementation

Before adding application code, real secrets, OAuth callbacks, a server or deploy workflow, approve the corresponding ownership and Issue contract; specify target runtime and environment, protected credentials, minimal T1/T2/T3 validation and real T4/T5 expectations. The absence of dev/test servers must not be silently "fixed" by pointing them at production.
