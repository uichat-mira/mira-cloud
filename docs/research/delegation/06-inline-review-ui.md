# 06 · 正式交代工作随文批注 UI 第一轮

**日期**：2026-11-16
**性质**：Mira Cloud /new 产品原型的交互接线与浏览器证据；不是云任务服务或生产能力。
**基线**：dev 合并 POC-B 后的 acf157930523ce17b75ab2ac641b41b97f0f6344。
**决议**：[D01–D31](../../product/delegation-intelligent-ui.md) 的 D03、D22–D25、D27；[POC-B](./05-review-anchor-diff-poc.md)。

## 实施范围

- 保留原有 DelegationDraft / 阶段验收 / JSON UI / sessionStorage 作为状态真相。将正式 /new 正文阅读和编辑整合成同一套 Milkdown Crepe、ProseMirror 编辑器视图；只读与编辑通过显式按钮切换。
- 复用 POC-B 文字锚点 Plugin、Transaction Mapping 和 Decoration，在原批注草稿中增加可选来源锚点（from/to、阶段与修订、active/lost）。未锚定的全文批注保持兼容。
- 框选后只显示靠近选区的轻量「批注所选文字」入口，不自动展开批注栏。可选「改为本阶段整体意见」。
- 正文高亮点击定位批注；批注点击「返回原文」通过 ProseMirror 坐标定位，readonly 状态使用同一文档的 DOM Range。删除／编辑导致无法可靠映射时标记定位失效，不搜索重复文字。
- 桌面右侧随文批注栏按需出现；中等宽度改为双栏确保需求画布够宽；手机使用底部批注面板、可关闭并尝试恢复阅读位置。
- 草稿仍明确为同标签页会话保存。接受阶段、集中修订、历史回溯状态语义不变；不连接 Cloud Pi / Auth。

## 可复现证据

- 命令：pnpm --filter @mira-cloud/web check → 19 个测试文件、203/203 项测试通过；MiraDesign、格式、Lint、TS、Vite 构建通过。
- node scripts/check-docs.mjs → 文档合同检查通过。
- 实际 macOS Chrome DevTools Protocol：真实 /new 页面，390px 选择文本后入口出现且不自动开栏；底部面板编辑保存后原文高亮；高亮→批注→原文双向定位；sessionStorage 刷新恢复；手动编辑时在锚点之前插入文字，范围由 11–31 正确映射到 16–36，完成编辑后仍有效。
- 用户视觉复核后，PC 端 /new 改为使用完整的 Work 内容区：仅对该页面取消 Shell 的 1320px 最大宽度，适度缩减页面边缘留白；其他 Work 页面保持原最大宽度。
- Chrome /new 开启右栏的实测：1600px 宽度时任务画布 1165px → 1200px，正文卡片 652px → 884px；1920px 任务画布 1208px → 1517px；2560px 任务画布 1208px → 2157px。
- 在 1121–1760px 屏幕保持正文＋批注双栏，阶段主线收至顶部；更宽屏幕才使用阶段主线＋正文＋批注三栏。更新浏览器脚本持续检查 1280／1600／1920／2560px 正文最小宽度、画布利用率与横向溢出。
- 手机布局和响应式断点低于 1121px 的逻辑保持不变。
- [Chrome 复现脚本](../../../prototypes/delegation-inline-review/browser-qa.mjs)、[手机截图](./assets/inline-review-mobile-390.webp)、[桌面截图](./assets/inline-review-desktop.webp)。

## 未通过的合同（必须如实保留）

- D24 仍未完成随文卡片的纵向对应、密集避让与折叠；本轮证明的是可用的基础高亮和双向定位，不宣称 Office 式批注体验全部通过。
- D27 只有 Chrome 390px 模拟视口，未通过 Android/iOS 真机长按选择、输入法/视觉视口变化、Safe Area 和复杂长文滚动恢复。
- D25 保存来源版本及明确失效，但不做跨已接受版本自动迁移；原版本完整可视化留给第二轮。
- D04–D06 的集中修订与轻量 Diff 仍为演示或待接入，本轮未解决；真实模型生成、服务端持久化、Agent 运行、正式委托及部署均未进行。

**判定**：第一轮基础 UI 接线可进入真实手机的产品视觉复核。后续针对体验差距小步修复，再启动第二轮集中修订与 Diff 整合，不能把本轮等同于 D01–D31 全部验收。
