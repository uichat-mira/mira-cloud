# Mira Cloud — Design System

**Status:** Web design contract with an AGT-042 P0 static React implementation; no independently published Web component library or deployed Cloud application.
**Owner of canonical Mira visual tokens:** [Mira Mobile `src/theme/tokens.ts`](https://github.com/uichat-mira/mira-mobile/blob/dev/src/theme/tokens.ts), [`palette.ts`](https://github.com/uichat-mira/mira-mobile/blob/dev/src/theme/palette.ts), and [Mobile `DESIGN.md`](https://github.com/uichat-mira/mira-mobile/blob/dev/DESIGN.md).

This `DESIGN.md` is **Mira Cloud's Web and Mobile-WebView design-consumption contract**, not a competing token authority. Refer to [component library specification](docs/design/component-library.md) for the future React implementation plan and to [workbench product brief](docs/product/workbench.md) for user journeys.

## 1. Visual identity

Quiet, warm, capable and information-first. Use restrained coral for the primary action, neutral warm canvases, clear text hierarchy, fine borders and generous whitespace. Status colors communicate actual meaning, not decorative hierarchy. Dense admin dashboards and excessive shadows are not Mira's default expression.

Mira Cloud should feel like Mira Mobile while respecting Web/desktop interaction: a shared product language, **not necessarily a shared component implementation**. Desktop remains a distinct local-first product; do not overwrite its native UX with a Web token package.

## 2. Sources, versioning and token distribution

As verified on Mira Mobile `dev` on 2026-11-11:

| Upstream source | Observed SHA | Authority |
| --- | --- | --- |
| [`src/theme/tokens.ts`](https://github.com/uichat-mira/mira-mobile/blob/dev/src/theme/tokens.ts) | `tokens.ts`: `00c242f81edf062e44e951851e8b7ecd50e18a1f` | Base spacing, type scale, radii, primary/colors, sizing |
| [`src/theme/palette.ts`](https://github.com/uichat-mira/mira-mobile/blob/dev/src/theme/palette.ts) | `palette.ts`: `271e3427bb93a55a54c3e95ef6f78c595048a4fd` | Runtime preset light/dark semantic colors |
| [`DESIGN.md`](https://github.com/uichat-mira/mira-mobile/blob/dev/DESIGN.md) | `DESIGN.md`: `8a0923627fcdb3cddb4530682a75cdf11f9d5854` | Principles, component behaviors, usage examples |

The table records **file blob SHAs** seen during this design review, not a complete locked upstream repository commit. Before implementing any `design-tokens` package, pin a **full Mira Mobile Git commit SHA** and verify these files together.

**Future authorized build path:** a deterministic source adapter reads a pinned upstream revision, maps semantic tokens to versioned Web CSS custom properties and Tailwind 4 theme variables, and runs a CI drift/contract check. The generator/adapter has to handle named presets, light/dark themes and runtime text scaling explicitly. It must not retype a second independent palette in Mira Cloud.

Current Mira Mobile canonical color sources have **two distinct layers**: `tokens.ts` contains base colors, and `palette.ts` provides concrete `light` / `dark` values for each preset. These are not interchangeable. When values differ between a base status token and a palette preset's status token, **use the selected runtime palette** for themed UI; don't secretly copy a base constant.

## 3. Token inventory (representative, not a generated snapshot)

| Token family | Representative value | Web treatment |
| --- | --- | --- |
| Primary | `colors.primary = #c96442` | Primary actions and selected states, never full-page background |
| Main canvas | `colors.bg.canvas = #f5f4ed` | Warm page background in default light preset |
| Card | `colors.bg.card = #faf9f5` | Card/input surface, subtle border |
| Ink | `colors.text.ink = #141413` | Page titles and high-contrast text |
| Text | `colors.text.base = #3d3d3a` | Normal body text |
| Border | `colors.border.default = #e8e6dc` | Subtle separation |
| Spacing | `4 / 8 / 12 / 16 / 24 / 32px` | Gap, padding, section rhythm |
| Radius | `8 / 12 / 16 / 20px`, full pill | Inputs and components |
| Minimum touch target | `44` logical units in Mobile | For touch Web surfaces, target at least `44×44` CSS px |
| Typography | `displayLg`, `displaySm`, `titleXl`, `titleLg`, `titleMd`, `bodyMd`, `button`, `caption`, `code` | Semantic type roles; use rem and Web zoom/user font scaling; no raw pixel hardcoding per component |

Values above document recognizable **examples only**. They are not an authoritative copy of every preset, the typography runtime scaling functions or every status token. Exact values always come from the pinned upstream source.

### Themes

The current `palette.ts` exposes these **four presets**, each with distinct light/dark semantic sets:

- `default` — 暖陶米色
- `knowledge-blue` — 铁墨紫灰
- `archive-green` — 档案墨绿
- `slate-ocean` — 岩板海雾

Cloud Web must preserve the **preset + appearance** model if user theme settings are introduced. Never implement dark mode by mechanically inverting colors. Theme transitions should avoid a flash of incorrect theme on first paint; persisted preference must be scope-safe. Don't assume current cloud account already exposes a theme sync endpoint.

### Web mapping contract (planned, not implemented)

Use semantic, theme-scoped CSS variables such as `--mira-color-primary`, `--mira-color-canvas`, `--mira-color-card`, `--mira-color-text`, `--mira-color-border`, `--mira-radius-card`, `--mira-space-md`. Tailwind must refer to these variables, not duplicate raw hex values. Components consume semantic roles; brand values are mapped in one generated adapter.

AGT-042 provides deterministic semantic CSS variables generated from a pinned Mobile revision, consumed by Tailwind CSS 4 in the local Web package. This does not create an independent token authority.

## 4. Typography and layout

- Prefer clear readable text over ornamental titles. Mobile's canonical base type scale includes `bodyMd=16`, `button=14`, `caption=13`, but Web uses responsive `rem` / user zoom, not hardcoded React Native `pt`.
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

1. Does it match current Mira Mobile semantic Token and preset/light/dark rules (pin a verified upstream SHA)?
2. Does the chosen component already exist, or is it a genuine shared primitive? Avoid unnecessary component proliferation.
3. Are mobile viewport, touch size, safe area, keyboard and desktop keyboard navigation actually addressed?
4. Is the status visual true to Cloud Pi / Cloud Core owner facts? No fake "completed" or "delivered".
5. Do loading, permission denial, empty, offline, retry and long-running states remain understandable without relying on color?
6. Has contrast been checked on all selected theme/preset combinations?
7. Is the design a specification, a static prototype, or an implemented screen? Label it accordingly.

## 7. Status of existing prototype

[`prototypes/workbench-v0.1/`](prototypes/workbench-v0.1/) predates this contract and uses mock data and localStorage. It does not prove theme/preset parity, Cloud OAuth, deployed UI, or reusable React components. Future work should reconcile the prototype against this document before converting it to production code.
