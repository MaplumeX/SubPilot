# 缺陷排查结果

## 已确认缺陷

### P0 — 未设置环境变量时使用公开的 JWT 签名密钥

- **位置**：`backend/app/config.py:6`，`docker-compose.yml:14`
- **证据**：`SECRET_KEY` 的默认值是 `dev-secret-change-in-production`；Compose 同样以该公开字符串作为回退值。最小运行验证打印出的有效配置也是该值。
- **影响**：任何以未设置 `SECRET_KEY` 部署的实例都可被伪造 access/refresh JWT，攻击者可冒充任意已知用户 ID。
- **复现条件**：不创建 `.env` 或未导出 `SECRET_KEY` 后启动 Compose，再以公开密钥签发包含 `sub` 和 `type=access` 的 HS256 JWT。

### P1 — SVG 上传可形成同源存储型 XSS

- **位置**：`backend/app/routers/subscriptions.py:30, 366-392`，`backend/app/main.py:86`
- **证据**：上传接口依据客户端声明的 `content_type` 接受 `image/svg+xml`，将原始字节写入同源 `/static/logos/`，未清理 SVG 中的脚本/事件处理器；静态文件以原格式公开。
- **影响**：恶意用户可上传带脚本的 SVG 并诱导已登录用户直接打开其 `/static/logos/<uuid>.svg` URL；脚本与 SPA 同源，可读取 `localStorage` 中的 access/refresh token。
- **复现条件**：上传含 `<script>` 的 SVG，再在浏览器直接访问接口返回的 `logo_url`。

### P1 — 订阅货币未受支持列表约束，金额会按 1:1 错算

- **位置**：`backend/app/schemas/subscription.py:13,41`，`backend/app/services/exchange_rate.py:68-82`
- **证据**：最小验证构造 `SubscriptionCreate(currency="ZZZ", ...)` 成功。不存在汇率时 `get_rate` 记录 warning 后返回 `1.0`，统计、排序和预测均调用该函数。
- **影响**：通过 API 写入任意三字符货币后，系统会把原金额当作用户基础货币计入月度总额、排行和现金流，造成财务数据错误。
- **复现条件**：创建或更新订阅时发送 `currency: "ZZZ"`，再读取 `/subscriptions/stats` 或 `/subscriptions/forecast`。

### P2 — 更新时可将必填支付方式设为 null，导致未处理的数据库错误

- **位置**：`backend/app/schemas/subscription.py:45`，`backend/app/routers/subscriptions.py:107-109, 505-524`，`backend/app/models/subscription.py:56-58`
- **证据**：最小验证表明 `SubscriptionUpdate(payment_method_id=None)` 被 Pydantic 接受并保留在 `exclude_unset` 输出中。路由的所有权验证对 `None` 直接返回，随后把它赋给数据库 `nullable=False` 的列并提交，未捕获 `IntegrityError`。
- **影响**：任一订阅更新请求只要带 `payment_method_id: null` 就会返回 500，而不是可解释的 422；前端只能显示通用保存失败。
- **复现条件**：`PUT /api/v1/subscriptions/{id}`，请求体为 `{ "payment_method_id": null }`。

### P2 — 刷新令牌从未实际用于续期，访问令牌过期即强制重新登录

- **位置**：`frontend/src/api/auth.ts:26-33`，`frontend/src/api/client.ts:15-24`，`frontend/src/auth-context.tsx:65-74`
- **证据**：`refreshToken` 仅定义，仓库中没有调用点；401 响应拦截器立即同时清除 access 与 refresh token 并重定向登录。后端访问令牌有效期为 30 分钟（`backend/app/config.py:8`）。
- **影响**：用户在约 30 分钟无操作后进行任意 API 操作会丢失登录状态，已实现的 refresh-token 机制完全失效。

### P3 — 前端 lint 失败，阻断质量门

- **位置**：`frontend/src/components/ui/toaster.tsx:19`
- **证据**：`npm run lint` 失败：`react-refresh/only-export-components` 禁止在同一文件导出 `toast` 工具函数和 `Toaster` 组件；另有 8 个 Hook 依赖警告。
- **影响**：前端检查不能通过，CI 或本地质量门会失败。

## 修复结果

- `SECRET_KEY` 改为必填，拒绝已知开发默认值；Compose 不再回退到公开密钥。
- 本地与缓存 logo 均不再接受 SVG，前端选择器和提示同步为 JPEG/PNG/GIF。
- 支持货币集中在 `app.currencies.SUPPORTED_CURRENCIES`，创建/更新均在 schema 层拒绝未知值；显式 `payment_method_id: null` 返回 422。
- Axios 在受保护请求收到 401 时只刷新并重试一次；刷新失败或重试仍 401 才清除令牌并跳转登录。
- toast 事件存储从组件模块拆出，消除了 lint error。

## 已执行验证

- `frontend/`：`npm run build` 通过；`npm run lint` 失败（1 error、8 warnings）。
- `backend/`：`python3 -m compileall -q app` 通过。
- 未发现项目自有自动化测试；未执行会写入产品数据的运行态 API 测试。

## 未覆盖/限制

- 未连接实际 SMTP、Telegram、汇率与搜索供应商，因此未将这些外部依赖行为报告为缺陷。
- SSRF 辅助函数的重定向/DNS TOCTOU 限制已被项目规范明确记录为已接受的限制，未重复列为新缺陷。
