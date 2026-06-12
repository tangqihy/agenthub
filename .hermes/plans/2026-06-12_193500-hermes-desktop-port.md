# hermes-desktop → AgentHub 搬运计划

**目标**: 将 hermes-desktop (Electron+React+Vite+Tailwind) 的高价值 UI/逻辑搬到 AgentHub (Taro+NutUI+FastAPI)
**源**: `/tmp/hermes-desktop` (cloned)
**目标**: `/root/.hermes/workspace/agenthub`

---

## 一、可搬运资产清单

### ✅ 高价值（直接搬 UI + 逻辑适配）

| 模块 | 源文件 | 价值 | 改造难度 |
|------|--------|------|----------|
| **Chat 消息渲染** | `MessageRow.tsx`, `HistoryRow.tsx`, `MessageList.tsx` | 气泡分组、头像对齐、tool 折叠、reasoning 折叠 | 中 |
| **Markdown 渲染** | `AgentMarkdown.tsx` | react-markdown + 语法高亮 + 代码复制 + diff 视图 | 中 |
| **Chat 空状态** | `ChatEmptyState.tsx` | 建议卡片、欢迎页 | 低 |
| **Chat Header** | `ChatHeader.tsx` | token 计数、cost 显示、清除/新建 | 低 |
| **Session 管理** | `Sessions.tsx` | FTS 搜索、日期分组、重命名、批量删除 | 中 |
| **CSS 设计系统** | `main.css` (变量部分) | 11 套主题的 CSS 变量、light/dark 切换 | 低 |
| **Typing 动画** | `MessageList.tsx` TypingIndicator | 三点动画 | 低 |
| **确认弹窗模式** | `Sessions.tsx` 确认删除 | overlay + modal 标准模式 | 低 |

### ⚠️ 中等价值（需要大幅改造）

| 模块 | 原因 |
|------|------|
| **Models 页面** | AgentHub 用 agent 配置代替全局 model 管理，概念不同 |
| **Skills 页面** | AgentHub 已有自己的 Skills Marketplace，可增强细节展示 |
| **Settings 页面** | AgentHub 是 Web 应用，设置项不同 |

### ❌ 不搬（Electron 专属 / 不适用）

| 模块 | 原因 |
|------|------|
| `window.hermesAPI` IPC | Electron 专属，AgentHub 用 HTTP API |
| SSH/Gateway/Office3D | 桌面专属功能 |
| i18n 系统 | AgentHub 纯中文 |
| 语音输入 | 移动端浏览器支持差 |
| Profile/Soul 系统 | AgentHub 用 Agent 体系 |
| Kanban/Office | 非核心功能 |

---

## 二、分步实施计划

### Phase 1: Chat UI 大改造 ⭐ 核心

**目标**: Chat 页面从"能用"变成"好用"，对标 hermes-desktop 的 Chat 体验

#### 1.1 增强 Markdown 渲染
- [ ] 创建 `src/components/chat/MarkdownRenderer.tsx`
  - 用 `react-markdown` + `remark-gfm` 替代当前的 `simpleMarkdownToHtml`
  - 代码块：语法高亮（`react-syntax-highlighter`）+ 复制按钮
  - Diff 视图：+绿 -红 @@灰
  - 表格渲染（GFM）
  - 链接：外链点击跳转
- [ ] 安装依赖: `react-markdown`, `remark-gfm`, `react-syntax-highlighter`

#### 1.2 消息列表重构
- [ ] 改造 `MessageBubble.tsx` → 分离为 `MessageRow.tsx`
  - 头像：助手消息左侧显示头像，连续消息只显示一次
  - 气泡样式：用户消息右侧蓝色，助手消息左侧灰色
  - Approval bar：检测危险操作显示 批准/拒绝 按钮
- [ ] 创建 `src/components/chat/ToolActivityGroup.tsx`
  - 连续 tool_call 折叠为一组，显示 "N tools called"
  - 点击展开看每个 tool 的详情（参数 + 结果）
  - 运行中显示 spinner
- [ ] 改造 `ThinkingBlock.tsx` → `ReasoningRow.tsx`
  - 可折叠，默认收起
  - 显示行数元信息
  - 流式时显示 "思考中..."，完成后显示 "已思考"

#### 1.3 Chat Header 增强
- [ ] 改造 chat 页面 header
  - 显示 agent 名称 + session ID
  - Token 用量 badge（prompt + completion）
  - 新建对话按钮
  - 清除对话按钮（带确认）

#### 1.4 空状态优化
- [ ] 创建 `src/components/chat/ChatEmptyState.tsx`
  - Logo + 欢迎文案
  - 3-4 个建议卡片（点击填入输入框）

#### 1.5 Typing 动画
- [ ] 创建 `src/components/chat/TypingIndicator.tsx`
  - 三个点的 CSS 动画
  - 流式时显示在消息列表底部

#### 1.6 Chat Input 增强
- [ ] 改造 `ChatInput.tsx`
  - 自适应高度（最多 120px）
  - Enter 发送，Shift+Enter 换行
  - IME composition 支持（中文输入）
  - 禁用状态处理

