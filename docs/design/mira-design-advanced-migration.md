# MiraDesign Advanced & Content Migration Record (AGT-049)

**Status:** implemented source record for Issue #63.
**Pinned upstream:** `uichat-mira/mira-desktop@5036067d3a87ba95d798e01ededc7fbd678327de`.

This batch extends the Cloud-owned MiraDesign layer with generic Advanced and Content
components. The source is copied/adapted into Mira Cloud; no Desktop runtime package,
request layer, preload bridge, i18n runtime, or cross-repository import is used.

## Migration matrix

| Component               | Desktop source blob                        | Cloud classification   | Cloud adaptation                                                                                                |
| ----------------------- | ------------------------------------------ | ---------------------- | --------------------------------------------------------------------------------------------------------------- |
| Table                   | `be99e13840dc2ff040b129c3141607616f7c2021` | direct Web migration   | TanStack Table; semantic MiraDesign surfaces/shadows; browser resize only                                       |
| NavigationCardTabs      | `1ec9eee245e5d892bddff7bca55990340e3410c8` | direct Web migration   | Radix Tabs + existing Dropdown Menu; no platform service                                                        |
| Select                  | `46746f8f567efe16c39dd0d058c7899e2f999eec` | Web-adapted            | removes react-i18next; placeholder/no-options copy is explicit props                                            |
| Modal                   | `0bf0034d237b2c038a1bf13b9f85c674aacf9e69` | Web-adapted            | removes i18n and module-global provider reference; static API uses `mira-design:modal` browser events           |
| SearchSelectModal       | `73f40bf021f1eea315447cd0328a94850515663b` | injected data boundary | removes Desktop `get(url)`; caller supplies `loadItems(AbortSignal)`                                            |
| SearchSelectModalChrome | `fea26d7dcd3b2a8822480a03e69bc569ead2269c` | direct Web migration   | Cloud-owned modal and scrollbar hook                                                                            |
| MarkdownText            | `a2ed6ac820e1ba927190d47b28f830af1ae8e136` | heavy content / lazy   | Streamdown + code/math/mermaid plugins; removes chat-specific skill-report marker behavior                      |
| MarkdownEditor          | `c30698ffae33d121346b2201ff2e303bd9c4a2ba` | heavy content / lazy   | Milkdown Crepe; Cloud owns editor layout CSS under `mira-markdown-editor`                                       |
| CodeBlock               | `8da9e06093c1bd93e45db098db847f321899aa8d` | direct Web migration   | uses Core Card and MiraDesign semantic roles                                                                    |
| StreamingTextRenderer   | `e9067c10b019ce8c718b9cc055769ff65bf8834d` | Web-adapted            | keeps grapheme/reduced-motion pacing; removes Desktop module-global publish/subscribe state                     |
| CompactAudioPlayer      | `2a34ffb6b5689eb35f83003913d538c44f9c9477` | Web-adapted            | native audio/portal retained; hardcoded private palette and Desktop slider classes replaced by MiraDesign roles |
| AvatarPicker            | `807cbae791792ea208a9c7cdfa6ac877c7fe77f2` | Web-adapted            | removes i18n; copy is explicit/injectable labels; consumes Core Modal/Badge/ImagePreview                        |
| FileListItem            | `3ad0db4ed0ecf7b7f06a9c8751a10bda0509d9a3` | Web-adapted            | removes i18n; remove label is explicit prop                                                                     |
| FileUploadDropzone      | `9a60df73622e567fca1ac5e74b9f7a10d9895048` | Web-adapted            | removes i18n/DataTransfer rebuilding; returns bounded browser `File[]`                                          |
| ErrorBoundary           | `109a3caa28dbee30c45add1e81ca51f34d2d5c85` | Web-adapted            | removes i18n and react-router-dom; uses Cloud `react-router` and explicit labels                                |
| ExternalLink            | `9f5da5641c72f538b528c15601b14b6f465ff7ae` | capability adapter     | removes Desktop host/runtime/clipboard helpers; browser defaults plus injectable `openUrl`/`copyText`           |
| StatusIndicator         | `c298c6d84dbd10b727800cdea9ce3996d545efa0` | Web-adapted            | removes i18n; visible text is default so status is not color-only                                               |

