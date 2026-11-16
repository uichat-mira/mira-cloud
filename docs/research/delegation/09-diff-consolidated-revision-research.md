# 09 · Diff 集中修订与批注闭环 — 模型层研究

**日期**：2026-11-16
**状态**：独立 T1 研究与可复现 Fixture；**不是正式 /new 接线、产品视觉验收或生产协议采纳**。
**基线**：Mira Cloud dev 560f18b（合并 #116 后）。
**产品权威**：[D01–D31 PRD](../../product/delegation-intelligent-ui.md) 的 D04 / D05 / D06 / D07 / D09 / D10 / D22–D26 / D30–D31。
**已有证据**：[POC-B](./05-review-anchor-diff-poc.md)、[统一草稿](./04-unified-document-poc.md)、[起稿 Proposal 研究](./08-delegation-protocol-research.md)。

## 1. 要回答的产品问题

用户在当前阶段积累三条批注并点击「提交修订」后，Mira 应给出**一份新的可审阅版本**，而不是仅表示「AI 已建议处理」。新版需要同时说明：

1. 正文变更在哪里，哪些内容未改变；
2. Choice / Toggle 等结构化字段变更了什么，有没有擅自增删；
3. 三条批注分别获得了怎样的处理建议，仍有哪条没有真正解决；
4. 如果草稿被编辑、批注新增、版本已推进，旧修订提案必须被拒绝；
5. 用户取消、生成失败或未确认时，旧草稿、批注来源和已接受快照不得被污染。

**本轮不调用模型、不设计完整页面、不接网络 SSE，也不重写 POC-B 的 Diff 算法。**

## 2. 已确认的现状（读源码，而非推测）

| 合同 | 当前事实 | 后果 |
| --- | --- | --- |
| D04 集中修订 | /new 的 beginRevision 以本地 timer 演示流式，结束时标记本阶段 open 批注为 suggested | 目前**没有真正修改 Markdown 或字段值**，也没有按批注逐条输出对应修订 |
| D05 文本 Diff | POC-B 已调用 Milkdown computeDocDiff，测试真实 ProseMirror Doc 多处修改 | 复用已有 textDiff；不能把字符串染色算法另造一份 |
| D05 组件 Diff | POC-B 的 componentDiff 依稳定 ID + 类型比较值、新增、移除、重生 | 单一字段顺序/标签变动不能制造假差异 |
| D06 人工处理 | /new UI 接受操作会先检查 unresolved 数量 | UI 守卫存在；但底层 acceptDocumentStage 本身**不检查批注状态**（下述测试复现） |
| D07 历史回溯 | 统一草稿已有 accepted/history 与编辑历史阶段能力 | 集中修订应先聚焦当前未接受阶段，不能直接修改旧接受快照 |
| D09/D10 同源 | changeDocumentConfig 可同步「当前约定」，正文不同步时验收会被阻止 | 修订候选须经原有草稿函数生成，不可直接写一份独立 UI state |
| D25 旧锚点 | ProseMirror anchor 有来源 stage/revision；失效后不猜测目标 | 旧版批注不因新稿出现相同文字就迁移 |
| D30/D31 流式 | 现有 timer 只是渲染 Fixture，修订后的独立事件合同尚未接线 | 生成预览必须与可提交版本隔离；暂不声称已通过真实流式 |

相关源码：[delegation-page.tsx](../../../apps/web/src/features/work/delegation-page.tsx)、[delegation-document.ts](../../../apps/web/src/features/work/delegation-document.ts)、[delegation-review-poc.ts](../../../apps/web/src/features/work/delegation-review-poc.ts)。

## 3. 本轮实际新增的最小研究程序

- [delegation-revision-poc.ts](../../../apps/web/src/features/work/delegation-revision-poc.ts)：只提供 prepareRevision 和 commitRevision 两个纯内存函数；不引入新的持久化、UI 渲染器或领域状态权威。
- [delegation-revision-poc.test.ts](../../../apps/web/tests/delegation-revision-poc.test.ts)：使用真实既有 DelegationDraft / changeDocumentConfig / changeDocumentMarkdown / isAgreementConsistent；复用 POC-B componentDiff 和 textDiff（后者针对测试创建的真实 ProseMirror 文档）。
- 输入是**临时研究版** mira.delegation.revision_proposal 0.1.0。它与研究 08 的 revision-proposal-example.json 不是已冻结的同一个 wire schema；当前实现使用 stage 0–2 和整数 commentId，匹配现有 Fixture，而非跨端稳定标识。**不得将当前原型 API 定为最终协议**。

### 3.1 prepare：候选不是权威

1. 严格校验 proposal：协议/版本、stage、baseRevision、operation、commentResponses；未知字段（如 acceptedCount / taskCreated / authorization）被拒绝。
2. 只允许当前待接受阶段，拒绝修改已接受历史/正在编辑的历史；baseRevision 必须精确匹配。
3. 三条待闭环意见必须各自有且只有一条处理建议；拒绝遗漏、重复、未知、其他阶段、已解决或已放弃的批注。
4. 仅接受两个候选动作：替换当前阶段说明正文、更新已知字段的合法选项/boolean 值；拒绝重复操作、非法值及受保护外部动作字段 externalActions / booking / outreach。
5. 通过现有草稿修改函数得到新的 Markdown 和 config；保留「当前约定」由原有业务摘要生成，不允许模型伪造其标题或独立填充协议事实。
6. 产出 baseline、preview、结构化字段差异、批注逐条处理建议以及 sourceFingerprint。准备过程中源草稿不变。

