# 04 · Milkdown × json-render × 统一需求模型：组合原型验证

**日期**：2026-11-16
**任务性质**：现有 `/new` 页面上的产品原型 P0 实验，不是正式任务服务、AI 模型或生产验证。
**产品依据**：[D01–D31 交代工作 PRD](../../product/delegation-intelligent-ui.md)、[第 03 轮设计符合性审查](./03-d01-d31-prototype-conformance-audit.md)。
**实验目的**：证明 Milkdown 编辑的正文、json-render 控件及阶段版本，能被**一份可检查的需求草稿**约束，而非各自独立漂移。

## 本轮真正改变了什么

- 新增 `apps/web/src/features/work/delegation-document.ts`：每个阶段的 `markdown`、`config`、修订号、已接受快照、历史快照，以及草稿批注统一归入一个 `DelegationDraft`。json-render 的 Provider 只是由草稿初始化的可交互投影；其 `onStateChange` 将受控字段变更回写到草稿，再由草稿驱动正文。
- 在正文中设置明确的 **「当前约定」**：从同一份结构化配置派生，而不是单独维护摘要。改动 Select / Switch 会更新文档里的约定，同时保留其它自由文本；若用户在 Milkdown 把约定手动改得与控件不同，验收被阻止。
- 用户可明确选择「按控件同步约定」，再考虑接受当前阶段。矛盾不会在背景中自动被改掉。此动作重新生成「当前约定」标题及其后的文本；其它正文尽可能保留。
- 按阶段保存浏览器会话草稿与批注，通过 `sessionStorage` 在同一标签页刷新后恢复。遇到写入失败显示提示，**不能把此保存称为云端持久化**。
- 已接受阶段默认只读，历史版本可展开查看；「修改本阶段」开始一个独立修改草稿。取消修改会恢复原文和控件，提交修改才让该阶段及以后阶段重新验收；旧版快照保留。
- 修复手机端返回、场景切换及底部主要操作等触控目标，使关键按钮至少 44px 高。

## 代码与复现实验

**实际使用的库**：项目原有 `@json-render/react@0.22.0` / `@json-render/core@0.22.0`、React 19、MiraDesign Select / Switch、Milkdown Crepe 7.21.2 的 MarkdownEditor；只读文档使用仓库 MarkdownText/Streamdown。无新增第三方依赖。

```bash
# 仓库根目录
pnpm --filter @mira-cloud/web exec vitest run tests/delegation-document.test.ts tests/delegation-page.test.tsx
pnpm --filter @mira-cloud/web check
node scripts/check-docs.mjs
```

新增逻辑与 React 交互测试覆盖：

1. 控件值变更后正文的同一份约定同步更新，其他正文和旧快照不被误写。
2. Milkdown 修改约定产生冲突时，验收被阻止；甚至在正确约定后追加相矛盾的段落也不能绕过检查。
3. 不会因接受前一阶段而悄悄覆盖下一阶段已经出现的矛盾。
4. 旧阶段先编辑时不立刻撤销已接受状态，只有点击「提交修改并重新验收」才使后续验收失效。
5. 取消历史草稿时，json-render 控件和正文同时恢复；历史记录保留。
6. 草稿在浏览器会话重建后可以恢复，非法结构或意外 schema 版本不可直接信任。

### 真实浏览器组合检查

使用 macOS Chrome 157 的 DevTools Protocol，在本地 Vite `/new` 进行操作：

1. 页面实际挂载 json-render 组件与需求文字。
2. 打开**真实 Milkdown** 编辑器，向「当前约定」段落插入和控件不一致的文字。
3. 退出编辑：观察到 `role=alert` 警告，且「接受本阶段」确实 disabled。
4. 明确点击「按控件同步约定」：警告消失，阶段恢复可接受。
5. 使用 390×844 手机模拟视口检查：文档 `scrollWidth=390`，底部主要按钮高 **44px**，没有根级水平溢出。

复现脚本：[浏览器组合检查](../../../prototypes/delegation-unified-document/browser-qa.mjs)。需要本地已运行 Web Vite 和使用 Chrome DevTools Remote Debugging 9222；浏览器检查**不在 Mira Gate 中自动运行**。该脚本使用固定本地地址、临时用户会话，不需要生产凭据。

截图（对应本地浏览器验证）：

- [桌面图](./assets/unified-document-desktop.png)
- [手机 390px](./assets/unified-document-mobile.png)

## 证明了什么；没有证明什么

**已证明（当前原型）**：官方 json-render 与真实 Milkdown 可以在同一 React 页面内交换经过白名单约束的字段修改；统一需求草稿能把可编辑文本和受控 UI 的「正式约定」一致性、阶段历史、撤销以及显式接受串起来。这个结论仅限本轮 Fixture 和受控目录。

**仍未通过**：

- **自然语言全文语义一致性**：本轮是确定性的「当前约定」段落校验，不是通用语义推理。用户在其它自由正文里写与配置冲突的话，仍可能绕过；正式 D10 不能判定完成。
- **真实 AI 生成和结构化流式修订**：仍是预制 Spec 与计时器演示，不证明模型可动态生成、注释驱动的跨文档 patch、成本或失败恢复。
- **精确 Office 式批注和 Diff**：当前批注并非 Milkdown ProseMirror 位置锚定，也不具有组件锚点和历史版本 Diff；留给 POC-B。
- **正式持久化、多设备版本冲突与委托提交**：sessionStorage 是同标签页演示保存，不是服务端事务或 Cloud Auth；不执行 Cloud Pi 任务。
- **完整 D01–D31 原型验收**：原型还有意图输入、动态阶段数量、长期托管时间轴、移动软键盘/真机触控等缺口。

**阶段性决定**：可以继续将 json-render 0.22 作为 Mira Cloud 受控动态组件的首选候选，**组合技术 POC 的「受控一致性与历史」路径已经有实际证据**；但整个 Intelligent UI 产品原型 POC 尚不能宣布完成。下一步优先验证锚定批注、Diff 和真正有意义的流式修订体验。
