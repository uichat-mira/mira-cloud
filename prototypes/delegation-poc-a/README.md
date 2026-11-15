# POC-A · 动态 UI 协议与受控边界实验

**状态：研究原型（非生产实现）**  
**产品依据：** [D01–D31](../../docs/product/delegation-intelligent-ui.md)  
**实验范围：** json-render 0.22 的 **RFC 6902 SpecStream 形状子集**、A2UI v1.0 的 **createSurface / updateComponents / updateDataModel 形状子集**，两者统一经过一个 Mira 特有的审阅安全门。没有安装或运行任何第三方官方渲染器。

## 运行方法

项目根目录执行：

```bash
node --test prototypes/delegation-poc-a/protocol-gate.test.mjs
```

无第三方依赖。测试在仓库的 Docs Contract CI 作业中执行，不影响正式 `apps/web` 或 `apps/api`。

## 测的是什么

- **协议封套**：创建与增量追加字段/组件、生成轮次 ID、连续序号、完整性。
- **安全门**：仅允许 `Column / Text / NumberField / ToggleField`；拒绝未经授权的组件、事件动作、任意路径更新、原型链污染；A2UI 的函数 RPC 与主动删除画布不在此原型授权范围内。
- **业务状态**：UI 的展示数据不得改写权威草稿；校验包含最小一小时限制。
- **验收门槛**：组件与展示数据校验通过仍不足以接受阶段。用户确认、批注已闭环、语义一致性外部证明、服务端保存的正确版本缺一不可。
- **失败行为**：乱序/旧生成事件被拒、半成品/取消生成不能验收、失败的协议更新不能污染上一状态（拷贝后修改）。

## 明确没测什么

- **不是** `@json-render/core` / `@json-render/react` 或 `@a2ui/react` 的真实导入、渲染或性能验收。
- 本原型并未完整实现 RFC 6902 六类操作、A2UI 全部消息/函数调用、完整 JSON Schema、属性联动、动态文本/编辑器光标、异步 SSE 断线续传。
- 简化版 `semanticAgreementVerified` 是**外部判定输入**，不能代表已经解决自然语言正文与结构化字段的一致性证明；真实环境需要服务端持久化和权威版本校验。
- 自定义 `NumberField` / `ToggleField` 是 **Mira 实验组件词汇表**，不是 A2UI Basic Catalog 的保留组件名。所有字段和动作仍需要正式 MiraDesign 组件映射及授权审查。

原型仅作为 POC-A 的轻量、可复核证据，验证**Mira 必需的不变量可在不同声明式协议之上实现**，而不是提出第三套完整 UI 协议或签署最终技术选型。
