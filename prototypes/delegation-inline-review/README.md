# /new 随文批注 Chrome 回归

仅验证正式 /new 的本地 Fixture 原型。需要 Mac Node 24、Vite 127.0.0.1:5173 和 Chrome CDP 127.0.0.1:9222。每个脚本创建独立临时浏览器标签页，使用本地草稿，结束后关闭；截图仅输出 /tmp，不调用真实 Cloud Auth、Pi、Task 或收费模型。

从仓库根目录运行任一脚本：

    NODE_USE_ENV_PROXY=0 node prototypes/delegation-inline-review/browser-qa.mjs

| 脚本 | 要证明的风险 |
| --- | --- |
| [browser-qa.mjs](./browser-qa.mjs) | 批注→原文双向定位、刷新、编辑后锚点重映射、桌面与手机视口 |
| [sequential-selection-qa.mjs](./sequential-selection-qa.mjs) | 右栏保持开启后对不同段落连续创建有来源的批注 |
| [selection-debounce-qa.mjs](./selection-debounce-qa.mjs) | 180ms 稳定选区、防误弹、改选和取消 |
| [comment-intent-qa.mjs](./comment-intent-qa.mjs) | 无选区只读；整体意见必须明确指定范围 |
| [abandoned-comment-qa.mjs](./abandoned-comment-qa.mjs) | 放弃后列表、高亮、验收、刷新一致 |
| [desktop-sticky-qa.mjs](./desktop-sticky-qa.mjs) | 右栏**视口固定**，24 条批注/长文独立滚动；沿用早期文件名 |
| [draft-topline-qa.mjs](./draft-topline-qa.mjs) | PC 草稿栏吸顶，移动端不新增吸顶 |
| [review-icon-topline-qa.mjs](./review-icon-topline-qa.mjs) | 唯一右上角批注图标、开关、窄屏溢出 |
| [selection-animation-qa.mjs](./selection-animation-qa.mjs) | 桌面宽度过渡、选区与禁用多余 LaTeX 浮层 |

[chrome-client.mjs](./chrome-client.mjs) 只复用 CDP 连接、求值与清理生命周期，不包含审阅领域行为断言。新增浏览器场景应复用此模块。

**限制**：Chrome 模拟视口不是 Android/iOS 真机验收；Fixture 交互验证也不能证明云端任务服务已可用。任何脚本的失败都应如实记录，不能沿用旧版测试日志代替。
