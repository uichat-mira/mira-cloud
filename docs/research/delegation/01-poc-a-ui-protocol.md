# POC-A · 动态 UI 技术选型与安全门实验

**日期：** 2026-11-16  
**状态：** 协议形状 / 安全策略的独立可运行原型；**第三方库安装与 React 渲染集成尚未实测，不作最终选型**  
**依据：** [31 条产品决议](../../product/delegation-intelligent-ui.md)、[TV01–TV14](../../product/delegation-technical-validation.md)、[研究基线 v0.1](./00-technical-baseline-v0.1.md)。  
**覆盖：** D03（组件语义 ID 的前提）、D09、D10、D11、D30、D31；TV02、TV05、TV09、TV13，部分涉及 TV14。**不代表**这些 TV 已通过。

## 1. 决策问题

Mira 的「交代工作」并非“模型吐 React 代码”：它要求持续审阅的需求正文、受控组件、阶段版本、流式修改和显式授权。选型标准必须把三层分开：

1. **业务真相：** 权威需求定义／阶段版本／审批与调度契约，由 Cloud 业务后端保存，不由 AI 生成 UI 自行决定。
2. **动态 UI 描述与传输：** 仅描述受允许的组件、绑定、增量变化；不能授权发送、删除、付费或接受阶段。
3. **呈现与编辑：** React/MiraDesign 组件和 Milkdown 文档编辑；Office 式批注、选区、视图 Diff 在后续 POC-B 验证。

只比较“能否生成组件”远远不够。协议不是权限系统，schema 验证不是自然语言语义验证。

## 2. 核对的具体版本与证据

