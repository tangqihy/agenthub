# AgentHub V1 MVP 待办清单

> **核心**：Session / Cron / Analytics / Gateway  
> **数据源**：直读 `~/.hermes/state.db` + JSON → Repository → AgentHub DB  
> **页面**：Dashboard（固定布局）→ Sessions → Detail(Timeline) → Cron → Analytics  
> **策略**：本地 fixtures → 火山云真实数据 → V2 微信/家庭

---

## 当前阶段：Phase A — 本地 MVP

---

### A0. Hermes Schema 侦察（可与 A1 并行）

- [ ] SSH 火山云 VPS，`sqlite3 ~/.hermes/state.db ".schema"`
- [ ] 产出 `docs/hermes-schema.md`（Hermes 原始表结构）
- [ ] 产出 `docs/schema-mapping.md`（Hermes → AgentHub 字段映射，如 `Hermes.sessions → Session`、`Hermes.messages → Event`）
- [ ] 产出 `docs/hermes-cron-map.md`
- [ ] 复制脱敏 fixtures → `backend/fixtures/hermes/`

---

### A1. Monorepo 脚手架

- [ ] 创建 `backend/` + `requirements.txt`（fastapi, uvicorn, aiosqlite, pydantic, httpx, asyncpg, pytest, pytest-asyncio）
- [ ] `docker-compose.yml`（backend :8000）
- [ ] `.env.example`（`STORAGE_BACKEND=sqlite`, `HERMES_DATA_DIR=./fixtures/hermes`, `DATABASE_PATH=./data/agenthub.db`）
- [ ] `.gitignore` 补充 `backend/data/`, `.env`, `__pycache__/`

---

### A2. StorageBackend + Repositories + Contract Tests

**表结构**
- [ ] `sessions` — `is_active`（**不用 status**）；`ended_at IS NULL → is_active=true`；含 `source`, `model`, `tool_calls`
- [ ] `events` — `timestamp`, `event_type`, `source`, `payload` JSON, **`raw_json` TEXT**（原始 Hermes 记录）
- [ ] `cron_jobs`, `gateways`（含 **`latency_ms`**, **`error_count`**）
- [ ] `usage_daily` — 含 **`cost` REAL**（默认 0，预留 Claude/OpenAI 等）
- [ ] **`sync_state`** — `key`, `value`, `updated_at`（checkpoint）

**Checkpoint keys**
- [ ] `last_session_sync_ts`
- [ ] `last_message_sync_ts`
- [ ] `last_usage_aggregate_date`

**实现**
- [ ] `StorageBackend` Protocol + `SQLiteBackend`
- [ ] `PostgresBackend` 占位（Phase B）
- [ ] Repositories：Session / Message(Event) / Cron / Usage / SyncState

**Contract Tests（A2 同步写，不可延后）**
- [ ] `tests/test_session_repository.py`
- [ ] `tests/test_event_repository.py`
- [ ] `tests/test_cron_repository.py`
- [ ] `tests/test_usage_repository.py`
- [ ] SQLiteBackend 跑通；PostgresBackend 接入后跑同一套

---

### A3. Hermes Reader + Sync Worker

- [ ] `readers/state_db.py` — 只读 sqlite3
- [ ] `readers/gateway_json.py`, `readers/cron_json.py`
- [ ] `readers/mapper.py` — 映射遵循 `docs/schema-mapping.md`；Event 写入 **payload + raw_json**
- [ ] Session 映射：`is_active = (ended_at is None)`，**不生成 running/waiting/failed**
- [ ] `sync_worker.py` — checkpoint 驱动增量 sync，非全表扫描
- [ ] `aggregators/usage_daily.py` — 日聚合含 cost 字段
- [ ] `POST /api/v1/sync` 手动触发

---

### A4. REST API

**读接口**
- [ ] `GET /api/v1/health`
- [ ] `GET /api/v1/dashboard` — 固定布局所需全量数据（见下方 Dashboard 区块）
- [ ] `GET /api/v1/sessions` — `?active=true|false` `?source=` 分页（**不用 ?status=**）
- [ ] `GET /api/v1/sessions/{id}`
- [ ] `GET /api/v1/sessions/{id}/events` — `?since=`
- [ ] `GET /api/v1/gateways` — 含 latency_ms, error_count
- [ ] `GET /api/v1/analytics/summary|daily|by-source|by-tool|by-model`
- [ ] `GET /api/v1/analytics/top-sessions` — Top N `[{session_id, title, tokens}]`

**Cron 控制（Command Queue，不直接 subprocess）**
- [ ] `cron/queue.py` — `asyncio.Queue` + worker 串行消费
- [ ] `cron/controller.py` — worker 内 subprocess `hermes cron *`
- [ ] `GET /api/v1/cron`
- [ ] `POST /api/v1/cron/{id}/pause|resume|run` + `DELETE .../remove`
- [ ] 控制成功 → 立即 trigger sync

- [ ] CORS localhost；curl 全端点验证

---

### A5. 小程序 UI（5 页）

- [ ] TabBar：`dashboard` / `sessions` / `cron` / `analytics`
- [ ] `types.ts` — Session 用 `is_active`；前端映射 **Active / Archived**
- [ ] **Dashboard 固定布局**（不可配置）：
  - [ ] 今日 / 本周 / 本月 Token
  - [ ] Source 占比
  - [ ] 最近活跃 Session（5 条）
  - [ ] 最耗 Token Top 10
  - [ ] Gateway 状态（🟢/🔴 + 延迟 + 错误数）
  - [ ] Cron 状态概览
- [ ] **Sessions 列表** — Active/Archived Tag、`?active=` 筛选
- [ ] **Session Detail** — `EventTimeline`（读 payload；raw 留后端备用）
- [ ] **Cron 页** — 队列控制 + OfflineBanner
- [ ] **Analytics 页** — usage_daily 图表 + cost 预留展示位
- [ ] `pnpm dev:h5` 验证

**Phase A 完成标准**
- [ ] Contract Tests 全绿
- [ ] fixtures sync 后 Dashboard 六区块有数据
- [ ] Timeline 渲染；top-sessions 有排行
- [ ] Cron 经 Queue 可控（mock 或 CLI）

---

## Phase B — 火山云（Phase A 完成后）

- [ ] 同机部署，`HERMES_DATA_DIR=~/.hermes`
- [ ] state.db 只读 / copy-on-sync
- [ ] PostgresBackend + Contract Tests 复跑
- [ ] 270 Session / 12M Token 可视化
- [ ] Nginx HTTPS + Bearer Token

---

## V2 / V3 / V4 — 延后

- V2：CloudBase + 微信登录 + Owner/Member + 家庭共享
- V3：MCP / Skills / Secrets
- V4：Claude / Codex / OpenCode Adapter（参照 schema-mapping.md 扩展）

---

## 实施前信息收集

- [ ] 火山云 SSH + 公网 IP
- [ ] state.db schema + JSON 样例（A0）
- [ ] HTTPS 域名（Phase B / V2）

---

## 设计约束速查

| 项 | 规则 |
|----|------|
| Session 状态 | `is_active` only；UI 映射 Active/Archived |
| Event | `payload` + `raw_json` 双存 |
| usage_daily | 含 `cost`；禁止 API 实时统计 |
| Sync | `sync_state` checkpoint 增量 |
| Cron 控制 | API → Queue → Controller，禁止请求内 subprocess |
| Dashboard | 固定六区块，不可配置 |
| 测试 | Repository Contract Tests 从 A2 开始 |
