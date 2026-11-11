# Mira Cloud — Repository-specific instructions

## Scope and current state

This repository owns the Mira Cloud product vision, interaction references, system architecture, Node/pnpm workspace, React Web application, Hono API, PostgreSQL/Drizzle persistence, MiraDesign Web foundation, and the prod-only Tencent packaging/deployment path.

The product design baseline is `docs/architecture/v0.4.md`. The implementation technology baseline is `docs/decisions/ADR-003-hono-drizzle-postgres-deployment.md`.

Current important boundaries:

- Mira Cloud has real Web/API/PostgreSQL implementation and a prod-only Tencent deployment path for `cloud.tomzlab.cn`.
- `dev` and `test` are source/acceptance branches only; they do not have configured servers.
- Cloud Auth and Cloud Pi remain separately owned systems and are not implicitly part of the Mira Cloud deployment.
- Authenticated Cloud business flows, Cloud-owned Task orchestration, and cross-runtime handoff exist only when actual code/runtime evidence proves them.
- Files under `prototypes/` are reference artifacts, not deployable truth.

Before engineering judgments or mutations involving the `uichat-mira` organization, read the current Organization `AGENTS.md`, this file, the applicable Issue/PR/task contract, and the actual target code/configuration/workflow/runtime. Never infer current capability from design diagrams or stale prose.

## Ownership and architecture truth

- **Cloud Auth** owns accounts, OAuth and service grants, not Mira Cloud business data.
- **Cloud Pi** owns the current cloud-agent runtime facts until an explicitly implemented Cloud-owned runtime replaces a specific responsibility.
- **Mira Desktop, Mobile and Cloud** have separate runtimes and data ownership. Login does not grant local Host/Tool permission.
- **GitHub Issues/Projects/PRs** remain authoritative for engineering workflow; Mira Cloud may reference them but must not invent a second engineering truth.
- Do not create a second Scheduler, Run writer, MCP loop, auth authority, or other competing owner merely because a Cloud feature needs access to that capability.
- A signed-in Cloud client is not a permitted Desktop Host invocation. Cross-runtime actions require explicit contracts, authorization and evidence.

## Design truth

- `apps/web/src/theme/mira-design/` is the Mira Cloud Web visual-token foundation.
- MiraDesign is derived from a pinned Mira Desktop shared-design revision and is Cloud-owned at runtime; do not introduce a live cross-repository runtime dependency.
- Mira Mobile is **not** the Cloud visual-token authority. Mobile contributes interaction guidance for narrow screens, touch targets, Safe Area, dynamic viewport/keyboard behavior, no-hover operation, progressive disclosure, reachable primary actions, and understandable mobile-network failure/recovery.
- Web components consume MiraDesign semantic roles. Do not create a second palette, duplicate token namespace, or feature-local replacement for an existing shared primitive without a demonstrated need.
- Read root `DESIGN.md` and `docs/design/component-library.md` for the detailed design contract.
- Prototype fixtures and visual mockups never prove backend/runtime capability.

## Change boundaries

Design and implementation changes require the applicable maintainer/task authority. Do not create Issues, mutate production, change credentials, merge, accept/close work items, or deploy merely because implementation appears complete.

When authority is present, execute the authorized action without adding ceremonial confirmation rounds.

Do not modify Cloud Auth, Cloud Pi, Desktop or Mobile ownership boundaries from this repository unless the task explicitly covers the owning repository and its current contract.

## Branches, environments and testing

Follow the current Organization environment model and testing standard, plus `docs/engineering/environment.md`.

- Source promotion is `feat/* → dev → test → prod`.
- `dev` is the working integration/default branch; `test` is the reviewed source candidate. Neither has a configured server.
- `prod` is the production source branch. Deployment is a separate, explicit action; a merge to `prod` is not proof that production is healthy.
- `main` is retained history/compatibility, not production authority.
- Mira Gate is source/runtime-package evidence for the tested commit. It does not by itself prove deployed T4/T5 behavior, Cloud Auth login, Cloud Pi execution, or a production user journey.
- Never point dev/test at production to manufacture an environment.
- Do not create dev/test deployment URLs, Secrets or GitHub Environments unless separately authorized.

## Coding hygiene

Detailed rules live in `docs/engineering/coding-standard.md`; the following repository invariants are mandatory:

1. **Change the smallest coherent surface.** Read nearby implementation, types, tests and generated-source ownership before editing. Do not attach unrelated refactors or formatting sweeps.
2. **Keep boundaries typed and explicit.** TypeScript stays strict. Untrusted external data enters as `unknown` and is validated at the boundary. Do not use unexplained `any`, broad type assertions, `@ts-ignore`, or mutable global state to bypass a design problem.
3. **Reuse before inventing.** Prefer existing MiraDesign primitives, domain types, adapters and repository patterns. Do not create feature-local copies of tokens, DTOs, error models, request clients or generic UI simply to move faster.
4. **Remove replaced paths.** Once a new path is verified and owns the behavior, delete the obsolete implementation, generator, compatibility shim or dead branch unless a real consumer and removal condition are documented.
5. **Failures stay visible.** Do not swallow exceptions, silently fall back to success, hardcode local/production values, weaken tests, disable lint/type/security checks, or use production mocks to make a result look green.
6. **Generated artifacts are generated.** Modify their source/generator and regenerate them; do not hand-edit generated files. Drift checks must remain executable.
7. **Keep modules owned and bounded.** Avoid giant `utils`, god services, speculative base classes and abstraction layers without a current consumer. HTTP, persistence, auth and external-runtime concerns stay behind their owning boundary.
8. **Tests follow behavior and risk.** Add or update the nearest meaningful T1/T2/T3 evidence for changed contracts/behavior. Browser or device validation is required only when it can prove a relevant risk and the executor actually has that capability.
9. **Comments explain why; docs describe current truth.** Remove stale comments and update nearby contracts when behavior changes. Do not preserve historical falsehoods as active instructions.
10. **Dependencies must earn their cost.** Add only dependencies required by the implemented path, keep them pinned through the lockfile, and avoid importing heavy/runtime-specific packages into shared or first-load paths without need.

For relevant implementation work, run the narrow package check first and the repository gate appropriate to the changed surface; do not report unexecuted verification as passed.

## Technology guidance

- Backend baseline: **Hono + TypeScript + Drizzle + PostgreSQL**.
- Keep HTTP routing/middleware, domain decisions, persistence queries, auth adapters and external-runtime adapters separated by responsibility.
- Do not run long Agent work inside HTTP request lifetimes or hold database transactions/connections across Agent execution.
- Cloud Auth Fastify and Cloud Pi SDK/runtime remain independent owners; integrate through explicit contracts/adapters rather than copying their internals.
- Credentials, tokens, user secrets and service grants must not enter Git, logs, fixtures, frontend bundles, URLs or model prompts.
- Production database ports stay private; runtime processes use least privilege.

## Production deployment

The maintainer has authorized the **prod-only Tencent runtime** using the repository deployment workflow and `docs/operations/tencent-production.md`.

- Production source must be an explicitly promoted `prod` commit.
- Deployment remains manual/explicit; ordinary pushes do not authorize SSH deployment.
- Use only the approved Tencent credentials and pinned SSH host identity. Do not reuse Alibaba credentials.
- Do not expose PostgreSQL publicly or deploy Cloud Auth/Cloud Pi as a side effect.
- Exact live version and health are runtime facts: verify deployment workflow/T5 evidence before claiming production success.