| 来源 | 截至本次查询的代码基线 | 源码与事实 |
| --- | --- | --- |
| Mira Cloud | dev `c80c3382c84569732128d4be0538b48640b807cc` | [Web package](https://github.com/uichat-mira/mira-cloud/blob/c80c3382c84569732128d4be0538b48640b807cc/apps/web/package.json)：React 19.3.1，Milkdown 7.21.2，Streamdown 2.5.0，尚未安装两个候选库 |
| json-render | main `229be36d40199b30a2e1d770bc4cb6e8e02b513c` | [core package](https://github.com/vercel-labs/json-render/blob/229be36d40199b30a2e1d770bc4cb6e8e02b513c/packages/core/package.json)、[React package](https://github.com/vercel-labs/json-render/blob/229be36d40199b30a2e1d770bc4cb6e8e02b513c/packages/react/package.json)：均为 **0.22.0**，Apache-2.0；React peer `^19.2.3` |
| json-render 规范 | 同上 | [React schema](https://github.com/vercel-labs/json-render/blob/229be36d40199b30a2e1d770bc4cb6e8e02b513c/packages/react/src/schema.ts)：扁平 `root/elements`、schema/catalog；[core README](https://github.com/vercel-labs/json-render/blob/229be36d40199b30a2e1d770bc4cb6e8e02b513c/packages/core/README.md)：SpecStream 使用 RFC 6902 JSONL，数据绑定 `$state/$bindState` |
| A2UI | main `3ed9601862ecc78027e20ac80ad8b1b98a5d9079` | [v1.0 协议](https://github.com/a2ui-project/a2ui/blob/3ed9601862ecc78027e20ac80ad8b1b98a5d9079/specification/v1_0/docs/a2ui_protocol.md)：current；组件与 `dataModel` 分离，`createSurface/updateComponents/updateDataModel/deleteSurface`；还允许受控函数 RPC |
| A2UI React | 同上 | [@a2ui/react 包](https://github.com/a2ui-project/a2ui/blob/3ed9601862ecc78027e20ac80ad8b1b98a5d9079/typescript/renderers/react/package.json) **0.15.0**；[源码 README](https://github.com/a2ui-project/a2ui/blob/3ed9601862ecc78027e20ac80ad8b1b98a5d9079/typescript/renderers/react/README.md) 声称支持 v1.0，与部分尚标注“planned”的网站页面存在文档滞后/更新顺序差异；未实测包兼容性 |

官方源码比宣传文章可靠，但它仍不能替代当前 npm 包安装、构建和真实浏览器的适配证据。**不能凭文档把 A2UI v1 React 标为已经通过 Mira 集成。**

## 3. 三种方案对比

| 维度 | json-render 0.22 | A2UI v1.0 / React 0.15 | Mira 自建轻量协议 |
| --- | --- | --- | --- |
| 本质 | 类型化 catalog + React renderer，附 JSONL JSON Patch 流 | 独立于渲染器的多 surface UI wire protocol + 可选 React renderer | Mira 私有 schema、patch 和 React renderer |
| 与现有 React/MiraDesign | 可将现有组件注册到 catalog，适配链较短（**待实测**） | 支持自定义 catalog 与组件注册，但协议生命周期/函数范围更大（**待实测**） | 完全可控，但需要独立开发与长期维护 |
| D30 流式 | JSONL patch，官方核心提供 compiler | 消息封套 + 增量组件和 data model；transport 负责有序传递 | 自行处理分帧、乱序、重放、无效半成品 |
| D09 直接修改 | state binding 与 form state，**但不等于权威草稿持久化** | `@path` 与 renderer data model，**但不等于权威草稿持久化** | 完全自建数据绑定和恢复 |
| 组件稳定身份 | 扁平 elements key，适合作语义 ID 的候选 | 组件 id + surfaceId，适合作语义 ID 的候选 | 可自定义 ID/版本，但需防止生成时漂移 |
| 权限/动作 | catalog/action 需要主机额外施加授权门 | catalogs/RPC/function 有能力边界，主机仍需权限验证 | 所有权限边界自行设计审计 |
| 跨平台/开放互通 | 多种 renderer，默认是 json-render 自有 schema | 标准化代理到客户端协议，跨运行时潜力较强 | 生态互通和跨端重用成本最大 |
| 当前可证性 | 官方源码及版本已核对，**未装包** | 官方源码及版本已核对，**未装包** | 下文只验证了最小业务门控形状，无 React 真实渲染 |
| 初步意见 | **作为 Cloud Web 首选集成候选** | 保留为跨端 UI 互通候选；不提前锁定 | **不建议自建完整生成式 UI 框架**；仅保留薄业务安全适配层 |

**关键判断：这三者并不完全处于同一层。** A2UI 更像通用 wire contract；json-render 同时提供 schema/catalog、stream compiler、渲染器。后续可能由 json-render 服务 Cloud Web，而在需要跨运行时的特定边界翻译 A2UI；本轮**不承诺同时引入两套运行时**。

## 4. 可复现实验与结果等级

实验源码（不引入外部依赖）：

- [protocol-gate.mjs](../../../prototypes/delegation-poc-a/protocol-gate.mjs)
- [protocol-gate.test.mjs](../../../prototypes/delegation-poc-a/protocol-gate.test.mjs)
- [POC 运行说明](../../../prototypes/delegation-poc-a/README.md)

```bash
node --test prototypes/delegation-poc-a/protocol-gate.test.mjs
```

**协议实验的保守范围**：json-render 仅处理 `root/elements/state` 的 `add/replace` patch；A2UI 仅处理 v1.0 三种表面/数据更新消息，主动删除主审阅画布被 Mira 策略拒绝；样例 `NumberField/ToggleField` 为本地实验词汇，并非宣称由两个官方 renderer 自带。其序号与 generationId 是 Mira 的传输封套，不是第三方 wire 规范字段。

预先在隔离 JavaScript V8 环境运行了 **17 项逻辑断言，全部通过**（未安装任何第三方库）；同时把 **14 项 Node `node:test` 自动化用例**提交进本分支并接入 Docs Contract CI，最终是否通过以本 PR 对应 GitHub Actions 结果为准。两种运行环境不混同。

实验覆盖：逐条增量/完整树、缺少 children、过期或乱序、跨作用域状态写入、原型链污染、非白名单组件、AI 伪造动作、非法文本对象、展示模型与权威草稿不一致、缺少人工确认/语义验证/批注闭环/服务端版本、主动中止、提前编辑、间隔小于一小时、删除活动 surface 和重复 ID。

**验证结果只能表述为**：在“我们自行编写的最小协议形状处理器”上，可以强制这些不变量。它**不证明**官方 json-render/A2UI package 对应接口已经在 React、Milkdown、MiraDesign 中工作，不证明真实模型可稳定生成规范 payload，也不证明有可靠的恢复/持久化/权限链路。

## 5. 设计取舍与未解决风险

1. **业务数据只能一份权威：** 前端 `state/dataModel` 只是绑定用的呈现投影；保存必须服务端可确认，不能把 AI 更新的 UI state 当 Task/授权事实。
2. **组件身份稳定不等于批注稳定：** element id/surfaceId 是 D03/D25 的必要基础，不是 ProseMirror 文本 anchor、重生成后的语义延续或 Office 式双向定位证明（POC-B）。
3. **流式可见不等于可接受：** 每个完整 patch/message 可形成局部 UI，但最终 schema + 权威一致性 + 人工阶段接受必须独立执行。半截 JSON 不可直接当组件渲染。
4. **协议本身不授予 side effects：** AI 可请求一个按钮布局，不代表能发送邮件、删除文件或支付。A2UI 的函数 RPC 与 json-render 的 built-in actions 均需在 Mira 侧严格注册/授权；一期最小方案先关闭 AI 侧有副作用动作。
5. **语义一致性无法只靠 JSON 结构验证：** D10 的“正文描述每天一次、字段每周一次”必须由独立业务规范化/检查和用户明确审阅解决；本 POC 只有外部门控槽位，未声称完成。
6. **协议版本漂移真实存在：** json-render API 与 A2UI 规范/包快速演进。必须精确 pin 版本/来源，并在选型前跑真正的第三方包安装、打包、React mount、交互与失败路径。
7. **资源和模型成本未知：** JSONL event 数、token 数、patch 冗余、前端重渲染、组件包体积、低端移动设备延迟尚未测量，不得给出虚构指标。
8. **可访问性、滚动、输入焦点、编辑器交叉区域** 必须进浏览器真实交互验证；不能靠 headless 对象树推断 UI 可用性。

## 6. 当前建议及下一步退出门槛

**技术决定（可逆，非最终采纳）：** 建议下一轮优先以 **json-render 0.22.0 的 catalog/React renderer** 进行真实接入对照实验，同时保留 **A2UI v1.0 / React 0.15.0** 为同条件比较基线；Mira 的业务需求/阶段版本/安全门必须独立于两者。**不引入新依赖、不改正式工作台、不确定最终协议。**

**需要补齐才能宣布 POC-A 选型完成：**

- 实际安装 exact-pinned 官方包，React 19 + MiraDesign 演示 4 种受控组件，并在浏览器确认交互；
- 用两套官方 parser/renderer 跑相同 schema fixture、增量更新、异常输入、组件稳定 ID、渲染性能/包体；
- 验证依赖许可/构建、React refs、受控输入、Text 与 Milkdown 区域边界；
- 模拟断线与续传、重复/乱序事件和 schema 版本升级，证明平台无法绕过业务验收；
- 在真实模型生成样本上统计协议合规率、token 成本和 fallback 频率；
- 将选型结果升级为独立实施技术合同/ADR 后才能考虑正式接线。

**本阶段完成的只是第一块可运行协议安全研究，POC-A 的第三方真实渲染验收仍未完成。** 不应直接开工 Workspace 正式功能。

## 7. 证据与归档

- Mira 当前运行时边界：[AGENTS.md](https://github.com/uichat-mira/mira-cloud/blob/dev/AGENTS.md)、[Workbench 产品合同](../../product/workbench.md)。
- 第三方版本及源码参照见 §2，原型代码见 §4。
- GitHub PR 及 CI 运行证据由本研究 PR 保留；所有真实通过结论要绑定具体 commit/run。本文不等于部署、真实委托、模型推理或浏览器 UI 验收。
