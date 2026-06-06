# AgentHub

Personal & Family AI Control Center — **Portainer for Hermes**

V1 MVP：Session / Cron / Analytics / Gateway 可视化与控制。

## 架构

```
Hermes state.db + JSON  →  Sync Worker  →  AgentHub SQLite/Postgres
                                              ↓
Taro H5 / 小程序  ←  FastAPI REST
```

- **读**：Session、Event Timeline、Analytics、Gateway、Dashboard
- **写**：仅 Cron（经 Command Queue → `hermes cron` CLI）
- **Session 状态**：`is_active`（非 running/failed）；UI 显示 Active / Archived

## 快速开始（本地 Phase A）

### 1. Backend

```bash
cd backend
pip install -r requirements.txt
python fixtures/hermes/create_fixtures.py   # 首次
uvicorn app.main:app --reload --host 127.0.0.1 --port 8000
```

验证：`http://127.0.0.1:8000/api/v1/dashboard`

### 2. 前端 H5

```bash
pnpm install
pnpm dev:h5
```

浏览器打开 Taro 提示的地址（API 经 devServer 代理到 `:8000`）。

### 3. 测试

```bash
cd backend
pytest
```

## 环境变量

见 `backend/.env.example`：

| 变量 | 说明 |
|------|------|
| `STORAGE_BACKEND` | `sqlite` / `postgres` |
| `DATABASE_PATH` | SQLite 路径 |
| `HERMES_DATA_DIR` | Hermes 数据目录（含 state.db） |
| `CRON_MOCK` | `true` 本地 mock CLI |
| `SYNC_INTERVAL_SECONDS` | 同步间隔，默认 5 |

## 火山云部署（Phase B）

```bash
docker compose -f docker-compose.volcengine.yml up -d
```

- 挂载 `/root/.hermes` 只读
- Nginx 模板：`deploy/nginx.conf`
- 公网暴露前设置 `API_BEARER_TOKEN`

## 文档

- [docs/todo.md](docs/todo.md) — 待办清单
- [docs/hermes-schema.md](docs/hermes-schema.md) — Hermes DB schema
- [docs/schema-mapping.md](docs/schema-mapping.md) — Hermes → AgentHub 映射
- [docs/hermes-cron-map.md](docs/hermes-cron-map.md) — Cron CLI

## V2+ 路线图

- **V2**：CloudBase + 微信登录 + Owner/Member + 家庭共享
- **V3**：MCP / Skills / Secrets
- **V4**：Claude / Codex / OpenCode Adapter
