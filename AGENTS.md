# Mira Cloud — Repository-specific instructions

## Scope

This repository currently houses the Mira Cloud **product vision, interaction references and system architecture only**. Its canonical design draft is `docs/architecture/v0.4.md`. There is no authorized frontend/backend implementation yet.

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