# 06 · 正式交代工作随文批注 UI 第一轮

**日期**：2026-11-16
**性质**：Mira Cloud /new 的 Fixture 原型 UI；不是已经接通云端任务或 Agent 的服务。
**依据**：[D01–D31 产品合同](../../product/delegation-intelligent-ui.md)、[POC-B](./05-review-anchor-diff-poc.md)、[PR #114](https://github.com/uichat-mira/mira-cloud/pull/114)。
**视觉结论**：用户有条件接受第一轮，Office 式完整审阅仍存在缺口。

## 当前实现

- **单一数据来源**：现有 DelegationDraft 包含阶段、正文、动态 UI 配置、版本、批注；Milkdown Crepe/ProseMirror 共用同一文档视图，显式切换阅读和编辑。会话草稿仍只保存于当前标签页 sessionStorage，保存失败明确提示。
- **选区批注**：鼠标或触屏拖动期间不显示入口，原生 Selection 停止变化约 180ms 才出现；取消立即隐藏。侧栏关闭时点击轻量入口进入，侧栏已展开时可直接连续为不同段落批注。
- **批注对象明确**：草稿信息栏右上角只有一个 Lucide MessageSquare 图标负责开关审阅面板。无选区时默认只看已有批注；创建整个阶段的意见必须明确点击「批注整个阶段」，不能隐式降级。
- **锚点安全**：保存来源阶段、修订、from/to、摘录。ProseMirror Mapping 处理同版本内编辑；原文删除或不再匹配时标记失效，不搜索相同字符串猜测位置。正文高亮与侧栏批注支持双向定位。
- **处理闭环**：未处理批注阻止接受阶段；放弃批注立即从当前列表、数量与正文高亮中移除，但数据及来源记录保留用于历史。已解决条目展示规则未擅自扩张。
- **桌面布局**：仅 /new 放开通用 Work 1320px 宽度上限；PC 草稿栏贴 Work 顶栏吸顶，唯一批注图标位于其右侧。已删除常驻「仅在此标签页保存」文案；发生保存失败仍警示。
- **独立滚动**：右侧批注栏相对视口固定，顶部标题、中部列表、底部编辑器分层；列表局部滚动。桌面画布开关以约 220ms 过渡。手机沿用底部批注面板。Crepe 多余 LaTeX 编辑浮层已禁用。

## 验证与证据

- 本地 Fast Gate：pnpm --filter @mira-cloud/web check；包括 MiraDesign、Prettier、ESLint、TypeScript、Vitest 与 Vite 构建。GitHub Mira Gate 应以对应 PR 最新提交的实际结果为准。
- 文档与补丁：node scripts/check-docs.mjs、git diff --check。
- Mac 真实 Chrome CDP： [浏览器复现脚本及运行说明](../../../prototypes/delegation-inline-review/README.md)。覆盖文字批注和刷新、正文编辑后锚点映射、关闭栏时选区防抖、右栏开启时连续添加两条、无选区不能直接提交、放弃后隐藏、长文首屏至末尾右栏固定、批注独立滚动、桌面宽度过渡和手机模拟宽度。
- 截图：[桌面](./assets/inline-review-desktop.webp)、[手机 390px](./assets/inline-review-mobile-390.webp)、[桌面独立批注栏](./assets/inline-review-sticky-desktop.webp)。

## 明确保留的缺口

- **D24**：完整 Office 式的纵向随文排列、密集卡片避让与折叠尚未验收；本轮只覆盖基础高亮、双向定位、滚动分离。
- **D25 / D05**：保留了来源版本和失效状态，但跨版本完整历史回看与轻量 Diff 仍未集成完成。
- **D27**：Chrome 窄屏模拟不能代替 iOS/Android 真机；长按选区、键盘/视觉视口、Safe Area、长文滚动恢复仍需实际设备验证。
- **D04 / D30**：集中修订与流式生成仍为原型演示，不代表真实模型、Cloud Auth/Pi、后端持久化、持续托管或委托提交的闭环。

**判定**：本轮仅作为基础批注 UI 原型的 feat → dev 集成候选。视觉有条件接受、代码/浏览器测试和真实云端运行能力是三种不同证据，不可互相替代。
