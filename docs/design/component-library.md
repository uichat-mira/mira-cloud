# Mira Cloud — React Component Library Contract

**Status:** design contract; AGT-042 implements the first five local Web UI primitives, without publishing an independent component package. This document extends root [`DESIGN.md`](../../DESIGN.md) and the [Workbench product brief](../product/workbench.md).

## 1. Technology direction

When the independent React Web application is separately authorized:

- **Tailwind CSS 4** for layout/style utilities, configured through generated semantic Mira CSS variables.
- **Radix Primitives**, only for accessible behaviors that justify an external primitive (Dialog, Dropdown Menu, Tabs, Select, Popover, Tooltip). Evaluate bundle/maintenance cost per dependency.
- **Lucide React** icons, consistent with Mira Mobile's Lucide visual language.
- **Locally owned typed React components** (shadcn-style composition may be used as implementation inspiration; do not require a runtime `shadcn/ui` package). Components are source-controlled and tested in this repository.
- Avoid an all-in-one dashboard design kit, global CSS overrides that conflict with tokens, duplicating Mira Mobile React Native implementations, or creating a separately published npm component library at P0.

**Library location:** begin as `apps/web/src/components/ui/` for reusable primitives and `apps/web/src/features/<domain>/components/` for product-domain components. Extract to `packages/ui` only if a **second actual compatible Web consumer** appears and cross-package maintenance costs are justified. The first local UI primitives now live under apps/web/src/components/ui; domain components and independent shared packages are not yet implemented.

## 2. Component contract and naming

| Layer | Examples | Responsibility |
| --- | --- | --- |
| Foundations | Mira semantic tokens, type, spacing, radius, icon, focus ring | Implemented from pinned Mira Mobile sources; one source of truth |
| UI primitives | Button, IconButton, Input, Textarea, Select, Checkbox, Radio, Switch, Dialog, Tabs, Tooltip, Popover, Card, Badge, Separator, Skeleton | Generic interactions, accessibility, theming; no Cloud API or domain data |
| Patterns | EmptyState, ErrorState, LoadingState, ConfirmAction, FormField, SearchFilterBar, ResponsiveSheet, SideNavigation | Consistent reusable UX composition |
| Domain components | TaskCard, TriggerScheduleEditor, RunTimeline, RunStateIndicator, RuntimeBadge, ArtifactRow, CostBudgetSummary, CapabilityGrantPanel, HandoffPrompt | Typed cloud-specific concepts and real status semantics; owned by their feature modules |

UI primitives must not import Cloud Pi/GitHub/OAuth adapters. Domain components should receive validated typed props and explicit user callbacks; they don't invent their own backend requests when a service/query layer already owns that behavior.

### First batch only

When Web implementation is approved, build in order of actual screens, rather than generating an entire library:

1. Button / IconButton / FormField / Input / Card (navigation and first task form).
2. Dialog / ConfirmAction / Tabs / Badge / EmptyState / ErrorState / Skeleton (state clarity).
3. TaskCard / RunStateIndicator / RuntimeBadge / ArtifactRow (first real Task → Run → Artifact journey).

Additional components such as DatePicker, charts, resource tree, command palette or data grid are **not** P0 just because a UI toolkit offers them.

## 3. State semantics matter more than decoration

| Visual component | Input semantics | Prohibited shortcuts |
| --- | --- | --- |
| RunStateIndicator | `requested`, `queued`, `running`, `cancel_requested`, `cancelled`, `failed`, `completed`, `unknown` as supported by actual owner contract | Treating HTTP acceptance as completed, treating `delivered` as run success |
| RuntimeBadge | Explicit source: `Cloud`, `Desktop Local`, `Mobile Local`, `Remote Host` | Inferring access permissions from same-account login |
| TaskCard | Authenticated resource ID, title, actual last-run time, source and allowed actions | Invented schedules, fake Run counts, automatic command execution |
| ArtifactRow | Type, owner, version, origin Run, access rights and expiration | Exposing unauthenticated download links or local path |
| HandoffPrompt | Source vs target runtime, operation permission, expiry and acceptance state | Silent local file/tool/credential transfer |
| CostBudgetSummary | Estimated cost separate from actually reported consumption, limits, unknown data | Displaying calculated estimates as provider invoices |

A display label must preserve all factual distinctions owned by the backing domain. If the actual API supplies fewer states, UI shows an appropriately honest subset—never silently creates synthetic outcomes.

## 4. Accessibility and responsive rules

- Buttons and icon-only actions require a name, focus-visible state and disabled/pressed behavior. Touch-centric targets should target at least 44 CSS px in both dimensions.
- Forms associate label/help/error with input; validation is announced, keyboard submits where appropriate, no silent errors.
- Dialog / Dropdown / Tabs must support expected keyboard navigation, focus management, Escape and screen readers; use Radix where native composition would be hard to maintain.
- Every status has text or icon independent of hue; meet normal text contrast 4.5:1, large text 3:1 and non-text indication 3:1.
- Mobile WebView layout respects safe-area insets, keyboard, viewport changes, bottom bars and return/back behavior. Responsive desktop lists support keyboard reachability without creating a second design language.
- Real dark mode and each palette preset need visual contrast checks; avoid hardcoded per-component hex overrides.

## 5. Component API and testing (future)

- TS props are narrow/typed, variant tokens explicit; avoid undocumented `any` / arbitrary style blobs and implicit global state.
- Story/example fixtures show loading, empty, error, success, disabled, offline, request pending, unknown outcome and permission denied. Fixtures are identified as demo data.
- T1: rendering/state-specific logic; T2: accessibility semantics and contract-level status mapping; T3: working React/WebView behavior with real runtime/canonical theme mapping. Use browser tests only if an actual capable executor and real user-journey risk justify them.
- No hardcoded backend URLs, Provider keys, Cloud Session, Github PAT or privilege-granting Tool action inside a component.
- Shared design tokens must be generated from a **single verified pinned Mobile revision**. Future CI should fail on drift that changes a consumed semantic field; don't silently sync to a moving `dev` branch at build time.

## 6. Decision log and explicit non-goals

**Selected:** small locally owned library, Tailwind 4, Radix only as needed, Lucide, Mobile-derived semantic tokens.

**Not selected now:** separate reusable npm package, Radix in every control, Chakra/MUI/Ant Design theme replacement, duplicate Native+Web component tree, full Storybook infrastructure before code exists.

**Reconsider when:** multiple actual Web consumers emerge, token mapping drift recurs, accessibility tests expose reusable gaps, or feature designs demonstrate a concrete high-cost pattern.

## 7. Current state and approval boundary

The repository now contains a local static React Web shell and base UI primitives as well as Hono transport, plus the older HTML mock prototype. This catalog does not imply real Agent tasks, OAuth or deployed product state. Production Web component work needs a separately authorized Issue and implementation/testing contract. `dev` and `test` have **no servers**.
