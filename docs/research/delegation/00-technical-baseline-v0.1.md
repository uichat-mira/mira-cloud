# Mira Cloud「交代工作」Intelligent UI 技术预研 v0.1

- 日期：2026-11-14
- 状态：**基于当前远程源码与官方资料的预研结论；未实施技术原型、未做运行时验收**
- 产品依据：`uichat-mira/mira-cloud` `dev` 的 [PRD D01–D31](https://github.com/uichat-mira/mira-cloud/blob/dev/docs/product/delegation-intelligent-ui.md)
- 现有验证依据：[TV01–TV14](https://github.com/uichat-mira/mira-cloud/blob/dev/docs/product/delegation-technical-validation.md)
- 仓库治理依据：`uichat-mira/.github` `main` 的 [AGENTS.md](https://github.com/uichat-mira/.github/blob/main/AGENTS.md)（当前读取 revision `2026-09-16.2`）、[Mira Cloud AGENTS](https://github.com/uichat-mira/mira-cloud/blob/dev/AGENTS.md)、[Cloud Pi AGENTS](https://github.com/uichat-mira/cloud-pi/blob/dev/AGENTS.md)
- 调研权限：**只读调查**；本轮研究没有实施技术原型、创建工程卡、修改运行时代码或部署。随后将本文作为证据归档到 GitHub `dev`，不改变其验证状态。
- 归档日期：2026-11-16；本文保留 2026-11-14 的原研究时间和证据口径。

## 0. 执行摘要：五条结论

1. **产品不是聊天应用，也不宜让 AI 任意生成 HTML/JS。** 应将「业务需求定义」与「表现 UI」分离：Mira 输出经严格校验的声明式 UI Spec／增量 Patch，React 以 MiraDesign 受控组件渲染；按钮并不等于授权。文本和 UI 共用一个语义需求快照。
2. **文字编辑可在现有 Milkdown 7.21.2 / ProseMirror 上扩展，组件批注和动态 Diff 仍未得到验证。** 文字选区位置、原文版本、语义组件 ID 必须持久化；不要将 DOM 节点、像素坐标或纯 Markdown 字符偏移当唯一锚点。旧批注留在原版本，不强求 AI 自动迁移。
3. **流式可见与正式可接受是两个层次。** 用户实时看到正文、UI 增量变化，但中途快照只属于 `generating`；最终经 schema、字段一致性、注释闭环及用户阶段接受，才形成不可变 accepted revision。
4. **Cloud Pi 有真实 Scheduler/Research/Delivery，但缺少本 PRD 所需的若干语义。** 当前 Cron 不见最密每小时 1 次的产品限制；当前 Delivery 默认按运行终态决定报告/状态消息，尚无“有重点才通知”策略；当前 Schedule 没有到期最终报告的独立义务；对活跃 Schedule 的变更会拒绝；管理 API 仅 loopback 且没有 Cloud Auth 业务委托。不能将这些缺口交给前端补丁。
5. **真正的 P0 不只是漂亮 UI：数据身份、版本一致性、幂等、失败恢复、执行/交付独立记录、安全与成本必须一并设计。** 尤其要在一期明确暂停跨到期、在途运行、离线/多端草稿冲突、定时错过及“无成果也诚实报告”的语义。

## 1. 已核实的仓库现状（代码证据，不是推断）

| 范围 | 实际代码事实 | 含义 |
|---|---|---|
| Cloud Web | [workspace-view.tsx](https://github.com/uichat-mira/mira-cloud/blob/dev/apps/web/src/features/work/workspace-view.tsx) 仍用 `ComposerModal/ComposerOutline` 静态 Fixture | 新交代工作路径尚未实现 |
| 编辑器 | [MarkdownEditor.tsx](https://github.com/uichat-mira/mira-cloud/blob/dev/apps/web/src/components/mira-design/MarkdownEditor.tsx) 只暴露 Markdown 更新事件；[package](https://github.com/uichat-mira/mira-cloud/blob/dev/apps/web/package.json) 锁定 Milkdown Crepe 7.21.2 | 可扩展的文本基础，不是批注、版本或 Diff 完成 |
| 渲染 | [MarkdownText.tsx](https://github.com/uichat-mira/mira-cloud/blob/dev/apps/web/src/components/mira-design/MarkdownText.tsx) 采用 Streamdown | 阅读渲染与编辑器的选区/锚点模型需统一，不能靠纯 HTML 位移 |
| Cloud API | [app.ts](https://github.com/uichat-mira/mira-cloud/blob/dev/apps/api/src/app.ts) 只有 health/ready 及错误处理 | 无真实需求草稿、阶段验收、委托提交 API |
| Cloud DB | [schema.ts](https://github.com/uichat-mira/mira-cloud/blob/dev/apps/api/src/db/schema.ts) 目前仅 `task_metadata` 基础表 | 没有 stage revision、annotation、stream generation、授权回执等持久化 |
| Cloud Pi Scheduler | [contracts.mjs](https://github.com/uichat-mira/cloud-pi/blob/dev/src/scheduler/contracts.mjs)、[schedule.mjs](https://github.com/uichat-mira/cloud-pi/blob/dev/src/scheduler/schedule.mjs)、[scheduler.mjs](https://github.com/uichat-mira/cloud-pi/blob/dev/src/scheduler/scheduler.mjs) | 已有 Cron、时区、一次性调度、暂停/恢复、取消；产品策略仍需适配 |
| Cloud Pi Storage | [store.mjs](https://github.com/uichat-mira/cloud-pi/blob/dev/src/scheduler/store.mjs) 每 Schedule 一个 JSON、原子替换、**单进程/单目录所有权** | 不能假定多个 Cloud Worker 可直接并发写这一存储，也不得新增第二个运行主权 |
| Cloud Pi Delivery | [contracts.mjs](https://github.com/uichat-mira/cloud-pi/blob/dev/src/delivery/contracts.mjs) 按运行终态区分 report/report_partial/status/none | 缺少按重要性过滤普通成功运行通知的业务层判定 |
| Cloud Pi API | [policy.mjs](https://github.com/uichat-mira/cloud-pi/blob/dev/src/api/policy.mjs) 仅允许本机 loopback；[router.mjs](https://github.com/uichat-mira/cloud-pi/blob/dev/src/api/router.mjs) 有本地调度管理路由 | Web **不能直接把当前内网管理 API 当公开任务 API**，需授权的服务端适配合同 |
| Cloud Auth | [AGENTS.md](https://github.com/uichat-mira/cloud-auth/blob/dev/AGENTS.md) 约定身份/会话/服务凭证；[README.md](https://github.com/uichat-mira/cloud-auth/blob/dev/README.md) 列出 `/v1/service-credentials` 与 audience-bound 发放合同 | 具备身份服务基线，**不代表**已有 Mira Cloud ↔ Cloud Pi 业务受权接线；新 audience/scope 仍需基于实际合同核定 |

### 1.1 三个已经发现的运行时错位

- **频率**：Cloud Pi 支持 Cron，但 `minTickIntervalMs = 10` 是**扫描 tick 的下限**，绝不是“一小时最短执行周期”。产品最密每小时一次必须在对外创建/修改 API 强制校验合法 schedule，防止高频 Cron、重复注册和策略绕过。
- **补跑**：`scheduler.enable()` 恢复已暂停计划时记录 missed audit、计算未来 nextRunAt，符合“暂停恢复不补跑”；但**进程停机**可能依据 `COALESCE_ONE` 做一次合并补偿。暂停不补跑与停机恢复补偿是两个不同场景，需要明确保留当前停机补偿还是另行收敛，不能混作同一条产品规则。
- **运行中改规则**：`updateSchedule()` 对 `activeTrigger` / live controller 返回 conflict。D15 需要设计“用户确认新规则 → 服务端保留 pending revision → 当前 Run 完毕 → 再更新 Schedule”，或经事实验证的等价安全方式，不能只在 UI 写“下次生效”。另外现有 Delivery 收件人一旦有历史 Trigger 就受额外更改限制，须避免通过错发旧报告破坏权限边界。

## 2. 业内方案评估（官方资料，建议路线非安装结论）

| 方案 | 适合做什么 | 不解决什么 / 集成代价 | 本期判断 |
|---|---|---|---|
| [Milkdown Crepe 7.21.2](https://milkdown.dev/docs/api/crepe) + [ProseMirror](https://prosemirror.net/docs/guide/) | 文字选区、文档编辑、事务位置映射；Crepe AI 扩展有 streaming/diff review | 不提供我们的 Office 式右批注、跨版本语义组件 Diff、阶段验收；当前 Mira wrapper 未启用 AI 插件 | **优先复用**，做真实 POC |
| [json-render](https://json-render.dev/docs) | React 受控组件目录、Schema、数据绑定、JSON Patch/JSONL 流式生成 | 不替代需求与批注数据库，也不提供 Cloud Pi 授权/运行；需适配 MiraDesign | **短路径 POC 候选** |
| [A2UI v1.0](https://github.com/a2ui-project/a2ui/blob/main/specification/v1_0/docs/a2ui_protocol.md) | 跨客户端声明式 UI 规范、组件 ID、数据模型与增量消息、渲染器协议 | 协议复杂度高于单个 React 页面；具体 React renderer、依赖、版本迁移需验证 | **协议级对照候选**，避免一开始自造通用标准 |
| [AG-UI / CopilotKit](https://docs.copilotkit.ai/strands/ag-ui) | Agent/UI 生命周期、SSE 事件、shared state、人机审批交互 | 不负责版本/批注存储，不自动让本地 Cloud Pi 成为合规 AG-UI Agent；全套前端可能加大包体积 | **参考传输与事件模型**，不强制引入 CopilotKit Chat UI |
| [Vercel AI SDK useObject](https://ai-sdk.dev/docs/reference/ai-sdk-ui/use-object) | 快速消费结构化流式对象、stop / onFinish | 返回可为 DeepPartial，未结束时不一定符合完整 schema；官方标 experimental；独立 session/event 仍要自建 | **备选 POC**，不把 Partial JSON 直接当可执行 UI |
| AI 任意 HTML/JS 生成 | 表现形式完全自由 | 权限/脚本注入、访问控制、组件一致性、版本锚定、性能与可测试性风险巨大 | **不推荐作为核心委托表单** |

**方向**：优先试「Milkdown 文本区 + 共享需求数据模型 + json-render/A2UI 声明式组件」；不先绑定供应商框架。对 Mira Cloud 只需一组小型、稳定且带 MiraDesign Token 的组件目录。是否选 json-render、A2UI 或轻量内部 Renderer，由下面的 POC 证据决定。

## 3. 必须定义的技术合同（TV01–TV14 之外的缺口）

### G01 · 唯一需求数据模型 / 投影一致性 — P0

`RequirementDefinition` 是接受与执行的权威语义，不允许 Markdown 正文和 UI 控件各自成为独立真相源。区分 `canonicalFields`（定时、期限、重点阈值、交付及权限等）、`narrativeBlocks`（自由描述）与 `uiSpec`（投影）。字段修改先更新 draft canonical，正文的确定性投影可以立即变更；需要 AI 改写的叙述待提交修订。`Accept` 必须验证字段/正文/组件指向同一 `revision`/hash。

### G02 · 版本、锚点、批注与确认数据模型 — P0

建议最小概念：`DelegationDraft`、`Stage`、`RequirementRevision`、`Annotation`（原 revision、text range/quote 或 semanticNodeId + fieldPath）、`RevisionProposal`、`StageAcceptance(actor, revisionHash, acceptedAt)`、`GenerationAttempt`。已接受 revision 不可原地覆盖；D07 的旧阶段正式修改应**原子地**使其自身及其后已接受阶段失效；只读查看绝不影响状态。

### G03 · 流式传输、断线重连和半成品安全 — P0

服务端按 `generationId + baseRevision + monotonic sequence` 发可靠结构块/patch；客户端拒绝过时、乱序、重复、越界消息。展示快照可部分可见，accepted revision 只在 `finalize` 验证通过后提交。刷新/断线恢复能询问最新 generation 及快照；Stop 使用可取消信号、识别已完成还是取消中。D31 禁止生成中同时写草稿以避免双写。

### G04 · 多标签页、多设备并发与自动保存 — P0

采用账户域授权、乐观并发版本 CAS/ETag、idempotencyKey、自动保存状态 `saving/saved/queued_offline/failed/conflict`。两个 Tab 修改同一草稿必须显示冲突或可解释合并，不允许最后写入者静默覆盖；创建委托重复点击/网络超时必须能查询最终结果。跨设备草稿同步必须有实际服务端存储证据，单纯 localStorage 不算。

### G05 · 安全与授权边界 — P0

不让模型生成任意脚本、URL 发送、文件删除、付费/授权动作；组件/动作白名单、schema 严格校验、URL/Markdown 安全渲染、敏感材料隔离、Prompt Injection 防护、后端权限二次核验。**用户点击“接受需求”是产品验收，不自动授予无边界工具权限**。外部操作及费用由真实服务端审批。不能让模型自己发出或重放审批成功事件。

### G06 · Cloud Auth ↔ Cloud Core ↔ Cloud Pi 服务授权 — P0

`Cloud Pi /v1` 当前为本机管理 API，无 Cloud Auth 身份委托，外部 Web 不能直接调用。需要设计服务端代理/适配：账号→授权的工作→合法 schedule；读写权限、scope、审计；服务凭证与用户角色分开；遵守 Cloud Pi 事实主权、单进程 JSON 存储边界，不复制 Scheduler。必要时先只读投影，再逐步引入创建/更新受权动作。

### G07 · 调度频率、期限与错过执行 — P0

对用户可创建的 schedule 实施 ≥ 1h 最小间隔校验，注意 DST、日历规则、重复配置与多个 Schedule 联合超额。期限明确 `deadlineAt`（绝对 UTC）+ `timezone`（展示/局部规则）；**截止义务与定时检查是两个不同触发责任**：暂停监测仍需到期报告。留出生成和发送时延的安全窗口，不要最后一分钟才开始报告。提前终止则停止未来触发，真实在途取消尽力而为。服务离线错过期限时必须记录 breach/late/failed，不能补写“按时已交付”。

### G08 · 重点检测、静默与最终报告 — P0

要独立存 `finding`、`relevance/novelty decision`、`report artifact`、`notification intent`、`deliveryAttempt`，不能 `run succeeded => notify`。无新重点可以留下可信 run/evidence 但不扰民；重要性判定要允许用户规则与去重窗口，防止同一件事每小时反复通知。到期最终报告即使“没有足够材料”也要如实说明；报告生成成功与用户实际收到通知是两回事。

### G09 · 运行/成果/主时间轴投影 — P0

主轴仅放真实工作里程碑、待用户决定、有价值成果、到期/失败/结束等；每次 Run、工具日志在节点内展开。Task/Run/Artifact/Attention/Delivery 的来源 ID/版本可追溯。失败保留部分 Artifact；`requested`、`queued`、`running`、`partial`、`failed`、`completed`、`cancel_requested`、`cancelled`、`delivered` 不允许互相冒充。

### G10 · 资源/成本/隐私/可运维性 — P0/P1

每小时检查一天可有 24 次，一个月约 720 次；即使无通知也产生模型/搜索费用。需要每项工作设置最大 Token/调用次数/工具预算、全局并发上限、超时、失败重试上限、超量停机并通知、缓存与证据去重。2C4G / Cloud Pi 单活运行时尤其要考虑任务堆积、截止优先级、状态日志及磁盘保留。加密存储/ACL、隐私资料传给模型的边界、删除/导出/保留期、追溯不可伪造。

### G11 · 编辑器集成和可访问性 — P1

Milkdown 依赖 ProseMirror position mapping，但持久化锚点仍需原始 revision + node/quote。不要将 UI 文字随流重排导致用户选区丢失。桌面滚动、密集批注、文本方向/缩放/焦点恢复；移动 WebView 的 selection / keyboard / safe-area / viewport；无 hover 和键盘可达。由具备真实浏览器能力的执行者验证，不把这一任务交给不具备浏览器工具的 Agent。

### G12 · 协议/Schema 演进 — P1

明确 UI schemaVersion、模型输出版本、兼容/迁移、停用组件、旧快照回放策略。后续引入 A2UI/json-render 不得在业务层自立第二份模型。持久化的不只是组件树，还要可重建的 canonical 需求值和 accepted version；客户端版本落后时安全降级，不误触敏感操作。

## 4. D01–D31 对照清单（每项都必须有证据）

| 决议 | 对应验证与额外关注 |
|---|---|
| D01 | TV01，用户显式接受，服务端 Actor 校验、hash / CAS |
| D02 | TV01/13，上下文可信来源、引用 ACL、无上下文极简输入 |
| D03 | TV03/09，文字/全文/组件锚定、原 revision 绑定与降级 |
| D04 | TV04，批注集中提交、重复提交幂等、批量输入大小限制 |
| D05 | TV10，纯文本 Diff、组件字段摘要、未知差异明确提示 |
| D06 | TV04，AI 仅“建议解决”，用户关闭批注，未解决阻断 |
| D07 | TV01/G02，回溯正式提交使自身及后续验收原子失效 |
| D08 | TV06/G04，持久化、冲突/断网、跨标签页恢复 |
| D09 | TV02，控件直改 canonical draft，不直接调用 Agent/工具 |
| D10 | TV02/G01，正文与 UI 同一接受快照，不一致禁止 Accept |
| D11 | TV01/07，最终提交幂等，服务端真实接收 ≠ 开始运行 |
| D12 | TV07/G09，同一主轴分别投影需求阶段、Run、成果 |
| D13 | TV07/G09，里程碑≠工具日志、界面保持可读 |
| D14 | TV07/G05，局部审批阻塞、不停整个 schedule，动作级授权 |
| D15 | TV07/G07，旧 Run 绑定旧定义，新规则 pending 后续生效 |
| D16 | TV07/08/G07/08，≥1h、重要才通知、期限必须真实汇报 |
| D17 | TV08/G07，截止停止新触发、保留历史、区分报告/投递 |
| D18 | TV07，暂停/恢复不补跑；区分进程停机 catch-up |
| D19 | TV08，暂停不改变 deadline；到期执行独立义务 |
| D20 | TV08，主动结束无强制结案报告、历史可查询 |
| D21 | TV07，停止触发并尽力 cancel，在途终态真实可查 |
| D22 | TV11，批注侧栏按需出现、正文保持中心 |
| D23 | TV03/11，选区工具浮层主动触发、复制不打扰 |
| D24 | TV11，锚点双向定位、密集卡避让、滚动/缩放 |
| D25 | TV03/10/G02，原版锚点、修订关联、版本可回溯 |
| D26 | TV04，批量确认限已建议处理项，放弃及继续修改逐条可用 |
| D27 | TV12/G11，移动底部批注、选区/键盘/位置恢复 |
| D28 | TV12，移动紧凑进度、完整单轴可展开 |
| D29 | TV01/G02，历史默认只读，显式修改，提交后失效下游验收 |
| D30 | TV05/G03，文字和 UI 流式可见、半成品不可接受 |
| D31 | TV05/G03，生成中可读可取消、禁止同时修改 |

## 5. 建议的技术原型和“退出条件”（不是施工授权）

### POC-A：受控动态 UI（最高优先）

从一个具体例子“每小时检查，但仅重大变化报告，有期限则交最终报告”开始。定义 8–12 种 MiraDesign 注册组件；让模型生成增量结构块并通过 Zod 校验；用户修改 select / date / toggle 后，正文与 canonical 字段同步。加入恶意 schema（未注册组件、JS、伪造授权按钮、恶意 URL）。

**通过证据**：同一 canonical 字段的正文/UI 不矛盾；未知组件拒绝；流式无非法 DOM、可停止；相同输入重放能稳定加载；明确输出 schema version。

### POC-B：Office 式锚定批注与 Diff

复用现有 Milkdown，选择文本（跨节点/重复文字）、加入多条批注、右侧随文显示、原版本保留；尝试两种动态组件锚点及字段 Diff。AI 一轮修订后用户批量确认部分批注，剩余保留。手机触屏与键盘真实试一次。

**通过证据**：无错位/串位；旧版可回溯；批注未闭环不能通过 Accept；组件锚点不稳时诚实降级。

### POC-C：版本/流式中断与自动保存

引入最小 Server-side Draft/Revision 存储（实验隔离，不触及生产），模拟 SSE 断线/乱序/重复、双标签页编辑、后台保存失败、Stop 后 reload；验证 D07 重新验收的事务。

**通过证据**：无静默覆盖，无半成品验收；多次点击最终只创建一个委托；用户明确知道 saved/failed/unknown。

### POC-D：Cloud Pi 长期工作合同差距实验

独立测试 `cron` 最密间隔、pause/resume 与 downtime catch-up、active-trigger update conflict、cancel、status/delivery、deadline final report、重要内容过滤。仅在受控 test double/本地 fixture 环境实验；先读对应 Issue/测试契约再考虑跨仓修改。

**通过证据**：一份能力矩阵明确每条 PRD 对应现成调用、适配缺口、谁 owns 写入、失败/时区/费用。不得把 API loopback 暴露到公网或新造平行调度器。

## 6. 建议实施次序与决策门槛

1. **先 POC-A + POC-B**：能不能形成“可编辑、可批注、可流式修订”的审阅作品；在这里验证技术选型，而非先建设全套后端。
2. **再 POC-C**：通过真实版本存储和中断恢复，证明审阅/接受行为可靠。
3. **最后 POC-D**：把“长期监测—有重点才通知—有期限诚实交付”接到唯一 Cloud Pi Runtime；需要 Cloud Auth 及 Cloud Core 的独立服务授权合同。
4. 提交产品视觉原型做真实人机审阅。**代码完成/CI 绿不等于 UI 通过，更不等于长期工作闭环已可用。**

**不得提前作出的声明**：已决定采用 A2UI/json-render；动态组件批注已跑通；Crepe AI Diff 已在 Mira 集成；Cloud Pi 满足 ≤1 次/小时；已实现 no-news silence；deadline 保证按时送达；Mira Cloud 业务已打通 Cloud Auth/Cloud Pi。这些都必须靠对应版本和真实测试证据。

## 7. 官方与代码资料入口

- [Mira Cloud PRD](https://github.com/uichat-mira/mira-cloud/blob/dev/docs/product/delegation-intelligent-ui.md) / [技术验证 TV01–TV14](https://github.com/uichat-mira/mira-cloud/blob/dev/docs/product/delegation-technical-validation.md)
- [Mira Cloud Web 编辑器](https://github.com/uichat-mira/mira-cloud/blob/dev/apps/web/src/components/mira-design/MarkdownEditor.tsx) / [Hono API](https://github.com/uichat-mira/mira-cloud/blob/dev/apps/api/src/app.ts) / [Drizzle schema](https://github.com/uichat-mira/mira-cloud/blob/dev/apps/api/src/db/schema.ts)
- [Cloud Pi scheduler](https://github.com/uichat-mira/cloud-pi/blob/dev/src/scheduler/scheduler.mjs) / [schedule](https://github.com/uichat-mira/cloud-pi/blob/dev/src/scheduler/schedule.mjs) / [store](https://github.com/uichat-mira/cloud-pi/blob/dev/src/scheduler/store.mjs) / [delivery](https://github.com/uichat-mira/cloud-pi/blob/dev/src/delivery/contracts.mjs) / [loopback policy](https://github.com/uichat-mira/cloud-pi/blob/dev/src/api/policy.mjs)
- [Milkdown Crepe AI / diff](https://milkdown.dev/docs/api/crepe) / [ProseMirror guide: transactions & mapping](https://prosemirror.net/docs/guide/) / [Yjs ProseMirror anchoring caveats](https://docs.yjs.dev/ecosystem/editor-bindings/prosemirror)
- [json-render catalog](https://json-render.dev/docs/catalog) / [SpecStream](https://json-render.dev/docs/streaming) / [A2UI v1 protocol](https://github.com/a2ui-project/a2ui/blob/main/specification/v1_0/docs/a2ui_protocol.md)
- [AG-UI event transport](https://docs.copilotkit.ai/strands/ag-ui) / [AI SDK useObject](https://ai-sdk.dev/docs/reference/ai-sdk-ui/use-object) / [OWASP GenAI](https://genai.owasp.org/glossary/prompt-injection/)

---

*本文记录的是 2026-11-14 的只读技术调查、差距分析和验证方案。GitHub 归档不代表完成 POC、代码实现或生产验证；后续实验结论应在同目录新增独立、可复核的阶段记录，不覆盖此阶段证据。*
