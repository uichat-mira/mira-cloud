# Mira Delegation Protocol — 模型无关起稿协议研究 v0.1

**研究日期**：2026-11-16
**状态**：研究提案 / 尚未采用；没有调用真实模型，也没有改动产品运行代码或部署。本文件作为独立研究记录进入版本控制，不构成协议正式采纳。
**研究对象**：Mira Cloud `dev` 的交代工作 D01–D31 产品合同，以及 D02 意图进入、Milkdown × json-render 草稿、文字批注 POC。
**证据等级**：官方规范与仓库源码已查；本报告附带的 Schema/Fixture 已在独立 Python 环境执行验证；模型质量、真实渲染、协议跨端、网络/真实服务未验证。

## 0. 研究结论

**不要让模型直接生成整个 Mira 审阅画布，也不要在 UI 原型阶段连接真实模型。** 最小、可逆的设计是：

> 用户意图 + 经授权的上下文清单 → 模型产生**非权威 Proposal** → Mira 做格式与业务校验、规范化、分配身份 → 生成唯一需求草稿 → Milkdown 正文与 json-render 组件只作为其投影 → 用户批注、修订、接受 → 未来由独立执行服务接管 Task/Run。

模型只参与**理解、提议、解释、建议修订**。它不得决定 accepted/permissions/taskCreated/runStarted/delivered，也不直接输出 JSX、任意 HTML、可执行脚本或原始 React 树。

## 1. 与 Mira 当前代码的差距（源码事实）

