# MiraDesign Web Foundation

This directory is the single visual-token authority for the Mira Cloud Web workspace.
It is derived from **Mira Desktop** design assets, pinned to the full repository commit
`5036067d3a87ba95d798e01ededc7fbd678327de` (`uichat-mira/mira-desktop`, branch `dev`).

## Pinned upstream sources

| Mira Desktop source | Git blob SHA | Use |
| --- | --- | --- |
| `desktop/src/shared/theme/colorThemes.ts` | `95fcc33be0b6769cae4e5ba4e1e32de69aa5bef2` | Four presets, light/dark semantic colors and primary scales |
| `desktop/src/styles.css` | `55c9f5622c8334f1b2bc0f38856241fae7562a4c` | Typography, radius, surface and shell reference |
| `desktop/tailwind.config.cjs` | `591f6df8dde4f3726ecfce5d06fca6f2e19a099c` | Tailwind 3 semantic names, spacing, radius, shadow and type roles |

The files under `upstream/` are unaltered snapshots. Do not edit them by hand.
`colorThemes.ts` is the authority for runtime theme values because Desktop's
`ThemeProvider` applies `getThemeVariables()` over the initial values in `styles.css`.
Where those initial CSS values differ slightly, the generated Foundation follows
`colorThemes.ts`. Desktop derives primary scales with `@ant-design/colors@8.0.1`; the
package is a Web devDependency used only by generation/tests and is not shipped to the
browser. Font binaries are not migrated; only the Desktop font stacks are kept.

## Generated artifacts

`apps/web/scripts/generate-tokens.ts` reads the pinned `colorThemes.ts`, converts Desktop
`--color-*` RGB triplets into scoped Web `--mira-color-*` variables, and writes:

- `themes.generated.ts` - preset metadata and all four presets x light/dark color sets.
- `apps/web/src/styles/mira-design.generated.css` - generated CSS custom properties.

`foundation.ts` adds theme-independent spacing, radius, shadow, typography and motion
tokens from `tailwind.config.cjs` / `styles.css`. `index.ts` is the public Foundation API.
`apps/web/src/styles/globals.css` maps the semantic variables into Tailwind CSS 4
`@theme inline` entries.

The Web-safe theme switch uses document attributes (`data-mira-color-theme`,
`data-mira-theme-mode`) and a `dark` class; it does not depend on Electron, Tauri or a
Desktop provider. A local `localStorage` key stores only the visual preference.

Run `pnpm --filter @mira-cloud/web tokens:generate` after changing the pinned upstream
revision, then review the generated diff and run the Web checks.
