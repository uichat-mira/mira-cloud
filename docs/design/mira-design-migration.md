# MiraDesign Core UI Migration Record (AGT-048)

**Status:** implemented source record for Issue #62. Mira Cloud owns this copy of the
migrated components; there is no Desktop runtime import or cross-repository package.

The component sources below were migrated from the pinned
`uichat-mira/mira-desktop` commit `5036067d3a87ba95d798e01ededc7fbd678327de`
(the same revision pinned by the [MiraDesign Web Foundation](../../apps/web/src/theme/mira-design/README.md)).
Each blob SHA is the Git object identity of the upstream file at that commit.

## Migration matrix

| Component | Upstream source and blob SHA | Cloud destination | Upstream test blob |
| --- | --- | --- | --- |
| Alert | `desktop/src/shared/ui/Alert.tsx`<br>`d5f1b4b8780b9b6e7c57e15ff94887733243fb4e` | `apps/web/src/components/mira-design/Alert.tsx` | 61d1a72414fe19eead885fbb192ace1046efcb3a |
| Badge | `desktop/src/shared/ui/Badge.tsx`<br>`79b1d227537e6ea0a52942b9e2678c400626567f` | `apps/web/src/components/mira-design/Badge.tsx` | 4c96c0a8a945f0e2d6d2c9fdf15df8aa2097a5a8 |
| Button | `desktop/src/shared/ui/Button.tsx`<br>`a3e8d4ce1df964e50ae6c6d03b498da0c0a6ac3c` | `apps/web/src/components/mira-design/Button.tsx` | 7b0d29d1894b3083195b3a43b390e61f65ca394f |
| Card | `desktop/src/shared/ui/Card.tsx`<br>`2c0f388c8e6a05e85a069a7ac874190135c3a22e` | `apps/web/src/components/mira-design/Card.tsx` | 8ac90064fbce89a9f5812e8f632791e894d00694 |
| SectionCard | `desktop/src/shared/ui/SectionCard.tsx`<br>`1634616847b898fad890a78b31f48de5d651f40d` | `apps/web/src/components/mira-design/SectionCard.tsx` | 47f5cf1954a8b9e60adedeb6316853040f874f77 |
| Divider | `desktop/src/shared/ui/Divider.tsx`<br>`77ef1cb42d37b86c00e4158a72f2318163dba1a0` | `apps/web/src/components/mira-design/Divider.tsx` | f9d03d2b72c311a024f97c515d002020faabc056 |
| Input | `desktop/src/shared/ui/Input.tsx`<br>`b474bcf775003985ef46d01ee6f33b8f4726f5e8` | `apps/web/src/components/mira-design/Input.tsx` | 6635e4977a3c88b46ee4b93f9f83185cac6da4ae |
| Skeleton | `desktop/src/shared/ui/Skeleton.tsx`<br>`fbbca56126de76ece42811c081db6b7619981168` | `apps/web/src/components/mira-design/Skeleton.tsx` | 5c90b6a07ed75f51b5ab8c92e8742b14df9f674f |
| Switch | `desktop/src/shared/ui/Switch.tsx`<br>`526ca43756021fbb67ac78ecbc7d24e24ef51d16` | `apps/web/src/components/mira-design/Switch.tsx` | b3e2e050da08f0dd93c4bf70b6621c5ee1be2325 |
| Slider | `desktop/src/shared/ui/Slider.tsx`<br>`60c8c9a5043716d866c69de4247f84301e8e2039` | `apps/web/src/components/mira-design/Slider.tsx` | no upstream test; equivalent T1 added |
| Tag | `desktop/src/shared/ui/Tag.tsx`<br>`946ec0d48f825351c7c053b89b6b67e6531ce939` | `apps/web/src/components/mira-design/Tag.tsx` | 00b51979c3803c71534032bda6d16c58806cf09a |
| TagInput | `desktop/src/shared/ui/TagInput.tsx`<br>`83276256c904e4ef56ccfbd59ba09ea7e3f98118` | `apps/web/src/components/mira-design/TagInput.tsx` | 0d5cdc4c5227c3c859f9335c21e7490bb875a724 |
| Tooltip | `desktop/src/shared/ui/Tooltip.tsx`<br>`4cd6d7c10cfe0ef97592b5753fa3844d67bc9e47` | `apps/web/src/components/mira-design/Tooltip.tsx` | 8a74c96747c5c8dd88c7e91015df662f24ad910b |
| NavItem | `desktop/src/shared/ui/NavItem.tsx`<br>`bf91a6c2173db33a7e2b63222a6676ef6c5899e1` | `apps/web/src/components/mira-design/NavItem.tsx` | d08bbdf1f8f8f1fe9ec14e1f444340a1ba1f9b9d |
| SegmentedTabs | `desktop/src/shared/ui/SegmentedTabs.tsx`<br>`891fadda1c6b83b14a75564ab2925fb56866cce3` | `apps/web/src/components/mira-design/SegmentedTabs.tsx` | 8f84858e7f289f6052f2915a393376ff29c498c4 |
| TabCard | `desktop/src/shared/ui/TabCard.tsx`<br>`a2df164393f4b93ee6c1426293f8d5f1fabb8d00` | `apps/web/src/components/mira-design/TabCard.tsx` | a0343441b0cdbf1c763d2c82c0ff8317649d1a13 |
| CollapsiblePanel | `desktop/src/shared/ui/CollapsiblePanel.tsx`<br>`08c6f4c0d82a2cbb1d145c3b7014c4c2eaa5bca4` | `apps/web/src/components/mira-design/CollapsiblePanel.tsx` | cccc621eed9e8a6bb27b90a7a2f48a83cb4ad611 |
| ExpandableSection | `desktop/src/shared/ui/ExpandableSection.tsx`<br>`0ee1580dabb79bb75b6dce104eddb17e57f5aa7a` | `apps/web/src/components/mira-design/ExpandableSection.tsx` | fe872475ad76db25b6fe1879fdfbbfa568246ca4 |
| Drawer | `desktop/src/shared/ui/Drawer.tsx`<br>`9cdbcc3cb3e58c004a17340204e7863ca8572f23` | `apps/web/src/components/mira-design/Drawer.tsx` | f37168fb979fb6dd7c7291e458060fb48128c2b9 |
| DropdownMenu | `desktop/src/shared/ui/DropdownMenu.tsx`<br>`8b579a5cefb12ce84c444adcb021ec96d654f1f2` | `apps/web/src/components/mira-design/DropdownMenu.tsx` | c1d0ed57456e3af2ce7b2bbbbc98d6ccedb91e1f |
| ConfirmDialog | `desktop/src/shared/ui/ConfirmDialog.tsx`<br>`bcc3b3a39587f34ea5d11e0501bbe97f4524858d` | `apps/web/src/components/mira-design/ConfirmDialog.tsx` | b0386a11b711a5b751188938a68eb7fec8a4735a |
| Message | `desktop/src/shared/ui/Message.tsx`<br>`947872e17b35235d18a07a254bd4cde1f3e9c23f` | `apps/web/src/components/mira-design/Message.tsx` | 7932629dcdfe1ebe6b80528502b45dcc5caf821e |
| Result | `desktop/src/shared/ui/Result.tsx`<br>`749a9a2dd3762985c6a2e5e6c5aa2d77803fb51b` | `apps/web/src/components/mira-design/Result.tsx` | e2897a4289029d6a229f6e8fb205313b10ecfd0b |
| FullPageStatus | `desktop/src/shared/ui/FullPageStatus.tsx`<br>`82e71a264512bf1602bef380856c5438a33f2419` | `apps/web/src/components/mira-design/FullPageStatus.tsx` | 95e07ec84ea8ef0f62dfce6834522c4a4b386ea8 |
| FileIcon | `desktop/src/shared/ui/FileIcon.tsx`<br>`0f76517da096aba137dd3faf6464fe2b86c978b5` | `apps/web/src/components/mira-design/FileIcon.tsx` | bfa00ac2cbe7562d644533d47104c15598491c5d |
| ImagePreviewOverlay | `desktop/src/shared/ui/ImagePreviewOverlay.tsx`<br>`b9b576758ce34d7a470d3c5d65d5c2b64c2f23b0` | `apps/web/src/components/mira-design/ImagePreviewOverlay.tsx` | 355efe906993b2e954d83adbbc89757bc49e96e8 |
| StepIndicator | `desktop/src/shared/ui/StepIndicator.tsx`<br>`c31c0d616610195f61f4ff7697976ba175be7241` | `apps/web/src/components/mira-design/StepIndicator.tsx` | 2ae00a04a62f37e8645fc97c8a694c79a5dc8687 |
| TerminalPanel | `desktop/src/shared/ui/TerminalPanel.tsx`<br>`6d2c26ed02cddf6b71c63183bfcda13bf739df88` | `apps/web/src/components/mira-design/TerminalPanel.tsx` | a124f2abcf6bd73f494940afa62eef6bbb952e54 |
| WelcomePanel | `desktop/src/shared/ui/WelcomePanel.tsx`<br>`721aae05594f30f768bc01a4f49d57e32ea3bd44` | `apps/web/src/components/mira-design/WelcomePanel.tsx` | 969dd9a37b6d1dfd021dd9fb1e585b979aa3fc28 |

