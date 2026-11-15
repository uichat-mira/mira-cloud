# 「交代工作」Intelligent UI — 技术研究记录

**文档角色**：记录研究证据和技术可行性结论；不复制或替代产品 PRD、工程 Issue、运行时合同。

- 产品决策权威：[D01–D31 PRD](../../product/delegation-intelligent-ui.md)
- 待验证条件：[TV01–TV14](../../product/delegation-technical-validation.md)
- 架构及运行时所有权：[Mira Cloud v0.4](../../architecture/v0.4.md)、[ADR-003](../../decisions/ADR-003-hono-drizzle-postgres-deployment.md)

## 已归档研究

| 阶段 | 研究记录 | 证据等级 |
| --- | --- | --- |
| 00 · 全链路技术基线 | [技术预研 v0.1](./00-technical-baseline-v0.1.md) | 已阅读源码及技术资料；**未执行 POC、未完成运行时验收** |

## 后续阶段及入库规则

后续每完成一个独立研究阶段，在本目录新增一份带来源、基线版本、实验方法、结果、失败证据、风险及下一步的记录，并更新本索引。建议沿以下路线逐步推进，**不将计划中的 POC 当成已做的测试**：

1. 动态 UI 与 schema / streaming 方案对比（POC-A）。
2. Office 式锚定批注及文本／组件 Diff（POC-B）。
3. 需求版本、自动保存、流式中断与冲突恢复（POC-C）。
4. Cloud Pi Scheduler / Delivery 与长期委托合同差距验证（POC-D）。
5. 跨端可用性、权限、成本及真实运行闭环证据。

**交付纪律**：按 `feat/* → PR → dev`，每一阶段保留独立可审查的证据。已经确证的事实、尚待证明的推断、技术建议和原型结果分别标记；不得改写既有事实以制造“验证通过”。不自动修改 Cloud Pi、Cloud Auth 或生产运行时。