### Phase 2: Sessions 管理增强

#### 2.1 搜索功能
- [ ] 在 sessions 页面顶部添加搜索框
- [ ] 后端添加 FTS 搜索接口（复用现有 sessions API）

#### 2.2 日期分组
- [ ] sessions 列表按日期分组：今天 / 昨天 / 本周 / 更早
- [ ] 每组显示分组标题

#### 2.3 操作增强
- [ ] Session 卡片：左滑删除（移动端）或长按菜单
- [ ] 内联重命名（点击标题编辑）
- [ ] 批量选择模式（多选 + 批量删除）

### Phase 3: CSS 设计系统 + 主题

#### 3.1 CSS 变量体系
- [ ] 创建 `src/styles/themes.scss`
  - 从 hermes-desktop 的 `main.css` 提取 CSS 变量
  - 定义 `[data-theme="light"]` 和 `[data-theme="dark"]`
  - 变量：--bg-primary, --text-primary, --accent, --border 等
- [ ] 创建 `src/styles/base.scss` — 全局 reset + 公共样式

#### 3.2 主题切换
- [ ] 在 Settings 或底部导航添加主题切换入口
- [ ] 用 `Taro.setStorageSync` 持久化主题选择
- [ ] 首次加载时读取存储的主题

#### 3.3 样式迁移
- [ ] 将各组件的硬编码颜色替换为 CSS 变量
- [ ] 统一圆角、间距、字号规范

### Phase 4: 新增页面

#### 4.1 Settings 页面
- [ ] 创建 `src/pages/settings/index.tsx`
  - 主题切换（Light/Dark）
  - API 配置查看
  - 版本信息
  - 关于页面

#### 4.2 Agents 页面增强
- [ ] Agent 列表添加搜索和过滤
- [ ] Agent 卡片样式优化（对齐 hermes-desktop 的 card 设计）

---

## 三、技术适配要点

| hermes-desktop | AgentHub 适配 |
|----------------|---------------|
| `lucide-react` 图标 | NutUI Icon 或内联 SVG |
| `tailwindcss` | SCSS + CSS 变量 |
| `window.hermesAPI.xxx` | `api.xxx()` (HTTP API) |
| `react-markdown` | 同样可用（H5 模式支持 DOM） |
| `react-syntax-highlighter` | 同样可用（H5 模式） |
| `react-hot-toast` | `Taro.showToast` |
| `memo()` 优化 | 同样适用 |
| CSS `position: fixed` | Taro H5 支持 |
| `textarea` | `<textarea>` 或 NutUI Input |

---

## 四、依赖安装

```bash
cd /root/.hermes/workspace/agenthub
pnpm add react-markdown remark-gfm react-syntax-highlighter
```

---

## 五、文件变更清单

### 新建文件
```
src/components/chat/MarkdownRenderer.tsx
src/components/chat/MarkdownRenderer.scss
src/components/chat/ToolActivityGroup.tsx
src/components/chat/ToolActivityGroup.scss
src/components/chat/ReasoningRow.tsx
src/components/chat/ReasoningRow.scss
src/components/chat/ChatEmptyState.tsx
src/components/chat/ChatEmptyState.scss
src/components/chat/TypingIndicator.tsx
src/components/chat/TypingIndicator.scss
src/styles/themes.scss
src/styles/base.scss
src/pages/settings/index.tsx
src/pages/settings/index.scss
```

### 修改文件
```
src/pages/chat/index.tsx          — 重构消息列表渲染逻辑
src/pages/chat/index.scss         — 新样式
src/components/chat/MessageBubble.tsx — 重构为 MessageRow 风格
src/components/chat/MessageBubble.scss — 新样式
src/components/chat/ChatInput.tsx — 增强输入体验
src/components/chat/ChatInput.scss — 新样式
src/components/chat/ThinkingBlock.tsx — 改为可折叠
src/pages/sessions/index.tsx      — 添加搜索、分组、重命名
src/pages/sessions/index.scss     — 新样式
src/app.scss                      — 引入主题变量
src/app.config.ts                 — 添加 settings 页面
```

---

## 六、验证标准

1. **Chat**: 发送消息 → 助手回复 → Markdown 渲染正确 → 代码块有高亮和复制 → tool calls 可折叠 → thinking 可折叠
2. **Sessions**: 搜索能命中 → 日期分组正确 → 重命名持久化 → 批量删除工作
3. **主题**: 切换 dark/light → 所有页面颜色跟随 → 刷新后保持
4. **构建**: `pnpm build:h5` 无报错
5. **部署**: 部署到 inne.cn 后功能正常

---

## 七、Review 检查点

- [ ] 所有颜色使用 CSS 变量，无硬编码
- [ ] 组件使用 `memo()` 优化重渲染
- [ ] 移动端触摸体验良好（按钮够大、滑动流畅）
- [ ] 中文排版正确（行高、字间距）
- [ ] 代码块在移动端可横向滚动
- [ ] 长消息不溢出容器
