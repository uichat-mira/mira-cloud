# Mira Cloud Workspace — experience scope (design only)

**Status:** product interaction reference; AGT-042 provides a local static Web shell and AGT-045 displays real local infrastructure connectivity. This is not an authenticated or deployed Cloud workspace. Product baseline: [v0.4](../architecture/v0.4.md). Visual/interaction language: [root DESIGN.md](../../DESIGN.md); planned UI components: [component library contract](../design/component-library.md).

## Promise

Give an owner one clear place to hand Mira work, monitor how it is going, and reuse outcomes, regardless of whether the work originated on Web, Mobile, Desktop or an authorized messaging channel.

## Primary user journeys

1. **Ad hoc:** create Task → start Run → see real status/approvals → review Artifact → resume or delegate follow-up.
2. **Scheduled:** define Task + Trigger (timezone, recurrence, destinations, budget) → pause/enable/run now → inspect runs and delivery outcomes.
3. **Artifact reuse:** view a report/file and provenance → cite or download → create a new Task with an explicit ArtifactRef.
4. **GitHub:** view authoritative Issue/Project/PR state → request an authorized agent activity → link Cloud Run and evidence without duplicating GitHub management fields.
5. **Skills/MCP:** inspect installed capability, provenance, pinned version, required permissions and actual readiness; activation does not grant tools automatically.
6. **Cross-device:** Desktop signs in as Cloud Client, reads a Cloud-owned task/artifact, and explicitly accepts a handoff as a separate Desktop-owned run; source and destination status never overwrite each other.

## Surfaces

Web: full responsive workspace. Mobile: same page within a WebView with trusted origin navigation, safe area, download/share handling and a separate Web session boundary. Desktop: native Cloud Client capability; not a direct reuse of Portal session nor an assumption of host tool authorization.

## Prototype status

`../../prototypes/workbench-v0.1/` is a pre-existing, standalone, mock-data HTML demonstration that informed earlier UX discussion. It is not a React app, backend integration, authenticated session or a reliable statement of current production behavior. It uses a former visual baseline and must be reconciled against current Mira Mobile design tokens before any implementation.
