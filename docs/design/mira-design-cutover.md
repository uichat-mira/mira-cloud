# MiraDesign — Final Cutover Matrix

**Status:** AGT-050 final inventory and cutover record.
**Pinned upstream:** `uichat-mira/mira-desktop@5036067d3a87ba95d798e01ededc7fbd678327de`.

This matrix is the final classification of every non-test top-level source module under
`desktop/src/shared/ui/` at the pinned revision. It closes the migration inventory without
creating a live cross-repository dependency.

## Documentation provenance

| Upstream document | Blob SHA | Cloud rewrite |
| --- | --- | --- |
| `desktop/src/shared/ui/COMPONENTS.md` | `29182dd13cff79246f082b543812ead06db2902d` | [`mira-design-components.md`](./mira-design-components.md) |
| `desktop/src/shared/ui/ui-design-guidelines-tailwind.md` | `5ba0e45dbe24c155bfc69f4951292d77522217db` | [`mira-design-guidelines.md`](./mira-design-guidelines.md) |

## Full shared-UI inventory

| Desktop source | Blob SHA | Decision | Cloud target |
| --- | --- | --- | --- |
| `desktop/src/shared/ui/AccessPointPreviewDrawer.tsx` | `a66e80e786250949c6f7ff03275c98f8e12f20f7` | exclude — Access Point business semantics | — |
| `desktop/src/shared/ui/Alert.tsx` | `d5f1b4b8780b9b6e7c57e15ff94887733243fb4e` | direct/adapted Web migration | `apps/web/src/components/mira-design/Alert.tsx` |
| `desktop/src/shared/ui/AvatarPicker.tsx` | `807cbae791792ea208a9c7cdfa6ac877c7fe77f2` | migrate + Web decouple | `apps/web/src/components/mira-design/AvatarPicker.tsx` |
| `desktop/src/shared/ui/Badge.tsx` | `79b1d227537e6ea0a52942b9e2678c400626567f` | direct/adapted Web migration | `apps/web/src/components/mira-design/Badge.tsx` |
| `desktop/src/shared/ui/Button.tsx` | `a3e8d4ce1df964e50ae6c6d03b498da0c0a6ac3c` | direct/adapted Web migration | `apps/web/src/components/mira-design/Button.tsx` |
| `desktop/src/shared/ui/Card.tsx` | `2c0f388c8e6a05e85a069a7ac874190135c3a22e` | direct/adapted Web migration | `apps/web/src/components/mira-design/Card.tsx` |
| `desktop/src/shared/ui/CodeBlock.tsx` | `8da9e06093c1bd93e45db098db847f321899aa8d` | direct/adapted Web migration | `apps/web/src/components/mira-design/CodeBlock.tsx` |
| `desktop/src/shared/ui/CollapsiblePanel.tsx` | `08c6f4c0d82a2cbb1d145c3b7014c4c2eaa5bca4` | direct/adapted Web migration | `apps/web/src/components/mira-design/CollapsiblePanel.tsx` |
| `desktop/src/shared/ui/CompactAudioPlayer.tsx` | `2a34ffb6b5689eb35f83003913d538c44f9c9477` | migrate + Web decouple | `apps/web/src/components/mira-design/CompactAudioPlayer.tsx` |
| `desktop/src/shared/ui/ConfirmDialog.tsx` | `bcc3b3a39587f34ea5d11e0501bbe97f4524858d` | direct/adapted Web migration | `apps/web/src/components/mira-design/ConfirmDialog.tsx` |
| `desktop/src/shared/ui/CoverageReportPanel.tsx` | `3a51b63b148770394ccef10f3f295b0ddf992d4b` | exclude — development/test reporting surface | — |
| `desktop/src/shared/ui/Divider.tsx` | `77ef1cb42d37b86c00e4158a72f2318163dba1a0` | direct/adapted Web migration | `apps/web/src/components/mira-design/Divider.tsx` |
| `desktop/src/shared/ui/Drawer.tsx` | `9cdbcc3cb3e58c004a17340204e7863ca8572f23` | direct/adapted Web migration | `apps/web/src/components/mira-design/Drawer.tsx` |
| `desktop/src/shared/ui/DropdownMenu.tsx` | `8b579a5cefb12ce84c444adcb021ec96d654f1f2` | direct/adapted Web migration | `apps/web/src/components/mira-design/DropdownMenu.tsx` |
| `desktop/src/shared/ui/ErrorBoundary.tsx` | `109a3caa28dbee30c45add1e81ca51f34d2d5c85` | migrate + Web decouple | `apps/web/src/components/mira-design/ErrorBoundary.tsx` |
| `desktop/src/shared/ui/ExpandableSection.tsx` | `0ee1580dabb79bb75b6dce104eddb17e57f5aa7a` | direct/adapted Web migration | `apps/web/src/components/mira-design/ExpandableSection.tsx` |
| `desktop/src/shared/ui/ExternalLink.tsx` | `9f5da5641c72f538b528c15601b14b6f465ff7ae` | migrate + Web decouple | `apps/web/src/components/mira-design/ExternalLink.tsx` |
| `desktop/src/shared/ui/FileIcon.tsx` | `0f76517da096aba137dd3faf6464fe2b86c978b5` | direct/adapted Web migration | `apps/web/src/components/mira-design/FileIcon.tsx` |
| `desktop/src/shared/ui/FileListItem.tsx` | `3ad0db4ed0ecf7b7f06a9c8751a10bda0509d9a3` | migrate + Web decouple | `apps/web/src/components/mira-design/FileListItem.tsx` |
| `desktop/src/shared/ui/FileUploadDropzone.tsx` | `9a60df73622e567fca1ac5e74b9f7a10d9895048` | migrate + Web decouple | `apps/web/src/components/mira-design/FileUploadDropzone.tsx` |
| `desktop/src/shared/ui/FullPageStatus.tsx` | `82e71a264512bf1602bef380856c5438a33f2419` | direct/adapted Web migration | `apps/web/src/components/mira-design/FullPageStatus.tsx` |
| `desktop/src/shared/ui/GithubIcon.tsx` | `860cc247e62ff2e4cf33a2975bac015ee8d70860` | defer — provider brand helper; no current generic Cloud consumer | — |
| `desktop/src/shared/ui/IconButton.tsx` | `66c42d5c547e6615d0fc7b13eaa2a84362555af9` | consolidate — Cloud exports IconButton from Button.tsx | `apps/web/src/components/mira-design/Button.tsx` |
| `desktop/src/shared/ui/ImagePreviewOverlay.tsx` | `b9b576758ce34d7a470d3c5d65d5c2b64c2f23b0` | direct/adapted Web migration | `apps/web/src/components/mira-design/ImagePreviewOverlay.tsx` |
| `desktop/src/shared/ui/Input.tsx` | `b474bcf775003985ef46d01ee6f33b8f4726f5e8` | direct/adapted Web migration | `apps/web/src/components/mira-design/Input.tsx` |
| `desktop/src/shared/ui/MarkdownEditor.tsx` | `c30698ffae33d121346b2201ff2e303bd9c4a2ba` | migrate + Web decouple | `apps/web/src/components/mira-design/MarkdownEditor.tsx` |
| `desktop/src/shared/ui/MarkdownText.tsx` | `a2ed6ac820e1ba927190d47b28f830af1ae8e136` | migrate + Web decouple | `apps/web/src/components/mira-design/MarkdownText.tsx` |
| `desktop/src/shared/ui/Message.tsx` | `947872e17b35235d18a07a254bd4cde1f3e9c23f` | direct/adapted Web migration | `apps/web/src/components/mira-design/Message.tsx` |
| `desktop/src/shared/ui/MicroFrontend.tsx` | `e7c09de51b3a5019d9132f5ceb9e3fa7c056c8d2` | exclude — Desktop runtime/embed concern | — |
| `desktop/src/shared/ui/Modal.tsx` | `0bf0034d237b2c038a1bf13b9f85c674aacf9e69` | migrate + Web decouple | `apps/web/src/components/mira-design/Modal.tsx` |
| `desktop/src/shared/ui/NavigationCardTabs.tsx` | `1ec9eee245e5d892bddff7bca55990340e3410c8` | direct/adapted Web migration | `apps/web/src/components/mira-design/NavigationCardTabs.tsx` |
| `desktop/src/shared/ui/NavItem.tsx` | `bf91a6c2173db33a7e2b63222a6676ef6c5899e1` | direct/adapted Web migration | `apps/web/src/components/mira-design/NavItem.tsx` |
| `desktop/src/shared/ui/NotionIcon.tsx` | `63646c3df599b8716a78fbac3bef5e42fa3d7691` | defer — provider brand helper; no current generic Cloud consumer | — |
| `desktop/src/shared/ui/Result.tsx` | `749a9a2dd3762985c6a2e5e6c5aa2d77803fb51b` | direct/adapted Web migration | `apps/web/src/components/mira-design/Result.tsx` |
| `desktop/src/shared/ui/SearchSelectModal.tsx` | `73f40bf021f1eea315447cd0328a94850515663b` | migrate + Web decouple | `apps/web/src/components/mira-design/SearchSelectModal.tsx` |
| `desktop/src/shared/ui/SearchSelectModalChrome.tsx` | `fea26d7dcd3b2a8822480a03e69bc569ead2269c` | direct/adapted Web migration | `apps/web/src/components/mira-design/SearchSelectModalChrome.tsx` |
| `desktop/src/shared/ui/SectionCard.tsx` | `1634616847b898fad890a78b31f48de5d651f40d` | direct/adapted Web migration | `apps/web/src/components/mira-design/SectionCard.tsx` |
| `desktop/src/shared/ui/SegmentedTabs.tsx` | `891fadda1c6b83b14a75564ab2925fb56866cce3` | direct/adapted Web migration | `apps/web/src/components/mira-design/SegmentedTabs.tsx` |
| `desktop/src/shared/ui/Select.tsx` | `46746f8f567efe16c39dd0d058c7899e2f999eec` | migrate + Web decouple | `apps/web/src/components/mira-design/Select.tsx` |
| `desktop/src/shared/ui/Skeleton.tsx` | `fbbca56126de76ece42811c081db6b7619981168` | direct/adapted Web migration | `apps/web/src/components/mira-design/Skeleton.tsx` |
| `desktop/src/shared/ui/Slider.tsx` | `60c8c9a5043716d866c69de4247f84301e8e2039` | direct/adapted Web migration | `apps/web/src/components/mira-design/Slider.tsx` |
| `desktop/src/shared/ui/StatusIndicator.tsx` | `c298c6d84dbd10b727800cdea9ce3996d545efa0` | migrate + Web decouple | `apps/web/src/components/mira-design/StatusIndicator.tsx` |
| `desktop/src/shared/ui/StepIndicator.tsx` | `c31c0d616610195f61f4ff7697976ba175be7241` | direct/adapted Web migration | `apps/web/src/components/mira-design/StepIndicator.tsx` |
| `desktop/src/shared/ui/StreamingTextRenderer.tsx` | `e9067c10b019ce8c718b9cc055769ff65bf8834d` | migrate + Web decouple | `apps/web/src/components/mira-design/StreamingTextRenderer.tsx` |
| `desktop/src/shared/ui/Switch.tsx` | `526ca43756021fbb67ac78ecbc7d24e24ef51d16` | direct/adapted Web migration | `apps/web/src/components/mira-design/Switch.tsx` |
| `desktop/src/shared/ui/TabCard.tsx` | `a2df164393f4b93ee6c1426293f8d5f1fabb8d00` | direct/adapted Web migration | `apps/web/src/components/mira-design/TabCard.tsx` |
| `desktop/src/shared/ui/Table.tsx` | `be99e13840dc2ff040b129c3141607616f7c2021` | direct/adapted Web migration | `apps/web/src/components/mira-design/Table.tsx` |
| `desktop/src/shared/ui/Tag.tsx` | `946ec0d48f825351c7c053b89b6b67e6531ce939` | direct/adapted Web migration | `apps/web/src/components/mira-design/Tag.tsx` |
| `desktop/src/shared/ui/TagInput.tsx` | `83276256c904e4ef56ccfbd59ba09ea7e3f98118` | direct/adapted Web migration | `apps/web/src/components/mira-design/TagInput.tsx` |
| `desktop/src/shared/ui/TerminalPanel.tsx` | `6d2c26ed02cddf6b71c63183bfcda13bf739df88` | direct/adapted Web migration | `apps/web/src/components/mira-design/TerminalPanel.tsx` |
| `desktop/src/shared/ui/Tooltip.tsx` | `4cd6d7c10cfe0ef97592b5753fa3844d67bc9e47` | direct/adapted Web migration | `apps/web/src/components/mira-design/Tooltip.tsx` |
| `desktop/src/shared/ui/WelcomePanel.tsx` | `721aae05594f30f768bc01a4f49d57e32ea3bd44` | direct/adapted Web migration | `apps/web/src/components/mira-design/WelcomePanel.tsx` |

