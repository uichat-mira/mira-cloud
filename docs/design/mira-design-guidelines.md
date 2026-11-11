# MiraDesign — Cloud Web Guidelines

**Status:** AGT-050 Web design guidance.
**Visual upstream:** Mira Desktop shared design assets pinned at
`5036067d3a87ba95d798e01ededc7fbd678327de`.
**Upstream guideline:** `desktop/src/shared/ui/ui-design-guidelines-tailwind.md` blob
`5ba0e45dbe24c155bfc69f4951292d77522217db`.

This document rewrites the Desktop guideline for Mira Cloud Web. Desktop provides the
visual/token and generic-component baseline. Mira Mobile provides interaction constraints
for touch, narrow screens and WebView hosting only.

## 1. Design character

Mira Cloud is quiet, warm, capable and information-first.

Use:
- restrained primary color;
- semantic neutral surfaces and borders;
- readable typography;
- small, deliberate elevation;
- compact workbench density on wide screens;
- progressive disclosure instead of large configuration walls.

Avoid:
- cyberpunk/AI gradients, glow and neon;
- robot/wand/sparkle icon clichés;
- card-on-card nesting as a substitute for hierarchy;
- oversized radii and shadows on ordinary workbench surfaces;
- decorative status colors unrelated to actual state.

## 2. Token authority

The only Web token authority is `apps/web/src/theme/mira-design/`.

Components consume Tailwind 4 semantic roles such as:

- `bg-surface-primary`, `bg-surface-secondary`, `bg-surface-elevated`;
- `text-text-primary`, `text-text-secondary`, `text-text-tertiary`;
- `border-border`;
- `bg-primary`, `text-primary`;
- semantic status families `success`, `warning`, `danger`, `info`;
- `rounded-ui-control`, `rounded-ui-panel`, `rounded-ui-overlay`,
  `rounded-ui-hero`.

Do not create a feature-local palette or copy raw Desktop variables. Do not restore the
retired Mobile-derived generator. Theme values are generated from the pinned Desktop
snapshot and verified by tests.

## 3. Themes

MiraDesign carries four presets, each in light and dark:

- `warm-neutral`;
- `knowledge-blue`;
- `archive-green`;
- `slate-ocean`.

A component must work from semantic roles, not from assumptions about one preset. Dark mode
is a real semantic theme, not a color inversion.

## 4. Density and layout

Wide screens use Desktop-derived workbench density:

- compact navigation and controls;
- readable information hierarchy;
- panels separated primarily by spacing/borders;
- multi-column layout only when each pane has enough room to remain legible.

Mobile guidance does **not** globally increase desktop control size or force a mobile layout
onto wide screens.

Narrow screens:

- use one primary column;
- move secondary detail behind progressive disclosure;
- do not squeeze desktop panes until content becomes unreadable;
- avoid horizontal hunting for primary actions;
- preserve readable line length and clear section order.

## 5. Touch and coarse pointer

For `pointer: coarse` / touch interaction, actionable surfaces target at least **44×44 CSS
px**. This is an interaction minimum, not a requirement that every desktop control become
44px tall.

Hover is enhancement only. Every operation remains understandable and reachable through
visible state, tap or keyboard.

The real Workspace shell uses the `mira-touch-target` hook only under coarse-pointer media
conditions so desktop density remains intact.

## 6. Safe Area, dynamic viewport and keyboard

Mobile WebView/browser layouts must:

- respect `env(safe-area-inset-top/right/bottom/left)` at viewport edges;
- prefer dynamic viewport units such as `dvh`, with a safe fallback;
- avoid placing primary actions behind the software keyboard;
- keep scrollable content recoverable after keyboard/viewport resize;
- avoid assuming native WebView identity grants a Cloud Web session.

The Workspace shell uses `100svh` + `100dvh`, Safe Area-aware navigation/content padding
and no fixed bottom action that can be trapped behind the keyboard.

## 7. Navigation

Use `NavItem` for router-aware workbench navigation. Do not recreate the active/hover/focus
visual contract in page CSS.

- Active state must remain explicit without hover.
- The root route uses exact matching when nested routes exist.
- Mobile horizontal navigation may remain scrollable when it is secondary navigation, but
  primary work content stays a single column.
- Brand/logo links are secondary to work once the user is inside the workspace.

## 8. Surfaces