All source paths originate under Desktop `desktop/src/shared/ui/<Component>.tsx` and land
under Cloud `apps/web/src/components/mira-design/<Component>.tsx`.

## Boundary decisions

### Data is injected, not fetched by UI

`SearchSelectModal` accepts:

```ts
loadItems: (signal: AbortSignal) => Promise<SearchSelectModalItem[]>;
```

The component owns loading/search/submission UI only. URL construction, authentication,
API clients, retries, and response normalization belong to the caller/service layer.

### Platform capabilities are explicit

`ExternalLink` defaults to browser `window.open` and `navigator.clipboard`, while also
accepting `openUrl` and `copyText` adapters. It has no Desktop host-kind switch,
preload call, or implicit local-tool permission.

`Modal` preserves both Provider/hook and static call styles without a mutable module-global
provider pointer. Static commands are delivered to a mounted provider using the namespaced
`mira-design:modal` browser event.

### Content is separated from the light entry

`MarkdownText` and `MarkdownEditor` are intentionally **not** statically re-exported from
the normal `mira-design/index.ts` entry. Consumers can use:

- import the explicit heavy `mira-design/content.ts` entry only from a feature that needs content UI, then call `loadMarkdownText()` or `loadMarkdownEditor()`.
- the main `mira-design/index.ts` barrel intentionally does not reference Streamdown, Milkdown or KaTeX, so Core/Advanced consumers do not pull heavy content assets into the first-load graph.

This prevents a Core/Advanced-only import from pulling Streamdown/Milkdown into the initial
application JavaScript.

## Direct dependencies

AGT-049 adds only packages imported by the migrated Cloud source:

- `@radix-ui/react-select@2.3.1`
- `@radix-ui/react-tabs@1.1.13`
- `@tanstack/react-table@8.21.3`
- `streamdown@2.5.0`
- `@streamdown/code@1.1.1`
- `@streamdown/math@1.0.2`
- `@streamdown/mermaid@1.0.2`
- `katex@0.17.0`
- `@milkdown/crepe@7.21.2`
- `@milkdown/react@7.21.2`

Desktop also declares `mermaid`, `@mermaid-js/parser`, and `@milkdown/kit` directly.
Cloud does not: the migrated source does not import them, and typecheck/build remain valid
without those direct declarations.

## Bundle evidence

A local production Vite build on this branch after dependency minimization produced:

- initial JS: about **326.17 kB raw / 105.79 kB gzip**;
- AGT-048 baseline initial JS: about **323.88 kB raw / 105.14 kB gzip**;
- initial CSS: about **89.01 kB raw / 15.19 kB gzip**;
- AGT-048 baseline CSS: about **71.16 kB raw / 12.71 kB gzip**;
- heavy Markdown/content dynamic chunk: about **495.74 kB raw / 145.33 kB gzip**.

The HTML entry references only the initial JS/CSS and tiny runtime preload; the heavy content
chunk is not module-preloaded. Vite emits KaTeX font assets for the Markdown capability, but
the initial CSS contains no KaTeX rules or `@font-face` declarations.

These numbers are evidence for the tested build, not permanent performance budgets.

## Explicit exclusions

The following Desktop surfaces remain outside MiraDesign by contract:

- `AccessPointPreviewDrawer`
- `CoverageReportPanel`
- `MicroFrontend`
- UChat Thread / Knowledge / RAG / evaluation UI
- Desktop Host / Session / Access Point business components
- Desktop request/service/preload/runtime helpers

## Verification ownership

- behavior tests: `apps/web/tests/mira-design/advanced-components.test.tsx`;
- heavy-content loading tests: `apps/web/tests/mira-design/content-components.test.tsx`;
- static ownership/dependency guards: `apps/web/tests/mira-design/boundary.test.ts`;
- full Web verification: `pnpm --filter @mira-cloud/web check`;
- repository verification: `pnpm check` and Mira Gate.
