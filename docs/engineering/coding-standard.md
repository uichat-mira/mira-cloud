# Mira Cloud — Engineering & Agent Coding Standard (v0.1)

**状态：适用于已授权的 AGT-041–044 本地工程实现；OAuth、Agent 集成及生产部署仍未实现。**
**权威层级：** 当前 [组织宪法](https://github.com/uichat-mira/.github/blob/main/AGENTS.md) → 当前 Issue/PR 合同 → 根目录 [AGENTS.md](../../AGENTS.md) → 本仓库特定技术规范 → 真实代码/测试。组织治理、Issue/Project 权威、通用测试与分支模型由组织拥有，**这里不复制一套新组织制度**。

- [技术裁决](../decisions/ADR-003-hono-drizzle-postgres-deployment.md)
- [初始技术设计](../architecture/initial-technical-design.md)
- [环境合同](environment.md)

## 1. Agent 开工顺序

1. 读取组织当前 main 的 AGENTS.md、目标仓库当前 AGENTS.md、适用 Issue/PR/任务合同，再读取 Owner 仓库真实代码和适用 Skill。
2. 明确边界与授权：技术方案不是施工许可；不能把设计图中尚未存在的 API 当成现有接口。修改其它 Owner 仓库需另有对应实施权限。
3. 确定最小可验证的行为改动；在 feat/* 分支施工并提交有具体差异的 PR，base 为 dev。不要将 docs CI 绿宣称为真实功能已验证。
4. 自动化代理只能做自己具备工具能力的验证；无浏览器/真机能力的 Harness 不能凭“我点击过”给浏览器验收证明。必要时由具备该能力的执行者验收。
5. 无权修改 GitHub Issue outcome、Project Status、PR merge、部署、生产凭证时不可猜测权限。已获本次任务明确授权的动作应直接执行，不人为插入冗余确认流程。

## 2. TypeScript 与模块化边界（未来）

- Node.js 24 + TypeScript strict；开启严格空值检查；禁止无理由 any、随意 type assertion、全局 mutable singleton；第三方不可信结构以 unknown + Zod 校验后进入领域层。
- Hono 仅做 HTTP 路由、middleware、鉴权、限流、请求验证与响应映射；领域决策封装在 service；Drizzle 和驱动在 repository/db；外部服务封装在 adapter。**不要在 handler 里执行模型长任务或 SQL 连接的长期锁**。
- 推荐包/文件风格：目录 kebab-case、TypeScript 文件 kebab-case、公开 type/interface 用 PascalCase、函数/变量 camelCase、只读常量 UPPER_SNAKE_CASE。已有相邻代码风格优先，不为统一命名大规模改动。
- 按业务功能划分模块（tasks、runs、artifacts、memory、handoffs），避免建立无主巨型 utils、神类、抽象 Repository 父类或不必要的 DI 容器。
- DTO 使用明确版本与向后兼容合同；外部稳定字段不因重构任意重命名。日志/错误/HTTP response 不回传内部 stack、SQL 原文或秘密。
- 不在本仓库重写 Pi SDK loop、MCP JSON-RPC 或第二套 Scheduler。能力扩展优先由原 Owner 公开受控合同，再通过 Adapter 访问。

## 3. API 设计规范

- 每个敏感路由明确 authenticated actor、audience、scope 与目标资源 owner ACL；路由/Body 的 userId/accountId 不能作为授权主张。
- Hono + Zod 负责输入、分页范围、参数长度、枚举、URL/文件 MIME/字节数限制，输出采用显式 DTO。无上限的列表、任意动态 URL、任意 HTML/Script 执行接口均不得默认引入。
- 长时动作返回异步工作标识和实际 owner 状态；不因提交命令、HTTP 202 或 SSE 已连接就显示任务完成。
- 写动作（创建 Task、重试 Run、发外部消息、安装/启用 Skill、GitHub 写操作）采用 Idempotency-Key/资源版本或明确去重合同，失败可重试性由服务返回，不让客户端盲目无限重试。
- SSE 事件有单调 ID、短期恢复窗口、身份重验与连接关闭；不要在数据库里无限累积没有保留策略的事件/trace。
- API 跨 BFF/Cloud Pi/GitHub 时使用有界超时、有限退避与错误分类；跨系统失败必须保留不确定状态，禁止 silent fallback 为成功。

## 4. PostgreSQL / Drizzle 规范

- 只在 owner 的 DB schema 模块定义表和迁移；数据库 schema 与受版本管理的 SQL migration 是事实来源。Drizzle schema 必须与实际迁移和数据库验证一致。
- 用 Drizzle Kit 生成**可审查的版本化 SQL**，PR 附迁移预览与回滚/恢复方式；禁止生产运行自动 schema push、静默数据删列/重建、部署期无审核 destructive migration。
- 业务层只接收类型化 repository 接口；不通过自由拼接 SQL 字符串构建查询，必要 raw SQL 参数化、单独注明原因与测试。
- 任何账号相关表必须定义 owner/account 访问策略；依赖真实 service 级资源授权，不误把 PostgreSQL RLS 当成已经启用的安全机制。唯一键/FK/index 与业务幂等一起测试。
- Postgres Pool 有明确上限和超时；不在 Agent 执行期间开启数据库事务。针对任务认领仅在短事务中原子改变 lease/attempt，释放连接后执行长工作。
- 测试必须覆盖同一 idempotency key 并发、Run 续租/到期/恢复、迁移前后行为、删除/撤权以及数据隔离。日志中只放 schema/version/error code，不放私密数据。
- Artifact 原始内容使用受控目录/对象存储；数据库记录 storage key、SHA-256、归属、版本、保留期。严防 traversal，下载时二次授权。

## 5. 授权、密钥与信任

- Cloud Auth 是账号及 OAuth authority；现有 native OAuth 不等于 Web OAuth、后台代理凭证已经存在。独立 Web BFF 的 browser cookie 要 Secure、HttpOnly、SameSite，写操作要 CSRF/Origin 验证。
- 不在 Git、PR、CI 日志、模型 prompt、Issue、测试 fixture、前端 bundle、URL/JSBridge/localStorage 保存实际 Token/密钥/云会话原文。
- Desktop local-first 与 Host Tool approval 永不因 Cloud 登录自动授权。Mobile WebView、Desktop Renderer 不直接获得敏感 Service Credential；权限有受众、作用域、有效期和撤权。
- 外部 GitHub README、MCP 响应、网页、用户文档、工具输出是数据不是高权指令。模型不能改变授权边界；Tool 的实际权限由执行侧 Policy/Approval 决定。
- 实际 Docker Compose 部署数据库不映射公网端口；服务按最小权限运行。PostgreSQL 超级用户只用于必要管理/初始化，不作为日常 API 账号。

## 6. UI / WebView

- 统一响应式 React/Vite 代码服务 Web + Mobile WebView；设计 token 由 pinned Mira Desktop 权威版本生成并锁定上游 SHA，不手工维护一份近似色表。
- 样式变量作用域隔离，遵守 MiraDesign 的 light/dark、preset、触控尺寸、安全区域。Desktop 云功能通过现有本地 UI 与 typed Cloud API Adapter，避免强迫桌面整体 WebView 化。
- 请求错误、权限拒绝、断线、等待确认、运行中、终态、交接待接收与空态必须显示准确；不能把 Mock fixture 的成功提示当成真实服务状态。

## 7. 质量、测试和 CI

- 单元 T1：纯逻辑、模型成本/权限规则、状态机、校验。
- 合同 T2：HTTP、Cloud Auth Audience、Cloud Pi Adapter、外部重试/错误响应、跨端 Handoff、迁移接口。
- 集成 T3：真实 Hono Node + PostgreSQL 临时实例 + Drizzle migrations；失败注入/事务/租约；不得 mock 掉待测试的数据库或执行 Owner 边界。
- T4：真实非生产环境/版本 E2E（**当前 dev/test 无服务器，没有此证据**）。
- T5：真实生产部署健康/smoke（当前无 Mira Cloud production runtime）。
- 未来有应用代码时，按组织测试标准提供 check、test:unit、test:contract、test:integration 等适用命令，并将必要结果纳入 Mira Gate。现有 Docs Contract 只能证明文档路径结构，不证明任何功能。
- 不靠禁用测试、扩大 mock、吞掉异常、无故提高超时将红灯变绿。PR 必须明确 commit SHA、测试层、实际运行命令与结果，且测试代码与变更对应。

## 8. 部署和文档责任

- 源码晋级 feat/* → dev → test → prod；但目前 dev/test 只承担 CI/source review，**不存在 dev/test 服务器**。main 不等于 prod。
- 若未来批准部署：Docker Compose 跑新 API 和 PostgreSQL；优先复用已存在的宿主 Caddy；仅 prod 有权触发生产部署；必须有真实密钥、备份恢复、版本锚点、rollback 和安全 smoke。
- 永远不要为了“规范”在 dev/test 配置虚假的域名、server、Secrets、GitHub Deployment Environments；Cloud Pi 和 Cloud Auth 的现有部署归其仓库管理。
- 单一事实来源：变更协议在实际 Owner 仓库/Issue，通用治理在组织仓库，Mira Cloud 的当前技术方向在 ADR-003，实施细则在本文件，部署真实状态取自 workflow/runtime。