Prefer, in order:

1. spacing and typography;
2. a subtle border;
3. a semantic surface;
4. a small shadow only when elevation has meaning.

Use:
- `Card` for lightweight grouping;
- `SectionCard` for titled information/settings groups;
- `Drawer` for contextual side detail;
- `Modal` for interruptive bounded interaction.

Do not add another rounded/bordered container inside `SectionCard` just to create rows.

## 9. Forms and actions

- Primary CTA: `Button variant="primary"`.
- Secondary actions: `secondary`, `outline` or `ghost` according to emphasis.
- Icon-only operations: `IconButton` with an accessible label.
- Boolean state: `Switch`.
- Selection: `Select` or `SearchSelectModal`, not a feature-local listbox.
- Text/numeric input: MiraDesign Input family.
- Destructive actions remain explicit and do not borrow success styling.

Actions with paid, destructive, permission-changing or external side effects require clear
human intent and result feedback. A confirmation component does not itself authorize the
side effect.

## 10. Feedback and failure

Cloud is a networked workspace; failure must remain understandable.

Every network-dependent feature should distinguish as applicable:

- initial loading;
- offline/unreachable;
- invalid response;
- permission denied;
- retrying/recovering;
- requested/pending;
- confirmed success;
- unknown outcome.

Recovery never silently rewrites an uncertain operation into success.

`ConnectionPanel` is the current reference: it distinguishes API offline, invalid API,
database unconfigured, database unavailable and infrastructure ready, while explicitly
stating that infrastructure readiness is not Cloud Auth or Cloud Pi readiness.

## 11. Typography

Use semantic hierarchy before color.

- Display: welcome/hero only.
- Heading 1/2: page and section hierarchy.
- Body / body-small / caption: content and metadata.
- Mono: code, paths, IDs, logs and structured technical values.

Avoid arbitrary one-off font sizes in reusable components when an existing semantic role
fits. Long-form Markdown may use a slightly roomier reading rhythm without redefining the
workbench UI scale.

## 12. Status semantics

Status color is meaning, not decoration.

Never collapse:
- requested → running;
- cancel_requested → cancelled;
- delivery success → execution success;
- same-account login → runtime permission;
- infrastructure ready → authenticated/Agent ready.

A status display includes text/icon semantics in addition to hue.

## 13. Content and heavy dependencies

`MarkdownText` and `MarkdownEditor` are intentionally isolated behind
`components/mira-design/content.ts`.

Do not statically import the heavy content entry into the Workspace shell or ordinary
navigation/forms. Load it where a real content feature needs it. This keeps the normal
workbench bundle independent of Streamdown/Milkdown startup cost.

## 14. Accessibility

- Preserve focus-visible.
- Icon actions require names.
- Dialogs/menus/tabs keep keyboard behavior and focus management.
- Forms associate label/help/error.
- Status must not be color-only.
- Text contrast targets WCAG normal-text 4.5:1, large/non-text 3:1 where applicable.
- Reduced-motion preference must not break comprehension.

## 15. Copy discipline

Use structure before explanation.

- If state can say it, do not add a paragraph.
- If an action can say it, do not add onboarding copy.
- Keep explanation for why an action is unavailable or what consequence it has.
- Do not make prototype fixtures sound like real Cloud execution.

## 16. Platform boundary

MiraDesign Web never implies:

- Electron/Tauri/preload access;
- Desktop Host tool permission;
- native Mobile session sharing;
- Cloud Pi execution;
- Cloud Auth grants;
- provider credentials.

Platform capability enters through explicit adapters/props owned by the feature/service
layer.

## 17. Review checklist

Before merging a shared visual/interaction change:

1. Is the component consuming MiraDesign semantic roles?
2. Does an existing MiraDesign primitive already own this behavior?
3. Is wide-screen density preserved?
4. Are 44×44 coarse-pointer targets addressed where relevant?
5. Are Safe Area, dynamic viewport, keyboard and narrow layout risks addressed?
6. Does the UI work without hover?
7. Are loading/error/recovery states truthful?
8. Are status distinctions preserved?
9. Did the change accidentally import Desktop runtime/business code?
10. Did it add a heavy dependency to the light entry?
11. Are nearby tests and Cloud-native docs still current?

For provenance and classification, see [MiraDesign Cutover Matrix](./mira-design-cutover.md).