**sourceFingerprint 只是当前 JS 内存快照的乐观锁比较，不是安全哈希、数据库事务、分布式 CAS 或云端保存回执。**

### 3.2 commit：提交修订不等于接受

- 调用 commitRevision 前再次核对**整份草稿**的内存快照、基线版本和批注集合；其他阶段被编辑/新增意见/已提交过一次均拒绝过期候选，避免将准备时的旧草稿覆盖较新内容。
- commitRevision 仍是**纯函数**，返回新的草稿值，不对浏览器存储或云端 DB 写入。宿主将来必须有原子提交/版本确认合同。
- 对建议处理的批注，最多标记为 suggested；未解决的回到 open；**不自动 resolved、不自动 abandoned、不自动接受阶段**。
- sourceVersion / anchor 仍留在旧文版本；一条批注在新版本中可作为历史证据呈现，但不能凭文字相同而自动定位到新文。
- 若用户取消候选，不调用 commit，原稿不动。

### 3.3 差异的呈现建议（未实现 UI）

遵循 D05 的「新版优先、轻量差异」，不出现第三个主面板：

1. 默认正文显示新版；有变化的段落/句子用轻标记，点开可查看旧版片段与操作解释。
2. 动态组件按稳定语义 ID 展示数值变化；新增/移除/类型变化须显式标明。缺失、重复或复用已变类型的 ID 显示「重新生成」，**不能按标签/顺序猜测同一组件**。
3. 每条批注显示「Mira 的处理建议」和受影响变更的定位链接；用户逐条「确认已解决 / 放弃」，未给方案不得出现在批量确认范围。
4. 用户提出「不要每天通知」时，不应偷偷改成「每小时检查」；检查频率和通知触发是两个不同字段。Diff 应使这种额外改动可见。
5. 移动端使用同一新版文档中的轻标记与底部批注面板，不默认双栏对比。完整密集卡片避让/触屏软键盘需另测。

## 4. 可重复验证与事实等级

在 Mac M2 / Node 24 / React Web 的 Vitest 5 + ProseMirror 环境执行：

    pnpm --filter @mira-cloud/web exec vitest run \
      tests/delegation-revision-poc.test.ts \
      tests/delegation-review-poc.test.ts \
      tests/delegation-document.test.ts

本研究新增**16 项 T1 用例**，在本地首次整合运行全部通过：三条批注统一响应、正文与两处 Choice/Toggle 差异、取消不改源数据、旧注释锚点不迁移、过期基线/二次提交拒绝、并发新增批注拒绝、遗漏重复引用、非法字段/值、伪造授权、历史阶段禁止修改、已损坏「当前约定」拒绝修订、同名批注 ID 冲突、敏感字段阻断，以及独立发现的验收守卫缺口。

连同 POC-B（8 项）及统一草稿（13 项），相关**37/37 T1 测试通过**。该证据**只覆盖本地模型层**；并未通过真实 /new 新版-旧版 UI、动态 json-render DOM 锚点、正式 SSE/Agent/LLM、浏览器跨版本编辑、云端 CAS、Android/iOS 真机或安全审计。

### 独立发现的正式接线阻断项

**当前 acceptDocumentStage(draft, stage) 在批注仍 open 时也能接受。** 这在新研究测试中作为明确的既有缺口复现；/new 的 accept() 页面调用前有 unresolved 守卫，但真正模型层/未来服务侧尚未统一。

在给真实 AI 修订接线或把阶段接受作为业务结果前，**必须把未闭环批注、生成状态、字段一致性及授权等门禁移到真正的权威验收边界**，并保留 UI 守卫作为体验提示。不能只靠按钮 disabled 保证 D06。

## 5. 下一阶段最低验收门槛

| 后续实验 | 通过条件 |
| --- | --- |
| 第一轮 /new Diff UI | 三条批注 → 单次 Fixture 修订 → 正文与字段同源差异 → 逐条人工决定 → 最后才接受 |
| 真实渲染接线 | 复用 Milkdown/ProseMirror 的 computeDocDiff 与现有 json-render Registry；不构建第二套编辑器/Task 状态机 |
| 旧锚点复核 | 新版不强行迁移旧注释；能点开原来源版本，失效时提示「无法定位」，而非跳错文 |
| 生命周期 | 中止/失败保持原稿与批注；完成后才允许编辑/接受；重复/乱序事件、版本冲突保持可恢复 |
| 业务验收守卫 | Stage accept 在真正权威状态机拒绝 open/suggested 批注、未完成生成及正文/UI 冲突 |
| 限制评估 | 长文、复杂格式、字段添加移除/类型重生、密集批注与移动端实际行为单独验收 |

## 6. 技术决定（可逆，不代表产品已上线）

**继续使用 Milkdown + json-render 以及统一 DelegationDraft 的现有能力；不引入新 Diff 库，不接真实模型。**

第一轮优先实现 **批注 → 受控修订候选 → 原文/字段差异 → 用户逐条决定 → 接受**。跨平台协议/真实 Cloud Task/Run、新版持久语义 ID 及动态阶段另需专门合同，不把研究性代码直接当正式实现。
