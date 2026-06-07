# GitHub Actions Deployment

AgentHub uses two GitHub Actions workflows:

- `CI`: runs on pull requests and pushes to `main`.
- `Deploy`: deploys to a GitHub Environment.

## Environments

Create these GitHub Environments in repository settings:

| Environment | Purpose | Trigger |
|---|---|---|
| `staging` | Test deployment | Manual `workflow_dispatch` |
| `production` | Public deployment | Manual `workflow_dispatch` |

For `production`, enable required reviewers in GitHub Environments before allowing deployment.

## Required Environment Secrets

Set these secrets separately for `staging` and `production`:

| Secret | Example | Description |
|---|---|---|
| `DEPLOY_HOST` | `innee.cn` | VPS host or IP |
| `DEPLOY_USER` | `root` | SSH user |
| `DEPLOY_SSH_KEY` | private key | SSH private key with access to the VPS |
| `DEPLOY_PATH` | `/opt/agenthub-production` | Release root for this environment |
| `APP_URL` | `https://innee.cn` | Public URL used by smoke tests |
| `BACKEND_PORT` | `8000` | Host port mapped to backend container port `8000` |
| `API_BEARER_TOKEN` | secret token | Bearer token required by the API |
| `HERMES_DATA_DIR` | `/root/.hermes` | Hermes data directory on the VPS |
| `AGENTHUB_DATA_DIR` | `/opt/agenthub-production/data` | Persistent AgentHub SQLite directory |

Optional Chat runtime secrets:

| Secret | Description |
|---|---|
| `LLM_BASE_URL` | OpenAI-compatible provider base URL |
| `LLM_API_KEY` | Provider API key |
| `LLM_MODEL` | Default model |

## Suggested Values

Staging:

```text
DEPLOY_PATH=/opt/agenthub-staging
APP_URL=https://staging.innee.cn
BACKEND_PORT=8001
HERMES_DATA_DIR=/root/.hermes
AGENTHUB_DATA_DIR=/opt/agenthub-staging/data
```

Production:

```text
DEPLOY_PATH=/opt/agenthub-production
APP_URL=https://innee.cn
BACKEND_PORT=8000
HERMES_DATA_DIR=/root/.hermes
AGENTHUB_DATA_DIR=/opt/agenthub-production/data
```

Nginx should route each domain to the matching `BACKEND_PORT` and serve the matching `current/dist` directory for H5 static assets.

Use [deploy/nginx.agenthub.conf](../deploy/nginx.agenthub.conf) as the starting point:

| Domain | Static root | API upstream |
|---|---|---|
| `staging.innee.cn` | `/opt/agenthub-staging/current/dist` | `127.0.0.1:8001` |
| `innee.cn` | `/opt/agenthub-production/current/dist` | `127.0.0.1:8000` |

## Manual Production Deploy

1. Open GitHub Actions.
2. Select `Deploy`.
3. Run workflow.
4. Choose `production`.
5. Approve the GitHub Environment gate if configured.

## Smoke Test

After deployment:

```bash
curl https://innee.cn/api/v1/health
curl -H "Authorization: Bearer $API_BEARER_TOKEN" https://innee.cn/api/v1/dashboard
```

In the browser, open:

```text
https://innee.cn/index.html
```

Dashboard should not continuously reload. `dashboard` should poll roughly every 10 seconds, and `agents` roughly every 30 seconds.
