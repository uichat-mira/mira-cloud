# 05 · POC-B：文字锚点、版本 Diff 与组件身份

**日期**：2026-11-16
**性质**：基于当前 Mira Cloud dev 的独立 Web 技术实验；不代表正式交代工作、模型修订或生产验收。
**合同**：[D01–D31 PRD](../../product/delegation-intelligent-ui.md)（D03/D05/D22–D27）、[TV03/TV09/TV10/TV11/TV12 清单](../../product/delegation-technical-validation.md)、[统一需求草稿 POC](./04-unified-document-poc.md)。

## 实验基线与选择

- 基线：dev 合并 #112 后的 0fe08138b855c4b62b670fe5b40dc7ab360019aa。macOS arm64、Node 24、Chrome 157、本地 Vite。
- 编辑器：既有 Milkdown Crepe 7.21.2；显式声明同版本的 @milkdown/kit@7.21.2，避免直接引用多份 ProseMirror 实例。
- 对照官方文档：[Milkdown Crepe AI/Diff](https://milkdown.dev/docs/api/crepe)、[Milkdown ProseMirror API](https://milkdown.dev/docs/guide/prosemirror-api)、[ProseMirror transaction Mapping](https://prosemirror.net/docs/guide/)。
- 关键判断：Crepe 内置 AI Diff 可作选区改写和接受／拒绝的底层，但需求文档还需要独立版本快照比较；因此本轮用官方 @milkdown/kit/plugin/diff 的 computeDocDiff 比较两份真实 ProseMirror Doc，未另写一个简陋的字符串 Diff 引擎。
- 仅实验页 [/new/review-lab](../../../apps/web/src/features/work/delegation-review-lab.tsx) 挂载真正的 Crepe、ProseMirror Plugin、json-render 受控控件；正式 [/new](../../../apps/web/src/features/work/delegation-page.tsx) 不启用此试验实现，也不改变阶段验收语义。

## 实现与安全边界

### 文字锚点（TV03）

[delegation-review-poc.ts](../../../apps/web/src/features/work/delegation-review-poc.ts) 定义位置锚点 id + stage/revision + from/to + excerpt。用户选区读取真实 EditorState；ProseMirror transaction 的 Mapping.mapResult 负责同一次活动编辑会话内重排、增删时的位置调整，并以原文内容一致性再次校验。

- 原文之前插入文字：位置正确平移，批注保留。
- 同一句话出现两次：不按 excerpt 搜索重绑另一处；原定位保持。
- 选中原文被删除／改写：直接标记定位失效，不猜测。
- 跨段落选区：使用 ProseMirror 真实文档中的 from/to 与 textBetween，而不是纯 DOM selector。
- 某次批注的 sourceVersion 永远保留；**本实验绝不自动将旧批注迁往另一个修订版本**。失效记录也不会因之后出现相同文本而自动复活。

真实编辑器的 Decoration.inline 高亮文本；点击批注返回原文并滚动，点击高亮可回到批注条目。尚未验证侧栏纵向对齐、密集避让、重叠批注折叠等完整 Office 行为。

### 文档版本 Diff（TV10 / D05）

在原始编辑器 Doc 与修改后的 Doc 之间运行 Milkdown 内置 computeDocDiff，读取每个变更块的 old/new 范围；UI 优先呈现新版，只显示新增、删除、修改及格式／结构变化。**这是同一编辑器中基线对照的技术路径证明**，还不是已接受历史快照、模型流式修订与批量确认的完整产品交互。

### 动态组件 Diff 与锚点（TV09 / TV10）

从当前官方 json-render Spec.elements 的字段节点 key（例如 field-focus、field-makers）确定语义身份，同时检查节点类型；比较同一身份的取值，区分值变化、新增、移除、控件类型变更。重排字段或改标签不产生假的业务值变化。

任何一侧字段缺失 id、发生 id 冲突，或同 id 节点换类型，降级标记 **「重新生成」**；不得以相同视觉顺序或文本标签强行认领旧批注。组件批注使用 sourceVersion + stableId + 组件类型三重约束；版本不同、ID 重复或类型变化均不自动迁移。

**未完成**：实验只证明字段身份与模型层位置解析，不表示 json-render 自动在组件 DOM 上实现了双向高亮、滚动定位或完整组件级批注。该 UI 接线仍属后续项目。

## 可复现证据

- 单元测试：[delegation-review-poc.test.ts](../../../apps/web/tests/delegation-review-poc.test.ts) 8 项全部通过：重复内容、跨段落、前置编辑、删除后失效、不能复活、多段修改、字段重排/增删/身份冲突、版本隔离。测试使用真实 @milkdown/kit ProseMirror Schema/EditorState/Plugin 与真正 computeDocDiff。
- Chrome CDP：[浏览器检查脚本](../../../prototypes/delegation-poc-b/browser-qa.mjs)。在本地 Vite /new/review-lab、390px 视口实际挂载 Milkdown：
  1. 选中**第二处**重复句子，添加批注；出现 ProseMirror inline 高亮。
  2. 在文首插入文字，锚点仍指向第二处，正文 Diff 出现新增内容。
  3. 点击高亮回到批注；从批注点击「返回原文」，实际选区重新指向原文字。
  4. 删除此原文，高亮消失，批注明确显示「定位失效」。
  5. 模拟字段缺少稳定 ID：组件 Diff 显示「重新生成」，定位动作拒绝按标签猜测。
  6. 390px 宽 document.scrollWidth=390；1365px 桌面宽 document.scrollWidth=1350，没有根级横溢。
- Chrome 在同一实验页真实点击 json-render Toggle，字段值由开启变关闭；组件 Diff 同步显示「值变化」。相关选择器来自既有 MiraDesign/Registry，不是单纯手写 HTML 代替组件。
- 截图：[390px 手机模拟](./assets/poc-b-mobile-390.webp)、[1365px 桌面](./assets/poc-b-desktop.webp)。
- 实验代码不使用模型凭据、外部任务服务或网络执行；所有数据是 Fixture。未进行生产部署，也未在真实 Android/iOS 触摸选区及软键盘下验收。

## 分项判定与后续

| 项目 | 此轮技术判定 | 未经证明的部分 |
| --- | --- | --- |
| TV03 文字锚点 | **限单一活动编辑版本可行**，真实 ProseMirror plugin 及浏览器交互通过 | 保存/重开后的锚点回放、多人并发、复杂跨表格 |
| TV10 文本 Diff | **可行**，computeDocDiff 实测多处编辑及浏览器可见差异 | 历史版本 UI、长文性能、复杂格式/表格的审阅质量 |
| TV10 组件 Diff | **字段值对比可行**，稳定 ID 可分辨，未知 ID 明确降级 | 复杂动态组件树、模型重生成时 ID 保持 |
| TV09 组件级锚点 | **数据身份契约初步可行，UI 未通过** | json-render DOM 定位及组件双向批注仍待实验 |
| TV11 随文批注 | **基本双向定位可行** | 密集卡片避让/折叠、滚动同步/缩放等未通过 |
| TV12 移动体验 | **390px 模拟视口无横溢** | 真机长按选区、软键盘、Safe Area、触屏恢复未通过 |
| D25 跨版本批注 | **版本约束的拒绝误迁移可行** | 正式历史快照 UI 与批注溯源仍未通过 |

**决策**：不新造完整富文本编辑器，也不自行实现粗糙文本 Diff；继续复用现有 Crepe + ProseMirror Plugin/Mapping + Milkdown Diff。文本批注先保留原版本、失效不猜测。组件级锚点在 DOM 定位、跨真实 Spec 重生成和滚动验证通过前不得宣称完整可用。下一阶段在 /new 上讨论正式 UI 接线和审阅合同，而非在本实验页创造第二套正式任务状态机。