- [D01–D31 产品合同](https://github.com/uichat-mira/mira-cloud/blob/dev/docs/product/delegation-intelligent-ui.md)：D02 自适应意图、D04 集中修订、D06 人工逐条闭环、D09/D10 同源字段与正文、D22–D25 批注和追溯、D30/D31 生成中可看但不可接受。真实运行仍需权威运行源。
- [统一草稿实现](https://github.com/uichat-mira/mira-cloud/blob/dev/apps/web/src/features/work/delegation-document.ts)：现在的 `DelegationDraft` 是 `schemaVersion=1`，固定 `stages` 三元组、固定 scenario、阶段序号作为部分身份，sessionStorage 为 Fixture。**不能直接把模型变长阶段数组塞入现有类型**，也不能把 `Proposal v0.1.0` 与草稿 schemaVersion=1 混称同一个版本。
- [json-render 组件目录](https://github.com/uichat-mira/mira-cloud/blob/dev/apps/web/src/features/work/delegation-catalog.tsx)：Flow/Intro/ChoiceField/ToggleField/Note，actions 为空；这证明当前可受控地生成呈现投影，不证明任意模型产生的 Spec 合法。
- [POC-A 技术选型研究](https://github.com/uichat-mira/mira-cloud/blob/dev/docs/research/delegation/01-poc-a-ui-protocol.md)：已有针对 UI wire shape 的安全门实验；它不等于起稿业务语义协议。
- [POC-B 锚点与 Diff](https://github.com/uichat-mira/mira-cloud/blob/dev/docs/research/delegation/05-review-anchor-diff-poc.md)：文本 Anchor 需要来源修订，字段语义 ID 需要稳定；按顺序/标签猜测映射是不可靠的。
- [D02 原型记录](https://github.com/uichat-mira/mira-cloud/blob/dev/docs/research/delegation/07-intent-entry-ui.md)：自由意图当前只映射为本地通用模板，尚无模型阶段生成、上下文真实性或实际 Task 提交。

**技术后果**：先定义独立 Proposal 合同，再另行设计 Proposal → Draft 的归一化适配器。是否改变正式 `DelegationDraft` 类型需要后续独立产品/工程批准；不要趁研究阶段静默迁移草稿数据。

## 2. 业界规范与层次对照

| 规范 / 路线 | 实际负责的层次 | 适用性 | 当前结论 |
|---|---|---|---|
| JSON Schema Draft 2020-12 | 对象结构、字段类型与可静态检查的约束 | **核心研究基线** | 定义 Mira 模型 Proposal 的机器可读契约；业务规则仍需独立校验。 |
| OpenAI Structured Outputs | 供应商级受约束生成 | 未来模型适配 | 只支持 JSON Schema 子集；严格模式不能保证业务事实正确。 |
| Claude Structured Outputs | 供应商级受约束生成 | 未来模型适配 | 约束/可选字段复杂度和 grammar 缓存行为要实际测量。 |
| Gemini Structured Outputs | 供应商级受约束生成 | 未来模型适配 | 同样只支持子集；JSON 结构正确不能代替事实验证。 |
| json-render (SpecStream) | 组件目录、React UI Spec、JSONL/RFC6902 局部更新 | **保留当前渲染层** | 直接生成 UI Spec 不是唯一选择；Mira 可由需求语义确定性生成白名单 UI。 |
| A2UI 1.0 | Agent→Renderer 跨端消息与 Surface/DataModel | **跨端备选** | Google 2026-11-11 发布稳定协议，但 Android Jetpack Compose 原生 renderer 仍在 0.9.1 路线上；不宜替换现有 Web。 |
| AG-UI | Agent Run 生命周期、状态快照/增量、交互消息 | **未来执行传输备选** | 与 Proposal 业务对象不同层；不为 UI Fixture 现在添加 Agent Run。 |
| MCP Apps | 工具向宿主提供交互式 UI 资源 | **外部工具入口** | 不解决 Mira 自有委托审阅的核心业务真相；也不应承担 Cloud Auth 或权限判断。 |

**重要分层**：A2UI 和 json-render 是 UI 的结构/呈现选择；AG-UI 是 Agent 交互事件的传输合同；JSON Schema 是载荷验证工具；Mira Delegation Proposal 则是**产品业务语义**。它们不是互斥的四选一。

**成本警示**：Google 2026-10-27 公布的 A2UI Express，在其任务集上报告最多约 3 倍更少输出 Token 与约 3 倍低延迟（特定对照）；不能把该数字应用于 Mira。研究启发只是“让模型做少量语义决定，不重复生成整体布局”。

## 3. 推荐分层合同

### 3.1 Host 输入（不允许由模型自行创建）

`IntentEnvelope`：host 记录 `intentRef` 和用户原话、locale、允许引用的 `contextRef` 清单、用户选择的工作入口（新建/从已有成果继续）、已有用户明确约定。用户原话是来源记录，不应由模型重写成“权威原话”；引用的 Artifact 必须先经业务端验证权限，不能因为模型知道 URL 就可以使用。

### 3.2 模型 Proposal（本轮 Schema）

`mira.delegation.proposal@0.1.0`：

- `title`、`summary`：可审阅的标题与概述，不能代表授权。
- `stages[]`：1–8 个**建议阶段**；`key` 是候选语义键，不是永久 UUID、审阅版本或 DOM ID。每阶段包括 `title`、`purpose`、`paragraphs[]`（**纯文本段落**）及 `fields[]`。
- `fields[]`：`key/label/kind/options/suggestedValue/rationale`。示例先只包含 choice / boolean / text 三类：**模型选择数据类型，不选择 React 组件实现**。如涉及有副作用的动作，必须进入单独的可信授权流程，不得伪装成普通 checkbox。
- `unknowns[]`、`assumptions[]`：允许表达证据缺口，而不是捏造细节。
- `claims[]`：仅是模型提出的可核查主张，附 `sourceRefs` 候选清单。**来源 ID 有效不代表主张正确**；Mira 仍需要核对引用内容及其适用范围。
- 顶层采用 `additionalProperties: false`，不包含 `acceptedCount`、`authorization`、`runStatus`、`taskId`、JS/HTML 或自定义 actions。真实授权状态从来不是模型可写字段。

Schema 路径：[`mira-delegation-proposal-0.1.schema.json`](./protocol-v0.1/mira-delegation-proposal-0.1.schema.json)。此文件是**Mira 完整研究 Schema**，不声称可以原样传给 OpenAI/Claude/Gemini 严格解码器；未来由提供商适配层从它导出受支持子集，并用 Mira 自己的严格校验做最终验收。

### 3.3 Mira 归一化（Host 独占）

- 验证 Schema；校验阶段/字段键唯一、选项与值同类型、业务节奏（例如最短 1 小时）、引用来源属于本次已允许 manifest；对无效 Proposal 给出**校验失败**而不是悄悄提升权限或跳过不确定性。
- 给草稿、阶段、字段分配**持久的 host ID**，保留模型建议 `key` 与原始生成快照，建立生命周期和映射关系。
- 用统一 Draft 产生 Milkdown 文本和 json-render Schema，正文和受控字段只由**同一份可信数据**导出；未知状态明确展示，不自动认定事实。
- 由 Mira 操作本身形成新修订号和已接受历史。AI 后续重新生成标签/顺序，不构成自动迁移旧批注的依据。
- 只有用户操作与业务回执可以更改审批、保存、委托/Run 的状态。`Proposal` 不是 Task。

### 3.4 生成与 UI 流式事件（Host 独占）

未来 D30/D31 允许渐进展示，但不直接把模型的半截 JSON 当正式草稿：

- `generation.started` 建立临时生成会话，Mira 保留既有已接受快照。
- `draft.stage.preview` 只使用**已经完整验证**的一个阶段或区块，标记 provisional；**当前原型更适合先用 Fixture 模拟该事件，不接网络流**。
- `draft.revision.proposed` 附 `baseRevision`、`generationId`、单调 `sequence`。过期、跳序、基线版本不一致先暂停/重同步；相同事件 ID 重放必须幂等。
- `generation.completed / cancelled / failed` 明确终态。生成中只能阅读、滚动、取消，不能接受半成品；错误时保留旧草稿、批注和接受版本。

样例：[`host-event-example.json`](./protocol-v0.1/host-event-example.json)。事件中的 revision、sequence 与生成生命周期都由 Host/协议层产生，**不是模型可以申请升权的字段**。

### 3.5 集中修订应是另一种 Proposal

批注后的修改应输出 `revision_proposal`，基于 Host 提供的修订版本与批注 ID，只**建议**改动、解释如何回应；不能直接把 `open` 改成 `resolved`。用户按 D06 显式逐条确认或放弃。带 `baseRevision` 的示例见 [`revision-proposal-example.json`](./protocol-v0.1/revision-proposal-example.json)，**仅是报文设计样例，尚无独立 Schema 或校验结果**。这部分建议下一轮单独确定差异操作语义，以免本轮过度设计。

## 4. 不变量与威胁边界

| 风险 | 最小要求 | 证据边界 |
|---|---|---|
| 伪造已接受/已授权/运行 | 模型 Schema 无这些字段；业务端分权校验 | `additionalProperties:false` 是必要条件，不是授权系统 |
| 捏造引用来源 | sourceRefs 必须属于授权 manifest，且语义证据另核对 | ID 白名单不能证明引用内容为真 |
| 非法节奏 | 模型建议的频率需符合最密每小时业务约束 | Fixture 只校验示例 cadence，不是通用调度引擎 |
| 意见跨版本乱绑 | 保留原版本/Anchor，不能按同名文本自动迁移 | 与现有 POC-B 一致，端到端体验待验 |
| 乱序与部分流 | 逐事件校验、版本和序号；半成品禁验收 | 本轮只出事件示意，未实现网络重放 |
| 文本注入 | 来源文档与用户输入视为数据，不是新指令；段落以纯文本投影并正确转义 | 不等同完整 prompt-injection 防护 |
| 大型/过深 payload | 限制阶段、字段、文本、option 数量 | 以体验为目标设置初版边界，可经样本复核 |
| 同一 Draft 双权威 | Markdown/json-render 共享归一化数据，不各自写真相 | D10 全文语义一致性仍待专项证明 |

## 5. 离线 Fixture 验证（已执行）

运行：

```bash
cd docs/research/delegation/protocol-v0.1
python3 validate_fixtures.py
```

测试材料：四份可用 Proposal（一次性工作、长期监测、证据不足、修订后的草稿建议）以及十种变异非法输入，使用 `jsonschema.Draft202012Validator` + 研究性业务校验。

**实际结果：4/4 合法 Fixture 通过，10/10 非法变体拒绝。** 非法样例包含额外 `acceptedCount`、阶段重复键、15 分钟周期、boolean 类型错误、选项不匹配、选项重复、未经授权 sourceRef、空阶段、授权字段伪装、Script 字段。

这**只证明本地定义的 Schema + 有限规则能挡住这些样例**；不是“模型生成合格率”、不是完整安全审计，也不是正式 Mira 业务校验器。实际 provider strict 支持、浏览器 json-render 适配、每阶段按需生成、SSE/AG-UI、模型 token/latency、跨端和后端权限均未测试。

## 6. 取舍建议及下一轮明确退出条件

### 推荐先行：模型输出保持精简、无布局、无权限、无执行状态

先锁定 `IntentEnvelope → Proposal → Canonical Draft → Render Projection` 的四个角色，不引入第二套 UI Renderer，不让 A2UI 或 AG-UI 成为 Task 事实权威。

### 下一轮纯 Fixture 验证（不调用模型）

| 任务 | 最小通过条件 |
|---|---|
| 1–8 动态阶段 | 1、2、3、5、8 阶段能渲染，切换/回溯/重新验收不越界；原固定三阶段 Fixture 不被悄悄改坏 |
| 字段稳定 ID | 同阶段字段重排后，批注仍定点；字段删改类型时显示失效，不猜测映射 |
| Schema 到 UI 投影 | 文本和 JSON 控件只基于一个 Draft；字段修改后约定一致，冲突禁接受 |
| 审阅/修订 | 3 条批注统一产生 `revision_proposal`，提出修改≠自动标记解决；用户显式确认后才变更状态 |
| 流式与失败 | 阶段级受校验 provisional 逐段出现；中止/乱序/失败保持旧快照、批注、验收状态 |
| 来源与权限 | 伪造 `sourceRef`、授权字段、`taskCreated`、15 分钟周期被拒绝且可说明原因 |

**必须避免误报的事实**：上述只是建议验收清单，尚未执行过 UI 上的动态阶段/真实跨版本/网络流测试。本研究成果作为候选文档纳入 Mira Cloud 的版本控制；协议尚未采用，没有产品运行接线、真实模型调用或部署。

## 7. 来源与核验日期

**Mira 自身合同**（通过已连接 GitHub 读取当前 `dev`，核验于 2026-11-16）：
- [Organization AGENTS.md](https://github.com/uichat-mira/.github/blob/main/AGENTS.md)，policy revision `2026-09-16.2`。
- [Mira Cloud AGENTS.md](https://github.com/uichat-mira/mira-cloud/blob/dev/AGENTS.md)。
- [D01–D31 PRD](https://github.com/uichat-mira/mira-cloud/blob/dev/docs/product/delegation-intelligent-ui.md)。
- [POC-A](https://github.com/uichat-mira/mira-cloud/blob/dev/docs/research/delegation/01-poc-a-ui-protocol.md)、[POC-B](https://github.com/uichat-mira/mira-cloud/blob/dev/docs/research/delegation/05-review-anchor-diff-poc.md)、[D02](https://github.com/uichat-mira/mira-cloud/blob/dev/docs/research/delegation/07-intent-entry-ui.md)。

**外部原始来源**（核验于 2026-11-16）：
- [JSON Schema Draft 2020-12](https://json-schema.org/draft/2020-12/)。
- [OpenAI Structured Outputs](https://developers.openai.com/api/docs/guides/structured-outputs)。
- [Claude Structured Outputs](https://platform.claude.com/docs/en/build-with-claude/structured-outputs)。
- [Gemini Structured Outputs](https://ai.google.dev/gemini-api/docs/structured-output)。
- [json-render Streaming / SpecStream](https://json-render.dev/docs/streaming)、[Data Binding](https://json-render.dev/docs/data-binding)。
- [Google A2UI 1.0, 2026-11-11](https://developers.googleblog.com/a2ui-10-build-delightful-fast-reliable-agentic-experiences/)、[A2UI Protocol v1.0](https://github.com/a2ui-project/a2ui/blob/main/specification/v1_0/docs/a2ui_protocol.md)。
- [Google A2UI Express, 2026-10-27](https://developers.googleblog.com/en/fast-reliable-a2ui/)。
- [AG-UI Events](https://github.com/ag-ui-protocol/ag-ui/blob/main/docs/concepts/events.mdx)、[State Sync](https://github.com/ag-ui-protocol/ag-ui/blob/main/docs/concepts/state.mdx)。
- [MCP Apps](https://apps.extensions.modelcontextprotocol.io/)。