## Cutover result

- Migrated/adapted generic components are Cloud-owned under `apps/web/src/components/mira-design/`.
- `IconButton` is intentionally consolidated into the Cloud `Button.tsx` module; there is no duplicate file.
- Brand-specific GitHub/Notion helpers are deferred until an actual Cloud domain consumer needs them.
- Access Point preview, coverage reporting and microfrontend/runtime embedding are explicitly excluded.
- Core provenance details remain in [`mira-design-migration.md`](./mira-design-migration.md).
- Advanced/Web-adaptation details remain in [`mira-design-advanced-migration.md`](./mira-design-advanced-migration.md).

## Retired parallel paths

The former Mobile-derived Cloud token authority is retired. These paths must remain absent:

- `apps/web/src/theme/upstream/tokens.ts`;
- `apps/web/src/theme/upstream/palette.ts`;
- `apps/web/src/theme/token-contract.ts`;
- `apps/web/src/theme/mobile-revision.txt`;
- `apps/web/src/styles/tokens.generated.css`;
- `apps/web/src/components/ui/`.

`apps/web/src/theme/mira-design/` is the single Web token authority. Mobile contributes
responsive/touch/WebView interaction guidance; it does not provide the Cloud palette or
generic-component source.

## Runtime boundary

MiraDesign contains no Electron/Tauri/preload/Desktop backend or Desktop feature runtime.
Where the upstream generic component required data or platform behavior, Cloud uses explicit
loaders/adapters/browser capabilities. The executable guard lives in
`apps/web/tests/mira-design/boundary.test.ts`.

## Real Cloud consumption

- `WorkspaceShell` consumes MiraDesign `NavItem`, `Button`, `IconButton`, `Card` and input primitives.
- `ConnectionPanel` consumes MiraDesign `SectionCard` and `Button` while preserving the real
  API/PostgreSQL readiness semantics.
- Narrow/coarse-pointer behavior is expressed through the shared responsive contract, not a
  second Mobile visual system.

Future Desktop updates do not automatically mutate Cloud. A new migration requires a new
explicit pinned revision, reviewed provenance diff and the same boundary checks.