#!/bin/bash

echo "======================================"
echo "🚀 娃娃收藏系统 - 快速部署脚本"
echo "======================================"
echo ""

# 颜色定义
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# 检查是否为root用户
if [ "$EUID" -ne 0 ]; then 
   echo -e "${RED}请使用root用户运行此脚本${NC}"
   exit 1
fi

echo -e "${GREEN}步骤 1/7: 更新系统...${NC}"
apt-get update -y

echo -e "${GREEN}步骤 2/7: 安装 Node.js...${NC}"
curl -fsSL https://deb.nodesource.com/setup_18.x | bash -
apt-get install -y nodejs
echo "Node版本: $(node -v)"
echo "NPM版本: $(npm -v)"

echo -e "${GREEN}步骤 3/7: 安装 PM2 和 Nginx...${NC}"
npm install -g pm2
apt-get install -y nginx

echo -e "${GREEN}步骤 4/7: 创建项目目录...${NC}"
mkdir -p /var/www/dollcollection
cd /var/www/dollcollection

echo -e "${GREEN}步骤 5/7: 等待文件上传...${NC}"
echo -e "${YELLOW}请上传项目文件到 /var/www/dollcollection${NC}"
echo "上传完成后按回车继续..."
read

echo -e "${GREEN}步骤 6/7: 安装依赖...${NC}"
cd /var/www/dollcollection/server
npm install

echo -e "${GREEN}步骤 7/7: 配置并启动服务...${NC}"

# 创建.env文件
cat > .env << EOF
NODE_ENV=production
PORT=5000
JWT_SECRET=$(openssl rand -base64 32)
ALLOWED_ORIGIN=http://$(curl -s ifconfig.me)
EOF

echo "✅ 环境变量配置完成"

# 启动应用
pm2 start index.js --name dollcollection
pm2 save
pm2 startup systemd -u root --hp /root

# 配置Nginx
cat > /etc/nginx/sites-available/default << 'EOF'
server {
    listen 80;
    server_name _;
    
    client_max_body_size 50M;
    
    location / {
        proxy_pass http://localhost:5000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    }
}
EOF

# 重启Nginx
nginx -t && systemctl restart nginx

# 获取服务器IP
SERVER_IP=$(curl -s ifconfig.me)

echo ""
echo "======================================"
echo -e "${GREEN}🎉 部署完成！${NC}"
echo "======================================"
echo ""
echo -e "访问地址: ${GREEN}http://$SERVER_IP${NC}"
echo ""
echo "默认管理员账号："
echo "用户名: 休息日"
echo "密码: 200703"
echo ""
echo -e "${YELLOW}⚠️  记得在阿里云控制台开放80端口！${NC}"
echo ""
echo "常用命令："
echo "查看状态: pm2 status"
echo "查看日志: pm2 logs"
echo "重启应用: pm2 restart dollcollection"
echo "======================================"