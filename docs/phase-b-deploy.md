# Phase B — 火山云部署清单

## 前置

- [ ] SSH 到火山云 VPS
- [ ] 确认 `~/.hermes/state.db` 存在
- [ ] 运行 `sqlite3 ~/.hermes/state.db ".schema"` 更新 `docs/hermes-schema.md`
- [ ] 更新 `docs/schema-mapping.md` 若 schema 与 fixture 不同

## 部署

推荐使用 GitHub Actions 正式发布，见 [github-actions-deploy.md](./github-actions-deploy.md)。

手工部署仍可用于首次引导或应急：

```bash
# 在 VPS 上
git clone <repo> && cd agenthub
export API_BEARER_TOKEN=<secret>
docker compose -f docker-compose.volcengine.yml up -d --build
```

## 验证

```bash
curl -H "Authorization: Bearer $API_BEARER_TOKEN" https://api.yourdomain.com/api/v1/dashboard
curl https://api.yourdomain.com/api/v1/sessions | jq length   # 应接近 270+
```

## 本地联调（SSH 隧道）

```bash
ssh -L 8000:127.0.0.1:8000 user@<公网IP>
# 本地 H5: API_BASE 指向 http://127.0.0.1:8000
```

## Nginx + HTTPS

见 [deploy/nginx.conf](../deploy/nginx.conf)
