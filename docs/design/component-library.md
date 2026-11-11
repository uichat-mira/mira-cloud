# Mira Cloud — React Component Library Contract

**Status:** implemented MiraDesign consumption contract after AGT-047/048/049 and the AGT-050 Cloud cutover. Read the Cloud-native [component guide](./mira-design-components.md), [Web design guidelines](./mira-design-guidelines.md), [final cutover matrix](./mira-design-cutover.md), [Core migration record](./mira-design-migration.md) and [Advanced / Content record](./mira-design-advanced-migration.md). This document extends root [`DESIGN.md`](../../DESIGN.md) and the [Workbench product brief](../product/workbench.md).

## 1. Technology direction

The current React Web application uses:

- **Tailwind CSS 4** for layout/style utilities, configured through generated semantic Mira CSS variables.
- **Accessible primitives**, only where native composition would be hard to maintain: Radix Dropdown Menu today, with Dialog/Tabs/Select/Popover evaluated per need; the migrated Tooltip uses the pinned `react-tooltip` dependency. Evaluate bundle/maintenance cost per dependency.
- **Lucide React** icons for the current Cloud Web icon language; icon choice does not make Mobile the visual-token authority.
- **Locally owned typed React components** (shadcn-style composition may be used as implementation inspiration; do not require a runtime `shadcn/ui` package). Components are source-controlled and tested in this repository.
- Avoid an all-in-one dashboard design kit, global CSS overrides that conflict with tokens, duplicating Mira Mobile React Native implementations, or creating a separately published npm component library at P0.

**Library location:** reusable MiraDesign primitives live under `apps/web/src/components/mira-design/`. Lightweight Core/Advanced components are exported from `index.ts`; heavy Markdown/editor capabilities stay behind `content.ts`. Product-domain components belong under `apps/web/src/features/<domain>/components/`. Extract to `packages/ui` only if a **second actual compatible Web consumer** appears and cross-package maintenance costs are justified.

## 2. Component contract and naming

| Layer | Examples | Responsibility |
| --- | --- | --- |
| Foundations | MiraDesign semantic tokens, type, spacing, radius, icon, focus ring | Implemented from pinned Mira Desktop sources; one Web token authority under `apps/web/src/theme/mira-design/` |
| UI primitives | Alert, Badge, Button/IconButton, Card/SectionCard, Divider, Input/TextArea/NumberInput, Skeleton, Switch, Slider, Tag/TagInput, Tooltip, NavItem, SegmentedTabs/TabCard, CollapsiblePanel/ExpandableSection, Drawer, DropdownMenu, ConfirmDialog, Message, Result, FullPageStatus, FileIcon, ImagePreviewOverlay, StepIndicator, TerminalPanel, WelcomePanel | Generic interactions, accessibility, theming; no Cloud API or domain data |
| Patterns | EmptyState, ErrorState, LoadingState, ConfirmAction, SearchFilterBar, ResponsiveSheet, SideNavigation | Consistent reusable UX composition |
| Domain components | TaskCard, TriggerScheduleEditor, RunTimeline, RunStateIndicator, RuntimeBadge, ArtifactRow, CostBudgetSummary, CapabilityGrantPanel, HandoffPrompt | Typed cloud-specific concepts and real status semantics; owned by their feature modules |

UI primitives must not import Cloud Pi/GitHub/OAuth adapters. Domain components should receive validated typed props and explicit user callbacks; they don't invent their own backend requests when a service/query layer already owns that behavior.

### Implemented batches

The current Cloud-owned MiraDesign source contains:

1. **Foundation / Core:** Alert / Badge / Button / IconButton / Card / SectionCard / Divider / Input / TextArea / NumberInput / Skeleton / Switch / Slider / Tag / TagInput / Tooltip / NavItem / SegmentedTabs / TabCard / CollapsiblePanel / ExpandableSection / Drawer / DropdownMenu / ConfirmDialog / Message / Result / FullPageStatus / FileIcon / ImagePreviewOverlay / StepIndicator / TerminalPanel / WelcomePanel.
2. **Advanced / Content:** Table, NavigationCardTabs, Select, Modal, SearchSelectModal / Chrome, CodeBlock, StreamingTextRenderer, CompactAudioPlayer, AvatarPicker, FileListItem, FileUploadDropzone, ErrorBoundary, ExternalLink and StatusIndicator. MarkdownText / MarkdownEditor are Cloud-owned but stay behind an explicit heavy-content entry / dynamic loader so ordinary MiraDesign imports do not eagerly pull their runtime.
3. **Domain journey remains separate:** TaskCard / RunStateIndicator / RuntimeBadge / ArtifactRow remain the first Cloud-domain component journey and are not implied by MiraDesign.

Additional components such as DatePicker, charts, resource tree, command palette or a richer data grid are **not** P0 merely because a toolkit offers them.

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

## 5. Component API and testing

- TS props are narrow/typed, variant tokens explicit; avoid undocumented `any` / arbitrary style blobs and implicit global state.
- Story/example fixtures show loading, empty, error, success, disabled, offline, request pending, unknown outcome and permission denied. Fixtures are identified as demo data.
- T1: rendering/state-specific logic; T2: accessibility semantics and contract-level status mapping; T3: working React/WebView behavior with real runtime/canonical theme mapping. Use browser tests only if an actual capable executor and real user-journey risk justify them.
- No hardcoded backend URLs, Provider keys, Cloud Session, Github PAT or privilege-granting Tool action inside a component.
- Shared design tokens must be generated from a **single verified pinned Mira Desktop revision**. CI fails on drift that changes a consumed semantic field; don't silently sync to a moving `dev` branch at build time.

## 6. Decision log and explicit non-goals

**Selected:** small locally owned library, Tailwind 4, Radix only as needed, Lucide, Desktop-derived MiraDesign semantic tokens.

**Not selected now:** separate reusable npm package, Radix in every control, Chakra/MUI/Ant Design theme replacement, duplicate Native+Web component tree, full Storybook infrastructure before code exists.

**Reconsider when:** multiple actual Web consumers emerge, token mapping drift recurs, accessibility tests expose reusable gaps, or feature designs demonstrate a concrete high-cost pattern.

## 7. Current state and approval boundary

The repository contains the real React Web shell consuming Cloud-owned MiraDesign Foundation, Core and Advanced / Content assets, plus the older HTML mock prototype. Workspace navigation and `ConnectionPanel` now consume MiraDesign primitives instead of carrying a parallel shell/component implementation. This catalog does not imply real Agent tasks, OAuth or Cloud Pi execution. `dev` and `test` have **no servers**; deployment reality remains owned by the environment/deployment contracts.
