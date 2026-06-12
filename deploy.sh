#!/bin/bash
# AgentHub 前端构建部署脚本
# 用法: bash deploy.sh

set -e

PROJECT_DIR="/root/.hermes/workspace/agenthub"
DEPLOY_DIR="/opt/agenthub-production/current/dist"

echo "🔨 开始构建前端..."
cd "$PROJECT_DIR"
pnpm build:h5

echo "🧹 清理旧文件..."
rm -rf "$DEPLOY_DIR"/js/*.js "$DEPLOY_DIR"/css/*.css "$DEPLOY_DIR"/index.html

echo "📦 复制新文件..."
cp -r dist/* "$DEPLOY_DIR/"
chown -R 1001:1001 "$DEPLOY_DIR"

echo "✅ 部署完成!"
echo "📁 部署目录: $DEPLOY_DIR"
ls -la "$DEPLOY_DIR"/js/ | head -5
