# 远程本地调试

本地调试 H5 前端时，可以让开发服务器把 `/api` 代理到远程 AgentHub 后端。

## 方式一：调试 staging 环境

```bash
pnpm dev:h5:remote
```

这个脚本会将 `AGENTHUB_API_TARGET` 设置为 `https://staging.innee.cn`，前端请求仍然写 `/api/...`，由本地 dev server 代理到 staging 环境。

打开 Taro 输出的本地地址后，在登录页输入公网环境的访问 token。

如需临时排查生产问题，可以显式运行：

```bash
pnpm dev:h5:prod
```

## 方式二：通过 SSH 隧道调 VPS 内网端口

如果不想经过公网 Nginx，可以先在本机建立 SSH 隧道：

```bash
ssh -N -L 18000:127.0.0.1:8000 <user>@<vps-host>
```

然后启动本地前端：

```bash
AGENTHUB_API_TARGET=http://127.0.0.1:18000 pnpm dev:h5
```

这样本地浏览器访问的是本地 H5，API 请求会走 SSH 隧道转发到 VPS 上的后端端口。

## 常用检查

```bash
curl -H "Authorization: Bearer <token>" https://innee.cn/api/v1/health
curl -H "Authorization: Bearer <token>" http://127.0.0.1:18000/api/v1/health
```
