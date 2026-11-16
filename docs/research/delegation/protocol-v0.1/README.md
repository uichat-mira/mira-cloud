# Mira Delegation Protocol v0.1 — 可复核资料

本目录仅保存[模型无关起稿协议研究](../08-delegation-protocol-research.md)的机器可读材料，**不是当前 Mira Cloud 的业务 DTO、运行时协议或权限合同**。

- [Proposal JSON Schema](./mira-delegation-proposal-0.1.schema.json)：Draft 2020-12 研究规范；不是供应商可直接使用的 Structured Outputs 子集。
- [fixtures/](./fixtures/)：一次性工作、长期监测、证据不足、批注修订四类合法 Proposal。
- [validate_fixtures.py](./validate_fixtures.py)：基于 Python jsonschema 和额外研究规则验证四份样例及十类变异输入。
- [host-event-example.json](./host-event-example.json)：Host 独占的渐进展示事件封套示例，尚无独立校验实现。
- [revision-proposal-example.json](./revision-proposal-example.json)：建议修订报文示例，尚无独立 Schema 或校验实现。

本地复核：

    python3 -m pip install jsonschema
    python3 docs/research/delegation/protocol-v0.1/validate_fixtures.py

预期结果：4 valid fixtures; 10 invalid fixtures rejected。验证器并未通过正式 UI、后端、模型提供商或跨端的端到端测试，不允许用此结果推断服务已可用。

**变更纪律**：未来正式协议应有独立 Owner、版本与迁移路径；不要直接用研究 Schema 替换现有 DelegationDraft schemaVersion=1。
