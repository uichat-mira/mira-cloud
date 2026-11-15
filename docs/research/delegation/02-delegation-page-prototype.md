# 02 · 「交代工作」独立页面：真实 json-render 交互原型

**记录日期**：2026-11-16
**目标**：以既有 Workbench 的「交代工作」入口替换已过时的 Composer Modal，验证阅读式 Intelligent UI 的实际体验。
**性质**：产品 UI 原型，不是完整实施、生产验收或 POC-A 所有技术风险的结案。
**权威产品需求**：[D01–D31 PRD](../../product/delegation-intelligent-ui.md)。上一阶段的[隔离协议实验](./01-poc-a-ui-protocol.md)保持原貌；本阶段补足真实官方 React 渲染器的最小集成证据。

## 已实现且可以复现的范围

- Workspace 的「交代工作」与「新建任务」入口路由到独立 `/new`，**不是弹窗**；工作台、已有 Task、Artifact 返回路径在 React Router state 中保留。直接进入 `/new` 时返回工作台。
- `@json-render/core@0.22.0` / `@json-render/react@0.22.0` 和 `zod@4.6.7` **真实安装**于 Web 包；使用官方 `defineCatalog`、`defineRegistry`、`JSONUIProvider`、`Renderer` 和 `useBoundProp`。React 19.3.1，组件复用 MiraDesign `Select` / `Switch`。
- 三种任务演示（AI 行业情报、旅行规划、创业调研）各有独立组件 Spec 与字段绑定，并非仅更换同一表单标题。
- 文档式需求区、单主时间轴、逐阶段人类接受、选择文字后按需批注、右栏／移动端底部批注面板、模拟增量修订、生成中只读与可取消。
- 控件绑定到演示 state，修改后同步更新本阶段摘要。最终阶段按钮明确标为「接受并交代（演示）」，不会创建真实 Task / Run / Delivery。

## 可复核测试与浏览器记录

运行环境：Mac arm64、Node 24.19.0、pnpm 10.34.9、Chrome 157，仓库 `feat/delegation-intelligent-page-prototype` 候选代码。代码版本应以对应 PR / 合并 commit 为准。

```bash
pnpm --filter @mira-cloud/web typecheck
pnpm --filter @mira-cloud/web exec vitest run tests/workspace-cutover.test.tsx
pnpm --filter @mira-cloud/web exec vitest run tests/delegation-page.test.tsx
pnpm --filter @mira-cloud/web check
```

首两类测试涵盖：主页／详情进入后返回、直达 `/new`、真实 renderer/registry 挂载、切换三种情境、选择器与摘要双向绑定、批注未处理阻止阶段接受、人工逐阶段验收、模拟修订取消、无真实 fetch。**记录中的“通过”以 PR CI 和最终本地输出为准，不以本文静态描述代替。**

桌面和移动视觉检查（Chrome headless 实际打开 `http://127.0.0.1:5173/new`）：
- [桌面深色视口 1440×1000](./assets/new-task-desktop-dark.png)
- [移动亮色仿真视口 390×844](./assets/new-task-mobile-light.png)，Chrome DevTools Emulation 记录 `innerWidth=390`、`scrollWidth=390`；无文档根级水平溢出。

**限制**：Chrome 截图证明静态排版和资源加载；并不代替人工实测触控操作、真实手机键盘/安全区、所有批注折叠与滚动同步。

## 此阶段尚未实现或验收的事项

1. AI 模型实际生成 spec 与流式 transport：当前流式变化由浏览器定时器模拟，不是真实模型调用，也没有测 Token 成本。
2. 服务端草稿持久化、刷新恢复、多端并发锁、已接受版本不可变、跨阶段回溯重验收；这些归 POC-C，**当前草稿为会话态**。
3. Office 式真正的 ProseMirror 文本锚点、组件级批注语义 ID、跨版本锚定与随文批注滚动对齐，以及文本/组件 Diff；这些归 POC-B。现在仅提供选择文字后的批注入口和演示状态。
4. 云端 Task 创建、Cloud Auth、Cloud Pi 调度、按价值通知、到期报告、授权和任何真实外部副作用，**均未接入**。
5. 全文正文／结构化字段语义矛盾检测没有工程实现；交互原型不得自称 D10、TV02 或完整 D01–D31 已验收。
6. 全部 Stage / UI Spec 结构、默认演示数据仍由明确的 fixtures 决定；这是受控可交互原型，不是 Agent 自由产生的无限组件类型。

**设计判断**：独立页能给时间轴和文档阅读宽度，明显比原四步 Composer 弹窗更接近 D01–D31 设计方向；但是否进入完整 UI 视觉验收，仍需要使用者的体验反馈。优先在此页面继续修订，不另造平行 Playground。
