# Hermes Cron CLI Mapping

AgentHub V1 通过 Command Queue 调用以下命令（`CRON_MOCK=false` 时）：

```bash
hermes cron pause <job_id>
hermes cron resume <job_id>
hermes cron run <job_id>
hermes cron remove <job_id>
```

本地开发默认 `CRON_MOCK=true`，仅打日志不执行 CLI。

火山云部署：在 `.env` 或 `docker-compose.volcengine.yml` 中设置：

- `CRON_MOCK=false`
- `HERMES_BIN=hermes`
- `HERMES_DATA_DIR=/root/.hermes`

SSH 到 VPS 后运行 `hermes cron --help` 核对子命令是否与上表一致，并更新本文档。
