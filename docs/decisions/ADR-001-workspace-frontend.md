> **Historical design exploration — not an approved implementation plan.** Mira Cloud is currently design-only. The [v0.4 architecture](../architecture/v0.4.md) and [environment contract](../engineering/environment.md) supersede any implication below that a frontend must now be scaffolded or deployed. No runtime implementation or OAuth expansion has been authorized.

# ADR-001 · Mira Cloud Workspace 前端工程方案

状态：技术方案 v0.1（拟定；尚未创建远程仓库或修改生产）  
评估基准：2026-11-11；来源为当前 GitHub `dev` / Organization `main` 文件

## 0. 决议

创建独立 GitHub 代码库候选 `uichat-mira/mira-cloud-workspace`，作为可进入正式产品的前端模块（不是永久的静态 HTML 原型仓库）。统一面向浏览器和 Mira Mobile WebView。工作台 UI 只有一份源码、设计 token 只有一个权威源，身份与业务数据沿用现有 Cloud Auth / Cloud Pi。开发与生产连接通过注入的 Port/Adapter 分离。

## 1. 仓库形态和技术栈

- pnpm Workspace，Node 24 开发（对齐 Cloud Auth 构建）；React 19、TypeScript 严格模式、Vite、React Router 7。
- Tailwind CSS 4（仅预览应用配置 base/preflight；可复用组件包不能向 host 注入全局重置）、**作用域 CSS 变量**、Lucide React、必要时 Radix primitives。
- TanStack Query 管远端缓存与刷新；Zustand 仅用于局部 UI 状态；Zod 做 API 边界校验。
- Vitest / React Testing Library 做组件与 contract 测试；按风险做真实浏览器与 Android/iOS WebView smoke，不以缺少浏览器工具的 Agent 检查为 CI 硬门槛。
- 不引入 Next.js、React Native Web、Electron、microfrontend/Module Federation、额外自建后端。

```text
mira-cloud-workspace/
├── AGENTS.md
├── README.md
├── pnpm-workspace.yaml
├── apps/
│   └── playground/                  # Vite 预览壳，Mock Adapter，仅演示模式
├── packages/
│   └── workspace/                   # 将来直接供 Cloud Auth 集成
│       ├── src/index.ts             # export WorkspaceRoot / routes / contracts
│       ├── src/app/                 # Layout + routing
│       ├── src/features/
│       │   ├── overview/
│       │   ├── tasks/               # 临时委托
│       │   ├── schedules/           # 定时计划
│       │   ├── runs/                # 运行与状态
│       │   ├── artifacts/           # 成果与复用
│       │   ├── skills/              # 先做展示/可发现性
│       │   └── github/              # GitHub 工程任务视图
│       ├── src/adapters/            # 仅声明接口和真实/Mock Adapter
│       ├── src/theme/               # MiraDesign Desktop token 消费端（生成文件）
│       └── src/components/          # 私有工作台组件
└── docs/
    ├── ADR-001.md
    ├── design/                      # 交互、状态、无障碍说明
    └── contracts/                   # API 差异和待实施条目
```

## 2. Token 权威和风格

当前单一权威：`uichat-mira/mira-desktop@dev` 的 `desktop/src/shared/theme/colorThemes.ts`、`desktop/src/styles.css`、`desktop/tailwind.config.cjs`（AGT-047 固定 commit `5036067d3a87ba95d798e01ededc7fbd678327de`）。**不手工维护第二份相似色板**；工作台使用从精确源 SHA 导出的生成结果，源码位于 `apps/web/src/theme/mira-design/`。生成器与生成文件同时记录上游 SHA，并在 CI 运行 parity check。升级 Desktop 主题时显式升级源 SHA；后续有真实复用需求再抽成独立可版本化 package，令相关端都消费它。

默认主题（`warm-neutral` / light）：

| Token | 值 |
| --- | --- |
| `--color-primary` | `193 95 60` |
| `--color-primary-hover` | `156 67 40` |
| `--color-surface-secondary` | `248 248 246` |
| `--color-surface-primary` | `252 251 249` |
| `--color-surface-soft` | `245 240 232` |
| `--color-text-primary` | `31 27 24` |
| `--color-text-secondary` | `87 81 73` |
| radius | 8 / 10 / 12 / 14 / 16 / 18 / 20 / full |
| spacing | 4 / 8 / 12 / 16 / 20 / 24 / 32 / 40 |
| touch target | ≥ 44px |
| body | 14px / 1.6 line-height |

全部支持 Desktop 四组 preset：`warm-neutral`、`knowledge-blue`、`archive-green`、`slate-ocean`，各自 light/dark。生产 WebView 只同步 `preset` 与 `mode` 等**非敏感**视觉信息。工作台使用独立命名空间（`--mira-*` + `data-mira-*`），不得覆盖 Cloud Auth 的 `--mc-*` 全局变量。遵守 MiraDesign 视觉原则：暖色表面、珊瑚色克制使用、细边框+背景层级、少阴影、系统/Desktop 字体栈、Lucide、44px 点击目标。

## 3. 真实集成边界

**独立预览壳**：注入 `MockWorkspaceClient`，所有按钮与页面实际可交互，但只能改本地演示状态，明显标注 demo，不调用生产、不模拟真实成功。Mock fixture 与 UI 代码分开。

**Cloud Auth**：集成 `@uichat-mira/cloud-workspace` React library 的路由与组件，复用其真实 Session/登录状态及受保护的同源 API 网关。优先挂在已有 `/account/services/cloud-agent/*` 下，不新建登录体系、跨域 iframe 或独立令牌副本。明确区分“控制台登录成功”和“Cloud Pi 工具/工作授权成功”。工作台可复用本身的视觉布局，不让 Cloud Auth 全局 console CSS 冲突。