All components are exported from `apps/web/src/components/mira-design/index.ts`.
The previous Cloud-only primitives under `apps/web/src/components/ui/` were removed rather
than left as a second implementation.

## Web adaptations

- React 19 function components and `type`-only imports replace Desktop React 18 patterns.
- Tailwind 4 semantic roles from the AGT-047 Foundation replace Desktop Tailwind 3 config
  assumptions. No `mira-*` parallel alias or Desktop runtime import is used.
- `NavItem` consumes Cloud's existing `react-router` dependency instead of
  `react-router-dom`.
- `Tooltip` keeps the Desktop `react-tooltip` behavior and attributes on the pinned
  `react-tooltip@6.0.7` dependency.
- `DropdownMenu` keeps the Radix accessible menu behavior on
  `@radix-ui/react-dropdown-menu@2.1.18`; no Desktop wrapper or service is imported.
- Desktop i18n remains outside the source. Component-facing strings stay explicit props,
  with the same neutral Chinese defaults used by `ConfirmDialog`.
- `FileIcon` maps PDF/XLSX/other to the Foundation `danger`/`success`/`info` status roles
  instead of introducing a second raw palette.
- `Slider` uses the Cloud `--mira-color-*` variables for its native range track.

## Deferred components

Table, Markdown/Editor, SearchSelect, NavigationCardTabs and other components with heavy
or Desktop-specific dependencies remain out of this migration and belong to AGT-049.
Desktop business UI and Access Point/Coverage/MicroFrontend surfaces are not part of the
MiraDesign base layer.

## Evidence

- Source and test ownership: `apps/web/tests/mira-design/`.
- Import and ownership audit: `apps/web/tests/mira-design/boundary.test.ts`.
- Foundation provenance remains covered by `apps/web/tests/theme.test.ts`.
- Verification commands: `pnpm --filter @mira-cloud/web check` and `pnpm check`.
