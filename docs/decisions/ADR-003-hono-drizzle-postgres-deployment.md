# ADR-003 — Mira Cloud 初始后端、存储及部署技术决策

- **状态：Accepted as design baseline（2026-11-11），尚未批准施工或发布。**
- **关联 Issue：** [AGT-040](https://github.com/uichat-mira/mira-cloud/issues/4)
- **替代：** [ADR-002](ADR-002-full-stack-technology.md) 中的 **Fastify 5 + SQLite WAL** 和“PostgreSQL 首期不采用”判断。
- **实施与边界细节：** [初始技术设计](../architecture/initial-technical-design.md)、[编码规范](../engineering/coding-standard.md)、[环境规范](../engineering/environment.md)。

## 1. 技术决策

Mira Cloud 是独立产品；**未来新 Core/BFF 采用 Hono + Drizzle + PostgreSQL**，以 Docker Compose 和 Caddy 作为生产部署候选。Cloud Auth 与 Cloud Pi 是不同责任边界，**不会随本 ADR 被迁移、重写或强制升级**。

| 区域 | 首选技术 | 定位 |
| --- | --- | --- |
| Web/手机 WebView | React 19、TypeScript strict、Vite、React Router、Tailwind 4 | 独立响应式工作台；设计 token 来自 Mira Mobile 的当前权威 |
| 新的 Core API / BFF | **Hono、@hono/node-server、Node 24、TypeScript strict** | 单个模块化单体进程；无第二个身份中心 |
| 输入/输出验证 | Zod；Hono 类型化路由；外部 API 合同明确版本 | 静态类型不能代替运行时验证 |
| SQL 模型与迁移 | **Drizzle ORM + Drizzle Kit**；SQL 文件进入代码审查 | 只负责 SQL/迁移，不是运行调度器 |
| Postgres 驱动 | **node-postgres（pg）+ 显式有界 Pool** 优先 | 设计起始连接池 3–5，总连接额度以部署实测确定 |
| 数据库 | **单实例 PostgreSQL**，事务/唯一约束/行级锁 | 两名初始用户；但调度与并发 Worker 也需要可靠事务 |
| Run 事件观察 | HTTP JSON + SSE，序号/断线补拉 | 不把 WebSocket/event bus 作为默认基础设施 |
| Agent 任务执行 | **现有 Cloud Pi Pi SDK + Scheduler + Delivery** | 执行事实归其 Owner；Core 不复制 Agent Loop 或 Cron |
| Artifact | 有界文件卷 + PostgreSQL 元数据及 SHA-256 | 将来可按实际需要切换对象存储，保持资源 ACL |
| Memory | PostgreSQL FTS 首行方案；语义索引需要未来检索评测 | 不第一天安装 pgvector/独立向量库 |
| 反向代理 | **复用服务器既有 Caddy** 优先 | TLS、同源站点、路由、SSE；不要求另启 Caddy 容器 |
| 生产部署 | **Docker Compose**（Hono Web/Core、Postgres）；Caddy 可在宿主机 | 仅在未来明确授权后由 prod 分支构建/部署 |
| CI | 文档期只有 Docs Contract / Mira Gate | 实施后再增加真实的 T1/T2/T3；不能将文档绿当功能绿 |

**暂不采用：** NestJS、Fastify（仅 Mira Cloud 新 Core；Cloud Auth 仍是 Fastify）、Redis、BullMQ、Kubernetes、微服务矩阵、第二套 Pi SDK Agent Loop、默认 pgvector。

## 2. 为什么改选 Hono / PostgreSQL

- **Hono** 以小范围标准 HTTP API、Node adapter 和类型化合同服务新业务；它**不**自动让 Pi SDK、文件持久化或 Node 原生依赖在 Cloudflare Workers 上运行。
- **Drizzle** 负责表结构、类型化查询和审核后的迁移脚本；与 Hono 没有强耦合。业务授权、Run 状态机、幂等、调度租约不能委托给 ORM。
- **PostgreSQL** 在两人小规模下可采用低连接池与节制内存。优势主要是为未来多进程认领任务提供可审计事务/行级锁，而不是“人数多”。单实例不等于自动 HA/准确一次性外部副作用。
- **Docker Compose + Caddy** 延续现有小型 VPS 的简单运维路径，但必须通过真实机器可达性、资源/存储和恢复验证才能设为生产事实。

## 3. 单一事实来源

- **Cloud Auth** 独立负责 Account、Device、OAuth、Cloud Session、Service Grant；自己的数据库不与 Core 合并。当前 OAuth V0 只有 Desktop/Mobile 原生客户端，未来 Web OAuth/BFF 需要另行授权变更。
- **Cloud Pi** 继续负责真实 Pi Runtime、Scheduler、Delivery、当前的文件型 Run/Trigger 状态。引入 Core 不等于 Cloud Pi 文件状态已迁移；禁止双主调度及无协议的数据库双写。
- **Mira Cloud Core PostgreSQL（未来）** 将拥有新的 Task/Cloud Run 索引、记忆、成果元数据、交接与账号资源 ACL。跨端 Desktop 本地 Run 的事实仍由 Desktop 决定。
- **GitHub** 拥有 Issue 契约、Project Status、PR、CI 与代码事实；Core 只引用和缓存有限投影，不复制 GitHub 管理权威。

## 4. 运维资源与数据库约束

初始部署目标是 **2 vCPU / 4 GiB** 自托管 VPS、两名主要用户，计划默认仅 1 个 Cloud Agent 活跃 Run。资源规划（非实测承诺）：

- PostgreSQL：运维容量预留 **约 500 MiB**，建议初始试验值 shared_buffers 128 MiB、max_connections 20、work_mem 4 MiB、maintenance_work_mem 64 MiB，Core pool 3–5；须考虑共享页缓存、其它数据库连接、慢查询和 worker 峰值。
- PostgreSQL 单主容器、**本地持久化数据卷**，仅加入 Compose 私有网络，不把 5432 映射到公网或宿主机。禁用凭据日志，密码来自非版本库密钥注入。
- 初始化前指定主数据库及备份归属；采用有恢复证明的逻辑备份/文件备份（和必要的 WAL 归档策略），**定期验证恢复**，预留 WAL/备份/Artifact 空间，不把备份存放在唯一的同一块盘上。
- 部署必须有 health checks、日志限量、镜像 digest/版本锚点、回滚流程；镜像构建与生产部署只能在获批的 prod 路径运行。
- PostgreSQL 主版本、确切参数、Docker 镜像 digest、部署主机、域名、证书、备份存储、模型额度，都需实施 PR 根据当前实测决定；设计不预设真实环境可达。

## 5. 与环境模型的关系

- **feat/*：CI only。**
- **dev：源码集成 / CI，尚无 dev 服务器。**
- **test：源码与合同验收 / CI，尚无 test 服务器。**
- **prod：未来唯一生产部署来源；当前没有 Mira Cloud 生产服务。**
- **main：保留引导历史，不是生产。**

本次只新增文档：不创建 Dockerfile/Compose/Caddyfile、数据库/Secret、GitHub Deployment Environments 或远程服务器配置。部署技术选型并不等于已经部署。

## 6. 待批准 / 待验证清单

1. Cloud Auth Web OAuth client 与 Core service audience/后台委托合同。
2. PostgreSQL 精确版本、迁移与备份恢复演练、2C4G 真实峰值、连接池与成本预算。
3. Cloud Pi 文件持久化到 Core PostgreSQL 的**唯一写入权威切换**及失败恢复；此前继续只读引用或使用已有受控接口。
4. Cloud Pi / Core 最小安全通信（不可把 Cloud Pi 现有 loopback 管理端口直接暴露公网）。
5. Caddy SSE 传输、幂等、租约接管、服务重启及生产回滚的证据。

## 7. 官方和仓库事实

- [Hono Node adapter](https://hono.dev/docs/getting-started/nodejs)
- [Drizzle PostgreSQL 接入和迁移](https://orm.drizzle.team/docs/get-started/postgresql)
- [Caddy reverse_proxy streaming](https://caddyserver.com/docs/caddyfile/directives/reverse_proxy)
- [现有 Cloud Pi（独立 Owner）](https://github.com/uichat-mira/cloud-pi/blob/dev/AGENTS.md)
- [Cloud Auth OAuth V0](https://github.com/uichat-mira/cloud-auth/blob/dev/docs/oauth-authorization-v0.md)
- [Mira Cloud 环境合同](../engineering/environment.md)

**决议边界：** 此 ADR 取代旧技术选型的目标部分，不重写历史决策、不修改已运行仓库，也不授权工程施工。
