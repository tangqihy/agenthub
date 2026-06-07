# AgentHub V2 实施计划 — Agent Registry

> **V2 目标**：管理 Agent、沉淀 Agent、复用 Agent、发布 Agent
> **V2 明确不做**：运行 Agent、聊天 Agent、执行 Agent

---

## 数据模型

### agents

| 字段 | 类型 | 说明 |
|------|------|------|
| id | TEXT PK | UUID |
| name | TEXT NOT NULL | Agent 名称 |
| description | TEXT | 描述 |
| avatar | TEXT | emoji 或 URL |
| runtime | TEXT | `hermes` / `claude-code` / `codex` / `opencode` / `custom` |
| publish_scope | TEXT | `private` / `family` / `public`，默认 `private` |
| current_version | INTEGER | 当前版本号，默认 1 |
| created_at | INTEGER | Unix timestamp seconds |
| updated_at | INTEGER | Unix timestamp seconds |

### agent_versions

| 字段 | 类型 | 说明 |
|------|------|------|
| id | TEXT PK | UUID |
| agent_id | TEXT NOT NULL | FK → agents.id |
| version | INTEGER NOT NULL | 版本号，从 1 递增 |
| config_json | TEXT NOT NULL | JSON 字符串 |
| created_at | INTEGER | Unix timestamp seconds |

**config_json 结构：**
```json
{
  "model": "claude-sonnet",
  "prompt": "你是一个家庭秘书...",
  "skills": ["build_android", "analyze_crash"],
  "mcp": ["github", "browser"],
  "runtime_config": {}
}
```

- `runtime_config`：扩展字段，不同 runtime 可放自己的配置

**约束：** UNIQUE(agent_id, version)

### agent_runs

| 字段 | 类型 | 说明 |
|------|------|------|
| id | TEXT PK | UUID |
| agent_id | TEXT NOT NULL | FK → agents.id |
| runtime | TEXT NOT NULL | 运行时标识 |
| runtime_session_id | TEXT | 关联 runtime 的 session ID |
| status | TEXT | `running` / `completed` / `failed` |
| started_at | INTEGER | Unix timestamp seconds |
| ended_at | INTEGER | NULL = 运行中；Unix timestamp seconds |

**与 Hermes sessions 的关联：**
- `runtime = 'hermes'` 且 `runtime_session_id = sessions.external_id`
- 通过 `agent_runs` 反查 Hermes session 数据

**边界：**
- Agent Registry 只管理 Agent 元数据、版本、运行记录和与 Hermes Session 的关联。
- V2 不直接运行 Agent、不聊天、不直接调用 LLM；这些能力必须放到后续 Runtime Adapter 层。
- 前端展示 Agent 时间字段时按秒级时间戳处理，统一使用 `new Date(ts * 1000)`。

---

## 后端 API

### Agent CRUD

| 方法 | 路径 | 说明 |
|------|------|------|
| GET | `/api/v2/agents` | 列表，`?runtime=` `?scope=` `?q=` 搜索 |
| POST | `/api/v2/agents` | 创建 Agent |
| GET | `/api/v2/agents/{id}` | 详情（含当前版本 config） |
| PATCH | `/api/v2/agents/{id}` | 更新基础信息（name/description/avatar/publish_scope） |
| DELETE | `/api/v2/agents/{id}` | 删除 Agent（级联删除 versions 和 runs） |

### Agent Version

| 方法 | 路径 | 说明 |
|------|------|------|
| GET | `/api/v2/agents/{id}/versions` | 版本列表 |
| POST | `/api/v2/agents/{id}/versions` | 创建新版本（递增 version，更新 current_version） |
| GET | `/api/v2/agents/{id}/versions/{v}` | 获取指定版本 config |
| POST | `/api/v2/agents/{id}/versions/{v}/rollback` | 回滚到指定版本（更新 current_version） |

### Agent Clone

| 方法 | 路径 | 说明 |
|------|------|------|
| POST | `/api/v2/agents/{id}/clone` | 克隆 Agent（复制当前版本 config，创建新 Agent） |

### Agent Run

| 方法 | 路径 | 说明 |
|------|------|------|
| GET | `/api/v2/agents/{id}/runs` | 运行记录，`?limit=` |
| POST | `/api/v2/agents/{id}/runs` | 记录一次运行（关联 runtime + session_id） |

