# MiraDesign — Cloud Component Guide

**Status:** AGT-050 Cloud-native component documentation.
**Source baseline:** `uichat-mira/mira-desktop@5036067d3a87ba95d798e01ededc7fbd678327de`.
**Upstream documentation:** `desktop/src/shared/ui/COMPONENTS.md` blob `29182dd13cff79246f082b543812ead06db2902d`.

This guide is rewritten for Mira Cloud Web. It is not a mirror of Desktop runtime behavior.
The implementation source of truth is `apps/web/src/components/mira-design/`; visual tokens
come from `apps/web/src/theme/mira-design/`.

## 1. Import contract

Lightweight Core and Advanced components are exported from:

```ts
import { Button, NavItem, SectionCard, Table } from "../components/mira-design/index.ts";
```

Heavy Markdown capabilities stay behind the explicit content entry:

```ts
import {
  loadMarkdownEditor,
  loadMarkdownText,
} from "../components/mira-design/content.ts";
```

Do not import Desktop source at runtime. Do not copy a component into a feature directory
just to change colors or spacing. Feature code owns domain meaning; MiraDesign owns generic
visual and interaction behavior.

## 2. Component layers

| Layer | Cloud source | Responsibility |
| --- | --- | --- |
| Foundation | `src/theme/mira-design/` | themes, semantic colors, spacing, radius, shadow, type, motion |
| Core | `src/components/mira-design/` | controls, surfaces, feedback, overlays, generic navigation |
| Advanced | same directory | table, selection, audio, status, file and error patterns |
| Content | `MarkdownText.tsx`, `MarkdownEditor.tsx`, `content.ts` | long-form rendered/edited content, lazy-loaded |
| Domain | `src/features/<domain>/` | Task/Run/Artifact/Auth/etc. semantics and data |

A generic component must not own Cloud API URLs, Cloud Auth grants, Cloud Pi execution,
Desktop Host access, provider credentials or business-state inference.

## 3. Current component catalog

### Actions and input

| Component | Typical use |
| --- | --- |
| `Button` / `IconButton` | primary, secondary, lightweight and destructive actions |
| `Input` / `TextInput` / `TextArea` / `NumberInput` | typed form fields with label/help/error behavior |
| `Select` | compact accessible selection through Radix Select |
| `Switch` | boolean configuration |
| `Slider` | bounded numeric values |
| `Tag` / `TagInput` | compact labels and editable tag collections |
| `FileUploadDropzone` | browser file selection returning explicit `File[]` |
| `AvatarPicker` | generic image/avatar choice from caller-supplied options |

### Surfaces and composition

| Component | Typical use |
| --- | --- |
| `Card` | lightweight visual grouping |
| `SectionCard` / `SectionCardRow` | titled settings/information sections with one shell |
| `Divider` | low-noise separation |
| `CollapsiblePanel` / `ExpandableSection` | progressive disclosure of secondary detail |
| `TabCard` / `SegmentedTabs` / `NavigationCardTabs` | local or page-level mode/navigation switching |
| `NavItem` | router-aware workbench navigation |
| `WelcomePanel` | bounded welcome/empty-state hero treatment |
| `TerminalPanel` / `CodeBlock` | code, logs and terminal-like text |
| `Table` | generic typed table behavior via TanStack Table |

### Feedback and status

| Component | Typical use |
| --- | --- |
| `Alert` | persistent page-level information/warning/error feedback |
| `Badge` | compact neutral or semantic label |
| `Message` | transient feedback through `MessageProvider` |
| `Result` / `FullPageStatus` | empty/result/page-level status |
| `StatusIndicator` | status with visible text; never color-only |
| `Skeleton` | loading placeholders |
| `StepIndicator` | generic ordered-step display |
| `ErrorBoundary` / `RouteErrorBoundary` | recoverable React/router failure UI |

### Overlays and external interaction

| Component | Typical use |
| --- | --- |
| `Tooltip` | concise contextual help |
| `DropdownMenu` | accessible menu actions |
| `Drawer` | right-side contextual detail |
| `ConfirmDialog` | bounded confirmation content |
| `Modal` / `ModalProvider` | generic modal shell and static event-bridge API |
| `SearchSelectModal` | searchable selection with injected `loadItems(AbortSignal)` |
| `ImagePreviewOverlay` | single-image preview/zoom |
| `ExternalLink` | browser open/copy behavior through explicit Web capability adapters |

### Content and media

| Component | Typical use |
| --- | --- |
| `MarkdownText` | rendered long-form Markdown through the heavy content entry |
| `MarkdownEditor` | Milkdown-based rich Markdown editing through the heavy content entry |
| `StreamingTextRenderer` | grapheme-safe visible-text pacing only |
| `CompactAudioPlayer` | browser-native audio preview |
| `FileIcon` / `FileListItem` | generic file type and file-row presentation |

## 4. Web adaptation rules

Desktop source is a design/behavior upstream, not a runtime dependency.

- Desktop `react-i18next` strings become explicit props or neutral Cloud defaults.
- Desktop request/service calls become caller-provided loaders/fetchers.
- Desktop clipboard/runtime behavior becomes Web APIs or explicit capability adapters.
- `react-router-dom` assumptions use Cloud's `react-router` contract.
- CSS hooks that cannot be expressed as utilities are Cloud-owned `mira-*` hooks in
  `src/styles/globals.css`.
- Generated theme files are never edited by hand.
- Heavy Markdown/editor code is not re-exported from the light `index.ts` barrel.
- Errors are surfaced or transformed; generic components do not silently manufacture success.

## 5. State semantics

Generic visual variants never redefine product truth.

- `requested` is not `running`.
- `cancel_requested` is not `cancelled`.
- delivery success is not Run success.
- same-account login is not Desktop Host permission.
- infrastructure readiness is not Cloud Auth login or Cloud Pi readiness.

Those distinctions belong to the domain owner and must be passed into generic components
as explicit props.

## 6. Accessibility baseline

- Icon-only actions require an accessible name.
- Focus-visible behavior must remain visible.
- Dialog/menu/tab primitives require expected keyboard behavior.
- Status is understandable without hue.
- Form labels/help/errors remain associated with the control.
- Touch/coarse-pointer surfaces follow the responsive guidance in
  [MiraDesign Web Guidelines](./mira-design-guidelines.md).

## 7. Excluded and consolidated Desktop components

The full decision is recorded in [MiraDesign Cutover Matrix](./mira-design-cutover.md).

- `AccessPointPreviewDrawer`: excluded; Desktop/business Access Point semantics.
- `CoverageReportPanel`: excluded; development/test reporting surface.
- `MicroFrontend`: excluded; Desktop runtime/embed concern.
- `GithubIcon` / `NotionIcon`: deferred; provider-brand helpers with no current generic
  Cloud consumer.
- Desktop `IconButton.tsx`: consolidated; Cloud exports `IconButton` from
  `Button.tsx` rather than keeping a duplicate file.

## 8. Maintenance rule

When changing a shared component:

1. change the owning component, not a feature-local clone;
2. update the nearest T1/T2 evidence;
3. update this guide only when the public behavior/contract changes;
4. update the cutover matrix only when provenance/classification changes;
5. run `pnpm --filter @mira-cloud/web check` and the repository-level checks appropriate
   to the changed surface.

Desktop may continue evolving independently. Cloud does not auto-sync a moving Desktop
branch; any future rebase starts from an explicitly reviewed pinned revision.
