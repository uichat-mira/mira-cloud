# Mira Cloud — Design System

**Status:** Web design contract with AGT-047 Foundation plus AGT-048 Core and AGT-049 Advanced / Content MiraDesign source in the real React Web implementation. A prod-only Tencent path exists for the current Web/Hono/PostgreSQL foundation; this does not imply an authenticated Cloud business application, Cloud Pi integration, or an independently published Web component library.
**Owner of canonical Mira visual tokens:** [Mira Desktop `desktop/src/shared/theme/colorThemes.ts`](https://github.com/uichat-mira/mira-desktop/blob/dev/desktop/src/shared/theme/colorThemes.ts), [`desktop/src/styles.css`](https://github.com/uichat-mira/mira-desktop/blob/dev/desktop/src/styles.css), and [`desktop/tailwind.config.cjs`](https://github.com/uichat-mira/mira-desktop/blob/dev/desktop/tailwind.config.cjs). Mira Cloud pins a full Desktop commit and consumes it through the local Foundation; it does not maintain a second palette.

This `DESIGN.md` is **Mira Cloud's Web and Mobile-WebView design-consumption contract**, not a competing token authority. Refer to the [component library specification](docs/design/component-library.md) for the current React implementation contract and to the [workbench product brief](docs/product/workbench.md) for user journeys.

## 1. Visual identity

Quiet, warm, capable and information-first. Use restrained coral for the primary action, neutral warm canvases, clear text hierarchy, fine borders and generous whitespace. Status colors communicate actual meaning, not decorative hierarchy. Dense admin dashboards and excessive shadows are not Mira's default expression.

Mira Cloud should feel like Mira Desktop and Mira Mobile while respecting Web interaction: a shared product language, **not necessarily a shared component implementation**. Desktop remains a distinct local-first product; do not overwrite its native UX with a Web token package.

## 2. Sources, versioning and token distribution

AGT-047 pins Mira Desktop `dev` commit `5036067d3a87ba95d798e01ededc7fbd678327de`:

| Upstream source | Git blob SHA | Authority |
| --- | --- | --- |
| [`desktop/src/shared/theme/colorThemes.ts`](https://github.com/uichat-mira/mira-desktop/blob/dev/desktop/src/shared/theme/colorThemes.ts) | `95fcc33be0b6769cae4e5ba4e1e32de69aa5bef2` | Four presets, light/dark semantic colors and primary scales |
| [`desktop/src/styles.css`](https://github.com/uichat-mira/mira-desktop/blob/dev/desktop/src/styles.css) | `55c9f5622c8334f1b2bc0f38856241fae7562a4c` | Typography, radius, surface and shell reference |
| [`desktop/tailwind.config.cjs`](https://github.com/uichat-mira/mira-desktop/blob/dev/desktop/tailwind.config.cjs) | `591f6df8dde4f3726ecfce5d06fca6f2e19a099c` | Tailwind 3 semantic names, spacing, radius, shadow and type roles |

The implementation lives at `apps/web/src/theme/mira-design/`. Its `README.md` records the
upstream provenance; the unaltered Desktop snapshots are under `upstream/`.
`apps/web/scripts/generate-tokens.ts` converts Desktop RGB triplets into scoped
`--mira-color-*` variables and writes `themes.generated.ts` plus
`apps/web/src/styles/mira-design.generated.css`. `pnpm --filter @mira-cloud/web tokens:check`
fails on drift.

Mira Desktop's runtime theme value is `getThemeVariables()` from `colorThemes.ts`; its
initial `styles.css` block is a starting reference. Where those values differ slightly, the
Foundation follows `colorThemes.ts`. Font binaries are not migrated: the Foundation keeps
Desktop font stacks with system fallbacks and no proprietary font files.

## 3. Token inventory (representative, not a generated snapshot)

| Token family | Representative value | Web treatment |
| --- | --- | --- |
| Primary | `--color-primary = 193 95 60` (warm-neutral light) | Primary actions and selected states, never full-page background |
| Primary scale | `--color-primary-1` … `--color-primary-9` | Hover, pressed, soft and emphasis states |
| Warm neutral scales | `cloudy` / `pampas` 1–9 | Surfaces, borders and neutral hierarchy |
| Surface | `surface-primary`, `surface-auth`, `surface-soft`, `surface-secondary`, `surface-tertiary`, `surface-elevated` | Page, card, auth and elevation layers |
| Text / icon | `text-primary/secondary/tertiary/inverted`, `icon-primary/secondary/tertiary/inverted` | Semantic text and icon roles |
| Status | `success/warning/danger/info` × `solid/soft/border/text` | Status meaning, never decorative hierarchy |
| Spacing | `4 / 8 / 12 / 16 / 20 / 24 / 32 / 40px` | Gap, padding, section rhythm |
| Radius | `8 / 10 / 12 / 14 / 16 / 18 / 20px`, full pill | Controls, panels, overlays and hero surfaces |
| Typography | `display`, `heading-1`, `heading-2`, `body`, `body-small`, `caption` | Semantic size, weight and line-height roles |
| Motion | `150ms` / `200ms` | Restrained transitions only |

Values above document recognizable **examples only**. Exact values always come from the
pinned Desktop source and generated Foundation artifacts.

### Themes

The pinned `colorThemes.ts` exposes these **four presets**, each with distinct light/dark
semantic sets:

- `warm-neutral` — 暖陶米色 (default)
- `knowledge-blue` — 铁墨紫灰
- `archive-green` — 档案松绿
- `slate-ocean` — 海石灰蓝

Cloud Web preserves the **preset + appearance** model through Web-safe document attributes,
a `dark` class and a local-only visual preference. Never implement dark mode by mechanically
inverting colors. Theme transitions should avoid a flash of incorrect theme on first paint;
persisted preference must be scope-safe. Don't assume current cloud account already exposes
a theme sync endpoint.

### Web mapping contract (implemented by AGT-047)

`apps/web/src/theme/mira-design/` is the single Web token authority. It emits semantic,
theme-scoped CSS variables such as `--mira-color-surface-primary`,
`--mira-color-text-primary`, `--mira-color-icon-secondary`, `--mira-color-success-soft`,
`--mira-radius-ui-overlay`, `--mira-space-4`, `--mira-type-body-size` and
`--mira-motion-duration-150`. `apps/web/src/styles/globals.css` maps them into Tailwind 4
`@theme inline` entries, so components consume utilities such as `bg-surface-primary`,
`text-text-primary`, `text-icon-secondary`, `bg-success-soft`, `rounded-ui-overlay` and
`p-space-4`. Tailwind must refer to these variables, not duplicate raw hex values.

## 4. Typography and layout

- Prefer clear readable text over ornamental titles. Desktop's semantic roles are
  `display=28`, `heading-1=20`, `heading-2=16`, `body=14`, `body-small=13`, `caption=12`,
  with explicit weights and line heights. Web uses user zoom and responsive layout; do not
  hardcode per-component sizes.
- Minimum accessible contrast: normal text 4.5:1, large text 3:1, meaningful controls/state indicators 3:1; do not convey success/error by hue alone.
- Surface/spacing establishes structure: subtle borders before shadows, fixed control heights where useful, restrained elevation for genuinely floating surfaces.
- Responsive workbench: single column and reachable actions on narrow devices; wider layouts may provide navigation rail and detail panes. Respect WebView safe areas, keyboard insets and dynamic viewport height; never assume WebView native identity automatically reaches a Cloud Web session.
- Prefer system / platform font stacks unless a new brand font is explicitly approved; do not import proprietary font files into this repository.

## 5. Interaction and component behavior

The [component catalog](docs/design/component-library.md) defines both basic primitives and Cloud-specific task/run/artifact patterns. It is a **design contract**; components cannot claim real ability simply because prototype fixtures are interactive.

Every interactive component needs:

- Real pending/disabled/focus/pressed/error states; keyboard access and meaningful focus outlines.
- Accessible name and semantic role; dialogs return focus after closing; forms provide validation messages and support screen readers.
- Explicit empty, loading, retry, offline, permission-denied and eventual-success states for Cloud data.
- Real **execution location** labeling (`Cloud` vs `Desktop Local` vs `Mobile Local` vs `Remote Host`).
- Correct operation wording: `requested` is not `running`; `cancel_requested` is not `cancelled`; `delivered` is not `run succeeded`.
- Destructive and paid/external effects need explicit human approval and state feedback, not merely an attractive confirmation dialog.
- No implied shared token/session/Tool authority across WebView, Desktop, Cloud Pi and Cloud Auth.

## 6. Design review checklist

1. Does it match the pinned Mira Desktop semantic Token and preset/light/dark rules (pin a verified upstream SHA)?
2. Does the chosen component already exist, or is it a genuine shared primitive? Avoid unnecessary component proliferation.
3. Are mobile viewport, touch size, safe area, keyboard and desktop keyboard navigation actually addressed?
4. Is the status visual true to Cloud Pi / Cloud Core owner facts? No fake "completed" or "delivered".
5. Do loading, permission denial, empty, offline, retry and long-running states remain understandable without relying on color?
6. Has contrast been checked on all selected theme/preset combinations?
7. Is the design a specification, a static prototype, or an implemented screen? Label it accordingly.

## 7. Status of existing prototype

[`prototypes/workbench-v0.1/`](prototypes/workbench-v0.1/) predates this contract and uses mock data and localStorage. It does not prove Desktop theme/preset parity, Cloud OAuth, deployed UI, or reusable React components. Future work should reconcile the prototype against this document and the MiraDesign Foundation before converting it to production code.
