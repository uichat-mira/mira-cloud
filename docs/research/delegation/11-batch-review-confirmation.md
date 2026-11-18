# D06 / D26 批注选择式批量确认

**日期**：2026-11-17
**基线**：`feat/delegation-diff-review-ui-20261116`，Diff Fixture UI 已接入的本地候选。

## 范围

在现有 /new 随文批注栏中补齐 D06 / D26，不改变批注状态模型，不引入第二套审阅流程：

- 只有 `suggested`（已有处理建议）的当前阶段批注显示选择框。
- 用户明确勾选后，才可执行「确认选中」；未勾选的建议保持 `suggested`。
- `open`、其他阶段、已解决、已放弃及不存在的 ID 均不属于批量确认目标。
- 原有逐条「确认解决」与「放弃」操作保留。
- 批量确认后，未闭环批注仍阻断阶段接受；是否可接受由领域层 `acceptDocumentStage` 再次校验。
- 选择状态只保存在当前 React 页面状态，不写入草稿或持久化合同；切换阶段／情境会清空。

## 验证

- Domain T1：验证只处理用户选中的 `suggested`、只限当前阶段；`open` 与未选中的 `suggested` 保持原状；重复 ID 也不能跨阶段误修改；原草稿不被修改；无有效目标时返回原对象。
- UI jsdom：覆盖勾选两条并批量确认、未勾选建议保留、`open` 不可勾选、其他阶段不受影响、逐条操作仍可用、未闭环仍阻断阶段接受。
- Chrome CDP：桌面 1440 × 900 与移动模拟视口 390 × 844 均通过；验证仅选择一条后批量操作不影响未选中／open 条目，剩余建议仍可逐条确认；移动选择框与批量按钮实测高度均不低于 44px，无横向溢出。该证据是 Chrome 模拟视口，不等于 iOS／Android 真机。
- `pnpm --filter @mira-cloud/web check`：通过；MiraDesign token、Prettier、ESLint、TypeScript、Vitest **21 个测试文件 / 245 项测试**与生产构建通过。Vite 保留既有 MarkdownText 907.82 kB chunk 大小告警，未隐藏或豁免。
- `node scripts/check-docs.mjs`：38 个 Markdown 文件合同检查通过；`git diff --check`：通过。

## 边界

当前建议由本地预设 Fixture 产生，状态名 `suggested` 不代表已经接入真实模型。草稿仍为 `sessionStorage`；本次不证明跨会话持久化、云端并发控制、服务端批量写入、真实 AI 理解质量或真机交互。