**Cloud Pi**：继续拥有 Run、Scheduler、Delivery、Artifact 的事实；通过已存在的 loopback API 与受 Cloud Auth 验证的 Owner Gateway 消费；不得从浏览器直连 127.0.0.1 的 Node API。现有 API 对 schedules / runs / report 的读取和有限操作可先接；通用临时任务 POST、完整 artifact index、Skills 管理、GitHub 任务写入是独立待定义的**服务合同**，绝不能靠伪造前端 API 让 UI 看似上线。

**Mobile WebView**：打开 Cloud Auth 的同一受保护 HTTPS 页面，mobile compact 布局、安全区适配、键盘避让、Android Back、外部 URL 交给系统浏览器。初版可在 WebView 内通过标准 Cloud Auth 流程登录；未来无感 SSO 需后端支持一次性、短效、受众绑定的会话交接，登录完成换取受保护 Cookie；不能通过 URL/JSBridge/localStorage 明文传递长期 Cloud Session 或模型密钥。WebView 仅对可信 origin 加载与通信。容器只处理导航、主题、分享、下载和通知，不复制业务客户端。

## 4. UI 信息架构与工作链

顶层：`Overview / Tasks / Schedules / Runs / Artifacts / Skills / GitHub`。PC 左侧导航 + 中央主区 + 可选任务侧栏；Mobile 单列与底部操作区，任务详情单独全屏。统一查询/过滤和关联 ID：Task → Trigger → Run → Artifact → GitHub Issue/PR；但 Task 是产品工作定义、Issue 是工程工作契约，两者不能合并成一个“数据库”。

状态设计：loading / empty / offline / unauthorized / denied / pending confirmation / running / partial / failed / cancelled / completed。操作产生外部副作用时展示作用域与明确确认；模型的输出和 PR/CI 不能自动触发受限写操作。

## 5. 工程权限

- Cloud Auth：唯一云身份、设备和凭证颁发权威。
- Cloud Pi：任务、执行、产物、Skills 执行策略权威。
- GitHub：Issue 契约、Project Status、PR/CI/Commit 及正式版本事实来源。
- 工作台：无第二份业务状态数据库；仅呈现、筛选、显式发起有权限的命令。
- GitHub Skill 仓库必须 pin commit/version；安装不等于可执行任意命令，写操作按授权分层。

## 6. 交付顺序和验收

**A / 代码项目基础**：独立 repo + package/preview + MiraDesign Desktop token parity（含所有 preset light/dark）+ 响应式 UI；测试 build、类型、主题快照、无全局 CSS 污染、WebView 模拟宽度。

**B / 真数据只读**：通过 Cloud Auth 现有 auth+gateway 读取 Agent status、schedules、runs、report。无真实数据时展示真实空态/不可达，不用 demo 替代。

**C / 安全操作**：启停/立即执行、临时委托 API 合同、成果复用、审批、取消、失败和幂等。

**D / Mobile**：Android/iOS WebView 入口、标准登录或明确授权的 SSO、主题同步、导航/分享/下载、掉线与重连。

**E / 能力扩展**：Skills/GitHub 的只读发现先行，真正写操作和运行时权限单独验收。

通过条件：同一 workspace 组件编译产物在 playground 和 Cloud Auth 工作；视觉 token 与 pinned Mira Desktop 源一致；Chrome/Android WebView/iOS WebView 最低验证布局与核心交互；前端没有密钥；生产授权/任务写操作由真实 API 确认；不改变 Desktop / Mobile Local Provider 独立路径。

## 7. 当前阻塞与未实施项

1. 已连接 GitHub 工具可以读取/修改**已存在**仓库，但没有新建 GitHub Repository 或 GitHub Project 的动作。因此本次评估没有声称已在 GitHub 建库；候选 repo 名需要通过具有管理权限的创建路径实现。
2. `mira-cloud-workspace` 尚未产生源码、PR 或上线。现有单文件 HTML 原型只能用作信息架构/交互参考，不作为最终代码基底。
3. Cloud Auth 现有 `--mc-*` 控制台风格不等于 MiraDesign token，需要隔离与渐进迁移。
4. 当前 `mira-desktop` 的 `colorThemes.ts` 是 canonical；AGT-047 在 Cloud 内固定上游并生成 Foundation，不能让两份 runtime token 分叉。

## 8. 当前来源（代码事实）

- Organization: https://github.com/uichat-mira/.github/blob/main/AGENTS.md  SHA `50d7ce672b6b479ab1fc1947f4c63659abae6a3a`
- Desktop theme source: https://github.com/uichat-mira/mira-desktop/blob/dev/desktop/src/shared/theme/colorThemes.ts
- Desktop base styles: https://github.com/uichat-mira/mira-desktop/blob/dev/desktop/src/styles.css
- Desktop Tailwind semantics: https://github.com/uichat-mira/mira-desktop/blob/dev/desktop/tailwind.config.cjs
- Mobile WebView dependency: https://github.com/uichat-mira/mira-mobile/blob/dev/package.json
- Cloud Auth web: https://github.com/uichat-mira/cloud-auth/blob/dev/apps/web/package.json
- Cloud Auth console global CSS: https://github.com/uichat-mira/cloud-auth/blob/dev/apps/web/src/styles/globals.css
- Cloud Auth CloudAgent page: https://github.com/uichat-mira/cloud-auth/blob/dev/apps/web/src/pages/account/cloud-agent-page.tsx
- Cloud Pi policy: https://github.com/uichat-mira/cloud-pi/blob/dev/AGENTS.md
- Cloud Pi run composition: https://github.com/uichat-mira/cloud-pi/blob/dev/src/app.mjs