### Agent ↔ Session 关联

| 方法 | 路径 | 说明 |
|------|------|------|
| GET | `/api/v2/agents/{id}/sessions` | 通过 agent_runs 反查关联的 Hermes sessions |

---

## 前端页面

### 1. Agent List `/pages/agents/index`

**布局：**
- 顶部搜索栏（按名称搜索）
- Runtime 过滤 Tab（All / Hermes / Claude Code / Codex）
- Agent 卡片列表
  - avatar + name + description
  - runtime 标签
  - publish_scope 标签（Private=灰 / Family=蓝 / Public=绿）
  - 最近使用时间
- 右下角 FAB 按钮：创建 Agent

### 2. Agent Detail `/pages/agents/detail`

**布局：**
- 头部：avatar + name + description + publish_scope 标签
- 操作栏：编辑 / 克隆 / 发布
- 当前版本卡片：version 号 + config 摘要（model、prompt 前 100 字、skills 数量、mcp 数量）
- 历史版本列表：版本号 + 创建时间 + 回滚按钮
- 最近 Run 列表：runtime + session 标题 + 状态 + 时间

### 3. Agent Editor `/pages/agents/editor`

**布局：**
- 基础信息表单：name / description / avatar / runtime 下拉
- 配置编辑器：
  - model 输入
  - prompt 文本域（支持多行）
  - skills 列表（添加/删除）
  - mcp 列表（添加/删除）
- 保存按钮（创建新版本）
- 入口：创建（空表单）/ 编辑（预填当前版本 config）

### 4. Publish 弹窗

**交互：**
- 从 Agent Detail 页触发
- 三个选项：Private / Family / Public
- 确认后调用 PATCH 更新 publish_scope

### 5. BottomNav 更新

- 新增 `agents` Tab（图标：🤖）
- Tab 顺序：Dashboard / Agents / Sessions / Cron / Analytics

---

## 实施步骤

### Step 1：后端数据层

- [ ] `backend/app/models/domain.py` — 新增 Agent、AgentVersion、AgentRun Pydantic 模型
- [ ] `backend/app/storage/sqlite.py` — 新增建表 SQL（agents、agent_versions、agent_runs）
- [ ] `backend/app/repositories/agent.py` — AgentRepository + AgentVersionRepository + AgentRunRepository

### Step 2：后端 API

- [ ] `backend/app/routers/agents.py` — V2 路由（CRUD + Version + Clone + Run + Session 反查）
- [ ] `backend/app/main.py` — 注册 agents router

### Step 3：Contract Tests

- [ ] `backend/tests/test_agent_repository.py` — Agent CRUD、Version 递增、Run 关联、Clone

### Step 4：前端数据层

- [ ] `src/services/types.ts` — 新增 Agent、AgentVersion、AgentRun 类型
- [ ] `src/services/api.ts` — 新增 V2 API 调用

### Step 5：前端页面

- [ ] `src/pages/agents/index.tsx` — Agent List + 搜索 + Runtime 过滤
- [ ] `src/pages/agents/detail.tsx` — Agent Detail + 版本历史 + Run 列表
- [ ] `src/pages/agents/editor.tsx` — Agent Editor 表单
- [ ] `src/components/AgentCard.tsx` — Agent 卡片组件
- [ ] `src/components/VersionList.tsx` — 版本列表组件
- [ ] `src/components/PublishSheet.tsx` — 发布选择弹窗

### Step 6：集成

- [ ] BottomNav 新增 agents Tab
- [ ] Dashboard 新增 "最近 Agent" 区块
- [ ] 构建 + 部署到 innee.cn

---

## V2 验收标准

- [ ] Agent CRUD（创建/查看/编辑/删除）
- [ ] Agent Clone（复制已有 Agent 创建新 Agent）
- [ ] Agent Version（创建新版本/查看历史版本/回滚）
- [ ] Agent Publish（Private/Family/Public 切换）
- [ ] Agent ↔ Session 关联（通过 agent_runs 反查）
- [ ] Runtime Metadata（支持 Hermes/Claude Code/Codex 标识）
- [ ] 前端四个页面可操作、数据持久化
- [ ] 构建部署到 innee.cn 可公网访问
