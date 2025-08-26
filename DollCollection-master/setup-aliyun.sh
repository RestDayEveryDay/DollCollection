#!/bin/bash

# ===========================
# 阿里云服务器快速部署脚本
# ===========================

echo "🚀 开始部署娃娃收藏系统..."

# 1. 更新系统
echo "📦 更新系统包..."
apt-get update
apt-get upgrade -y

# 2. 安装Node.js 18
echo "📦 安装Node.js..."
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
apt-get install -y nodejs

# 3. 安装PM2和Nginx
echo "📦 安装PM2和Nginx..."
npm install -g pm2
apt-get install -y nginx

# 4. 创建应用目录
echo "📁 创建应用目录..."
mkdir -p /var/www/dollcollection
mkdir -p /var/www/dollcollection/server/uploads
mkdir -p /var/www/dollcollection/server/backups

# 5. 设置权限
echo "🔒 设置目录权限..."
chown -R www-data:www-data /var/www/dollcollection
chmod -R 755 /var/www/dollcollection

echo "✅ 基础环境安装完成！"
echo ""
echo "下一步："
echo "1. 上传项目文件到 /var/www/dollcollection"
echo "2. 运行 cd /var/www/dollcollection && npm install"
echo "3. 配置.env文件"
echo "4. 启动应用: pm2 start server/index.js --name dollcollection"