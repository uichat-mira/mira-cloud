# ADR-002 · Mira Cloud 全栈技术栈立项

- **状态**：Accepted as **design baseline**；**not implementation authorization**（2026-11-11）
- **Work item**：[AGT-040](https://github.com/uichat-mira/mira-cloud/issues/4)
- **产品合同**：[Mira Cloud v0.4](../architecture/v0.4.md)
- **环境合同**：[environment.md](../engineering/environment.md)
- **原则**：One Account, Multiple Runtimes, Shared Work；复用现有事实源、单主写入、轻量优先、按可验证行为演进。

> 本 ADR 决定未来实现的优先技术路线，不宣称这些模块已构建、已联通或已上线。具体依赖版本以未来实施时锁文件 + 可重复测试为准。本文的技术取舍不授权扩张 Phase III 的 Desktop Host 能力，也不改变 Cloud Auth、Cloud Pi 等仓库现行合同。

## 1. 最终选型（一页表）

| 层 | 立项优选 | 现状 / 选择依据 | 不在首期引入 |
| --- | --- | --- | --- |
| 新代码语言、工作区 | **TypeScript strict；Node.js 24 LTS；pnpm 10**（锁定精确版本） | Cloud Auth 当前 Node >=24、pnpm 10；新业务与 Web 有共同类型和测试生态；仅作用于未来新 Mira Cloud 服务 | 将 Cloud Pi、Desktop、Mobile 强制统一到 Node 24 |
| Web 工作台 | **React 19 + Vite 8 + React Router 7** | 与现有 Cloud Auth Web 生态接近，但产品必须独立 OAuth，不嵌入 Portal 作为长久归属 | Next.js SSR、React Native Web、微前端/Module Federation |
| UI / 样式 | **Tailwind CSS 4 + 作用域 CSS Variables；必要时 Radix；Lucide** | Token 权威是 `mira-mobile@dev`，需记录源 SHA、校验 preset/light/dark 一致；不直接拷贝 Cloud Auth Console 皮肤 | 新造第二份 token 权威、巨型通用 UI Kit |
| Web 数据层 | **TanStack Query（服务端状态），Zustand 仅 UI 局部确需时** | 处理任务/运行可取消请求、缓存失效、SSE 重连；不复制后端状态 | 自建通用状态同步平台 |
| Web 会话入口 | **Web OAuth Authorization Code + PKCE + 同源 BFF** | Auth V0 当前仅 native `mira-desktop` / `mira-mobile`；正式 Web Client 的 code/token/claims/refresh/consent 合同需要 Cloud Auth owner 单独批准 | 直接挪用 Portal cookie、原生 Cloud Session、密码模式 |
| 新 API / Web BFF | **Node 24 + Fastify 5 + TypeScript + Zod 4** | Cloud Auth API 已采用 Fastify 5、TS；Mira Cloud 自己负责业务与资源级权限，Auth 只负责身份/授权 | GraphQL、NestJS、完整 API Gateway 平台 |
| Agent Runtime | **延续 Cloud Pi Pi SDK + 原生 MCP Extension**；保留当前 Node >=22.19 约束 | `cloud-pi/src/app.mjs` 是既有单进程装配；Pi 依赖当前锁在 `1.4.0` | 第二套 Agent Loop、重写 MCP JSON-RPC、直接将 Desktop Runtime 云端复制 |
| Scheduler / Delivery | **复用 Cloud Pi 现有 Croner / scheduler / delivery**，逐步纳入 Task-Run 合同 | 当前已有调度、运行记录、IM 投递幂等/恢复；升级期只有一个 Scheduler 写入权威 | Temporal、BullMQ、第二个 Cron、Redis 任务队列 |
| 业务元数据存储 | **SQLite WAL + 事务、单写主实例**（未来 Core） | 2C4G 目标和小用户规模优先低运维；SQLite 只属于 Mira Cloud 数据库，绝不与 Cloud Auth DB 混用 | 首期 PostgreSQL、分布式 DB、共享网络文件数据库 |
| Artifact | **本地受控文件目录 + SQLite 元信息 / Hash / 资源归属**，可替换成对象存储 | 现有 Research Run 产物已是文件；交付优先原始可读资产和溯源 | 强制 S3/R2 迁移、把文件二进制塞入 SQLite |
| Memory / 检索 | **可审阅结构化记忆 + SQLite FTS5**；未来实测再看 embedding | 有作用域、来源、删除、跨端显式共享；不把整份模型上下文重复入库 | 默认向量数据库、自动无约束写长期记忆 |
| 实时进度 | **HTTP JSON + SSE（带事件序号/游标）+ 补偿式 GET** | 首期单向进度观察，断连不等于取消；Run 事实仍在其 owner | 初期全站 WebSocket、Kafka/event bus |
| GitHub 集成 | **GitHub App（仓库级授权、短期 installation token）优选**；只读先行 | GitHub Issues/Project/PR 的现有单一真相源与审查权威不能被 Cloud 复制；Skill 以 Git commit 固定版本 | PAT 长期明文存储、项目管理状态双写、自动将 CI 绿当验收 |
| 运行与反代 | **单主 Node API/BFF + 既有 Cloud Pi Node 进程（必要的双进程边界）；Caddy + Docker Compose 候选** | 跨账户与 Web Session 信任边界隔离；先按运行证据选择主机，部署拓扑未批准 | Kubernetes、微服务矩阵、跨机透明共享 stateDir |

## 2. 服务边界与实际部署的最小形态

```text
Browser / Mobile WebView
  -> HTTPS / Caddy (future, not configured)
    -> Mira Cloud Web (static Vite assets) + Fastify BFF/Core API [Node 24, proposed]
       -> Cloud Auth OAuth / service credential (separate owner)
       -> task metadata / artifact ACL / owner checks [SQLite + files, proposed]
       -> internal request/command boundary -> Cloud Pi [existing Node >=22.19]
       -> GitHub App / limited MCP / built-in service adapters (authorized only)

Mira Desktop (native OAuth Cloud Client)
  -> own local backend controls credentials -> Mira Cloud service API
  -> local Agent/Host/Harness retains local tool approval and run authority
```

**不假设部署在同一服务器**，更不假设现有阿里云/腾讯云之间已实现安全互通。BFF/Core 可先同一 Node 24 服务、按路由/模块隔离；Cloud Pi 是另一个已有进程。需要远端通信时按正式 audience、mTLS/受限私网或短期服务凭证合同评审，不将原本仅绑定 loopback 的管理 API 公开到互联网。

## 3. 真相源与持久化迁移

- **Cloud Auth** 只写 Cloud Account、Device、OAuth、Service Credential、Grant；不承接 Task、Artifact、Memory 或模型配置。
- **Cloud Pi 现状**：Scheduler、Research Run、Delivery 是原子文件写入且**单进程 stateDir 独占写入**。这些文件在迁移前仍是运行事实，不能把新建 SQLite 表称为已在使用。
- **Mira Cloud Core 未来**：SQLite 拥有 Task、Trigger、Cloud-owned Run 索引、Artifact 元数据、Memory、WorkLink、预算及业务级 ACL；同一语义只允许一个写入权威。转型必须有版本化导入、暂停/冻结旧写入、核对行数/幂等键/来源、失败回滚，再切换读取；禁止不受控长期双写。
- **Desktop/Mobile 本地**：原始文件、Session、Local Provider Key、Tool 运行状态不自动同步。跨端交接是带权限和来源的 `HandoffPackage`/独立 Run；不是移动模型对话内存或共用 SQLite。
- **Artifact**：从 Run 产生时保存 owner、URI/相对路径、MIME、大小、SHA-256、版本、敏感度、保留期限；服务端授权后下载，路径归一化以阻断 traversal；备份时覆盖 SQLite WAL/一致性快照与文件索引，执行恢复演练前不宣称可恢复。
- **Scheduler**：长期持久化 trigger + 运行 lease + 幂等键 + 重启追踪；同一 Trigger 同时只能被一个主写者认领。外部投递采用目标级去重键；失败显示真实最终状态，不伪造 exactly-once 外部动作。

## 4. OAuth、会话和授权合同

1. **浏览器**：未来注册经过审核的 Mira Cloud Web OAuth Client，采用 Authorization Code + PKCE（BFF 可作为 confidential client，细节由 Cloud Auth owner 决定），服务器端换取令牌；浏览器仅用 `Secure`/`HttpOnly`/`SameSite` session cookie 并强制 CSRF/Origin 检查。不要将 raw token 放 JS、URL、localStorage。
2. **Mobile WebView**：加载同一 HTTPS Web 工作台；原生 Cloud Session 与 Web Session 不是同一个凭证。任何一次性交接必须短时、一次性、限受众、校验来源；不得在 WebView URL、JSBridge 中直接转运长效 native token。
3. **Desktop**：复用已有 native OAuth 路径和 Device Session 管理；Cloud API 请求由 Desktop Backend/安全 IPC 端处理，不把长期密钥交给 Renderer。Cloud Client 与 Capability Host 两个角色分开。
4. **后台任务**：计划执行不能依赖浏览器会话常驻。Auth 负责服务身份和可撤销委托，Mira Core 按 Task/Run/Account/Scope 缩权，真正 Tool 侧还要在调用前执行 Policy/Approval。
5. **GitHub**：安装 Skill != 授予 Tool 权；读取 Issue != 修改 Issue；CI 成功 != 用户验收。Mira Cloud 只保存外部 Issue/PR/Commit 的引用和自己的运行审计。

上述 Web OAuth、后台委托和 GitHub App 均属**未来合同/实施前提**，现有 native OAuth 不构成这三类能力已完成的证据。

## 5. 建议的未来代码布局（仅文件规划）

```text
mira-cloud/
  apps/
    web/                  # React/Vite standalone Web + WebView adaptive UI
    api/                  # Fastify BFF + Core endpoints; explicit auth adapters
  packages/
    contracts/            # Zod 4 schemas / typed DTO / events
    design-tokens/        # generated from pinned mira-mobile source; not source authority
  docs/
    architecture/
    decisions/
    product/
    engineering/
  prototypes/             # archived interaction reference, NOT app code
```

**不会在本次立项创建上述应用目录或 package.json。** Cloud Pi 继续独立仓库，除非后续真实集成证据证明合并模块对恢复性/成本/权限有价值；绝不在 Mira Cloud 重新安装第二套 Pi SDK 循环作为默认实现。

## 6. 选型升级与实施门槛

- **版本策略**：设计文档记录家族/兼容主版本，实施 PR 在 `package.json` 和 lockfile 固定准确版本；至少完成依赖安装、构建、合同测试再升级。以当前源码为事实：Cloud Auth Node >=24、pnpm 10、React 19 / Vite 8 / Fastify 5 / Zod 4；Cloud Pi Node >=22.19、Pi SDK 1.4.0；Mobile React Native 0.86 + WebView。本文不声称未来版本自动兼容。
- **性能**：初始目标候选为单个活跃云 Agent Run，限并发、超时、模型 Token/成本预算；资源上限/崩溃恢复必须在选定真实硬件上测试，未验证前不得承诺 2C4G 一定足够。
- **安全**：默认账号级 ACL、最小授权、强制幂等、日志脱敏、Artifact 访问审计；源外网络内容视为不可信数据。未经授权不允许新 Host 反向能力、任意 stdio 执行或生产工具回写。
- **测试**：未来 TypeScript Core 用 Vitest T1/T2/T3；现有 Cloud Pi 继续自身 Node test，跨仓合同用真实协议 fixtures；Web 用 Testing Library/必要的真实 WebView 执行者验证。T4/T5 必须绑定真实环境/版本，不能以 CI 或 Playwright 静态 Mock 冒充。
- **环境**：本仓库 `feat/* → dev → test → prod`，但 `dev`、`test` **没有服务器**，GitHub Environments 未配置；`prod` 是版本化设计源，不代表存在生产服务。禁止造假部署地址、借用 Cloud Auth prod 当 test、创建 deploy workflows/secrets。
- **启动条件**：另行由维护者批准具体产品切片、Owner、跨仓 OAuth 授权合同、存储迁移方案、风险验收范围、具体实例/域名与基础部署方式。技术立项不自动授权任何应用代码。

## 7. 没选的方案和重新评估触发器

| 暂不采用 | 重新评估所需的证据 |
| --- | --- |
| PostgreSQL/Redis/任务队列 | 单主 SQLite 并发/事务/备份指标无法满足具体任务，且有跨主并发需求 |
| Kubernetes/多常驻微服务 | 多节点、独立弹性/故障域需求及运维预算被真实验证 |
| 向量数据库 | FTS5 无法满足经定义的记忆检索质量指标 |
| WebSocket / 事件总线 | 双向实时协议需求、SSE 恢复失败的客观证据 |
| Next.js / SSR | 有明确 SEO/服务端渲染产品收益且 Vite 静态 + BFF 无法满足 |
| 自建 Tool / MCP 网关 | Pi SDK 原生 Extension 出现可复现的权限/协议缺口 |
| Cloud → Desktop 主动远控 | 产品授权范围明确升级，Host-side Policy/Approval 全链路可验收 |

## 8. 事实核对（2026-11-11）

- [Cloud Auth root package](https://github.com/uichat-mira/cloud-auth/blob/dev/package.json)：`node >=24`, `pnpm@10.34.7`
- [Cloud Auth API](https://github.com/uichat-mira/cloud-auth/blob/dev/apps/api/package.json)：Fastify 5 / TypeScript；[Web](https://github.com/uichat-mira/cloud-auth/blob/dev/apps/web/package.json)：React 19, React Router 7, Vite 8, Tailwind 4, Zod 4
- [Cloud Auth native OAuth V0](https://github.com/uichat-mira/cloud-auth/blob/dev/docs/oauth-authorization-v0.md)：Desktop/Mobile registered clients only, device-bound Cloud Session; no general Web OAuth client issued.
- [Cloud Pi package](https://github.com/uichat-mira/cloud-pi/blob/dev/package.json)：Node >=22.19, Pi SDK 1.4.0, Croner；[composition](https://github.com/uichat-mira/cloud-pi/blob/dev/src/app.mjs)；[Scheduler store](https://github.com/uichat-mira/cloud-pi/blob/dev/src/scheduler/store.mjs)：file-backed single-owner.
- [Mira Mobile](https://github.com/uichat-mira/mira-mobile/blob/dev/package.json)：RN 0.86.2, WebView 13.x；[Mobile canonical tokens](https://github.com/uichat-mira/mira-mobile/blob/dev/src/theme/tokens.ts)。
- [Mira Desktop Phase III](https://github.com/uichat-mira/mira-desktop/issues/315)：native cloud login/Host grant, local-first; Cloud → Host unsolicited tool grants are not silently implied.
- [Organization Constitution](https://github.com/uichat-mira/.github/blob/main/AGENTS.md) 与 [Environment Model](https://github.com/uichat-mira/.github/blob/main/docs/engineering/environment-model.md)。

**技术裁决**：Mira Cloud 用已验证 Mira 生态的 Web/TypeScript/Fastify 组合承载独立云工作产品；Cloud Pi 保持唯一 Agent 执行事实；SQLite 单主 + Artifact 文件存储起步；Cloud Auth 保持授权中心；WebView/Desktop 是不同身份和运行时边界。复杂设施按证据引入，而不是在设计期堆出来。
