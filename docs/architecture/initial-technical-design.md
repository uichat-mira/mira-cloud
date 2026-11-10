# Mira Cloud — 初始技术设计 v0.1

**设计状态：Design baseline / no implementation.** 日期 2026-11-11。
权威参照：[产品架构 v0.4](v0.4.md)、[ADR-003](../decisions/ADR-003-hono-drizzle-postgres-deployment.md)、[AGT-040](https://github.com/uichat-mira/mira-cloud/issues/4)。

## 1. 目标、MVP 与边界

Mira Cloud 的首个真实工作闭环：用户通过 Cloud Auth 登录独立 Web 工作台，查看真实 Cloud Pi Task/Run 状态，按明确授权发起工作，持续观察、确认结果，保存并重用有来源的 Artifact。Web、Mobile WebView、Desktop 共享云端资源，但各自本地运行权限不合并。

首期约两名用户，默认一个活跃 Agent Run；性能、可靠性和成本阈值必须以实际运行证据决定。

| 事实 Owner | 负责 | 不能越界 |
| --- | --- | --- |
| Cloud Auth | Account、Device、OAuth、Cloud Session、Service credentials | 不变成 Cloud Core 的 Task/Memory 数据库 |
| Cloud Pi | Pi SDK 真实运行、Scheduler、Delivery、原文件型 Run/调度记录 | 不由 Core 重新实现第二 Agent Loop |
| Mira Cloud Core（未来） | Task/Run 索引、ACL、Artifact 元数据、Memory、Handoff、费用/审计 | 不双写 Cloud Pi 同一语义状态 |
| Desktop/Mobile | 本地身份、Local Provider、Host/Tool Policy | 不因云登录默认授予本地文件/工具访问权 |
| GitHub | Issue/PR/Project/CI/Skills 源码版本 | Cloud 不能产生第二套权威 Project 状态 |

## 2. 进程与候选模块

~~~text
Browser / Mobile WebView -- HTTPS --> Caddy
    |-- Vite static React Web
    +-- /api /oauth /events --> Hono BFF + Core [Node 24]
                                  |-- Cloud Auth auth adapter
                                  |-- PostgreSQL + Drizzle [new Cloud metadata]
                                  |-- Artifact file volume
                                  |-- GitHub App / service adapters
                                  +-- controlled Cloud Pi adapter --> Cloud Pi [existing Pi SDK]

Desktop native Cloud Client --> protected API / existing local Backend
~~~

初期 BFF/Core 为一个 Node 进程的模块化单体；Cloud Pi 在另一个进程继续运行。其 loopback 管理 API **不得直接对公网开放**。Cloud Auth 是独立服务，其现有 OAuth V0 只面向 native clients，Web OAuth 必须先形成新的真实授权合同。

建议未来内部模块：identity-adapter、tasks、run-observer、schedule-adapter、artifacts、memory、handoffs、github、capabilities、audit。HTTP Handler 做认证/参数校验/调度调用，service 承担领域语义，repository 负责 Drizzle 查询；不能把长时 Pi Run 放在 HTTP Request 生命周期内等待。

## 3. API 和安全合同

- 采用 Hono、Node Adapter、TypeScript strict、Zod 输入验证；建议稳定 API 前缀 /api/v1，确切路由在实现卡冻结。Hono RPC 仅是客户端类型便利，不代替外部运行时校验和版本合同。
- 新 Web BFF 通过 Cloud Auth 未来正式注册的 OAuth Web client 获取受众正确的 service credential；浏览器只保留 HttpOnly、Secure、SameSite Cookie，写操作校验 CSRF/Origin。
- Mobile WebView 与 native session 分离，不在 URL/JSBridge/localStorage 传递长效 token。Desktop 原生云登录在本地 Backend/安全 IPC 内处理，Renderer 不直接拿高权 Bearer。
- 请求体里的 accountId、runtimeInstanceId、GitHub Installation ID、模型 Tool 输出均非可信主体声明；每个资源都按 authenticated account/owner/scope/permission 校验。
- 写操作提供 Idempotency-Key、稳定错误码、requestId、受限重试和审计。返回“请求已提交”不能代表 Run 已完成；取消请求也不等于取消成功。
- SSE 事件要求单调事件序号、Last-Event-ID 或等效游标补拉、断线重连、服务重启一致性，不借此创建另一份 Run 权威。

## 4. PostgreSQL 目标数据模型（候选，当前不存在）

| 表簇 | 关键字段/约束 |
| --- | --- |
| tasks | task_id、owner_account_id、task_spec_version、state、idempotency_key；owner/idempotency 唯一 |
| triggers | task_id、manual/cron/event、timezone、schedule expression、next_fire_at、revision |
| runs | task_id、runtime kind/ref、actual owner run ref、attempt、state、lease owner/deadline、last_event_seq、error/cost refs |
| run_events | run_id、seq、type、occurred_at、redacted payload；run_id+seq 唯一 |
| artifacts | run id、owner、version、storage key、SHA256、bytes、MIME、retention deadline、source ref |
| memory_entries | owner、scope、review state、source ref、revision、retention/deletion metadata |
| handoffs/work_links | source runtime/run/artifact、target runtime、requested capability、TTL、accept/deny/revoke state |
| audit_entries | actor/requestId/action/resource/decision/timestamp，无明文 token |

Cloud Auth 的 account ID 只作外部身份引用；数据隔离必须在查询及 service 边界执行，不能把全部授权押在前端过滤上。Storage key 不接受用户任意路径，下载经授权、大小/类型/路径规范化。Artifact 原始文件留在受控卷，数据库仅保存元信息。

### 事务、幂等和长任务

如果以后多 Worker 并行，需要 PostgreSQL 的受限批量行级锁和 SKIP LOCKED 认领，**在事务里更新租约/attempt 后尽快提交**。HTTP/Agent 模型执行期间不能持有 SQL 事务或占住连接。心跳、租约过期、重复请求、服务中断与外部写入副作用分别设计恢复策略：外部操作通过 outbox/目标级幂等键，unknown outcome 不自动冒充成功或安全重试。

Cloud Pi 当前的文件型 Scheduler/Run/Delivery 是单进程写入事实。新 Core 对其只能按受控 Owner API 观察或授权调用；迁移需冻结旧写入、校验映射、回滚锚点，绝不能长期同步双主状态。

## 5. 工程目录设计（未来，不创建源码）

~~~text
apps/
  web/                    # React/Vite responsive workspace
  api/src/
    app.ts                # Hono composition/middleware
    modules/              # task/run/artifact/memory/handoff
    adapters/             # Cloud Auth / Cloud Pi / GitHub
    db/                   # Drizzle schema/repository/migrations
packages/
  contracts/              # versioned runtime-validated DTOs
  design-tokens/          # generated from pinned Mira Mobile source
~~~

依赖版本由未来 implementation PR 精确锁定并验证；不是本次文档写了便自动下载/安装。

## 6. 实时、Skills、MCP、记忆和成本

- Cloud-owned Run 的 status 是 owner 给出的事实；SSE 只投影变更，不制造终态。断连不等于取消；last seen 与 actual completed 分开。
- Skill pin Git SHA/digest；安装、启用、Tool 使用是独立的授权动作，远端/stdio MCP 的执行边界仍由 Cloud Pi 真实 Policy 管理。
- GitHub App 按 installation/repository 择权，先只读；Issue/PR/Project 更新由 GitHub 自身合同控制，不能用绿 CI 自动结案。
- 记忆先做候选、人工批准/撤回和 PostgreSQL 全文检索；是否加入 pgvector 以检索质量评测证明。私有 Desktop 记忆不会因同一 Cloud Account 登录而上传。
- 每个 Agent Run 限额/并发/超时，日志仅保存必要 trace、错误类别、可追溯成本；禁止打印密钥或大量隐私上下文。

## 7. 部署草案与资源约束

未来生产候选：一台 2 vCPU/4 GiB VPS；Docker Compose 承载 Hono API 与 PostgreSQL 单主实例，静态 React Web 经 Caddy 提供，**优先复用已安装的宿主机 Caddy**。Cloud Pi 先保持现状，容器化需要另一份迁移与运行合同。

PostgreSQL 初始容量预算约 500 MiB（非监控结果）；连接池候选 3–5、数据库总连接预算约 20。监测 RSS、CPU、查询延迟、WAL、磁盘和重启恢复后再定实值。数据库 5432 不向公网发布，Docker 私有网络、持久化卷、独立备份目的地、恢复演练、镜像版本回滚都是上线前置条件。Caddy SSE stream 转发须在真实目标环境测量。

**dev 与 test 都没有服务器**。目前不能添加虚假 domain、GitHub Deployment Environments、部署 Secrets 或假装做过 T4。生产只有 prod 分支有资格触发真实 deploy；当前 prod 仅为设计源基线，尚无服务、目标地址或 T5。

## 8. 验收矩阵

| 阶段 | 必要证据 |
| --- | --- |
| 本次设计 | Docs Contract、Mira Gate、PR diff、当前 Owner 源码边界核对 |
| T1 | Zod/状态机/ACL/预算/幂等的纯逻辑单测 |
| T2 | 正确受众/撤权、HTTP DTO、Cloud Pi Owner 映射、错误路径 |
| T3 | 真实 Hono Node + 临时 PostgreSQL + Drizzle migrations + 并发认领与服务重启验证 |
| T4 | 仅在后续有真实授权部署的非生产环境/版本时进行；当前不存在 |
| T5 | 仅在未来 prod 部署后，对准确版本执行健康与核心链路 smoke；当前不存在 |

## 9. 待产品/权限决策

独立 Web OAuth 客户端/域名；两人资源共享策略；实际部署主机与备份目标；初始 Task 类型；Cloud Pi 跨进程协议；迁移窗口；Artifact 保留期限、加密与 RPO/RTO。这些均不是默认授权施工的空白支票。
