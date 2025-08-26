# 🔒 安全部署指南

## 一、VPS部署（推荐 - 最安全）

### 1. 购买VPS
- **国内**: 阿里云/腾讯云 (需备案，约￥50/月)
- **国外**: Vultr/DigitalOcean ($6/月起)

### 2. 服务器配置

```bash
# SSH登录到服务器
ssh root@你的服务器IP

# 1. 安装Node.js
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt-get install -y nodejs

# 2. 安装PM2（进程管理）
npm install -g pm2

# 3. 安装Nginx
sudo apt-get install nginx

# 4. 创建应用目录
mkdir -p /var/www/dollcollection
cd /var/www/dollcollection
```

### 3. 上传代码

```bash
# 在本地打包
npm run build

# 使用SCP上传（在本地运行）
scp -r ./* root@服务器IP:/var/www/dollcollection/
```

### 4. 配置环境变量

```bash
# 创建.env文件
nano /var/www/dollcollection/.env

# 添加以下内容（修改为你的值）
NODE_ENV=production
PORT=5000
JWT_SECRET=生成一个随机的32位字符串
ALLOWED_ORIGIN=https://你的域名.com
```

### 5. 配置Nginx

```nginx
server {
    listen 80;
    server_name 你的域名.com;

    # 前端静态文件
    location / {
        root /var/www/dollcollection/client/build;
        try_files $uri /index.html;
    }

    # API代理
    location /api {
        proxy_pass http://localhost:5000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }

    # 上传文件访问
    location /uploads {
        alias /var/www/dollcollection/server/uploads;
    }
}
```

### 6. 启动应用

```bash
cd /var/www/dollcollection/server
npm install
pm2 start index.js --name dollcollection
pm2 save
pm2 startup
```

### 7. 配置SSL证书（HTTPS）

```bash
# 安装Certbot
sudo apt-get install certbot python3-certbot-nginx

# 获取免费SSL证书
sudo certbot --nginx -d 你的域名.com

# 自动续期
sudo certbot renew --dry-run
```

## 二、数据安全措施

### 1. 定期备份
- 自动备份已集成在系统中
- 备份文件保存在 `/data/backups`
- 每24小时自动备份一次

### 2. 数据库加密
```bash
# 设置数据库文件权限
chmod 600 /var/www/dollcollection/server/doll_collection.db
chown www-data:www-data /var/www/dollcollection/server/doll_collection.db
```

### 3. 防火墙配置
```bash
# 只开放必要端口
sudo ufw allow 22/tcp  # SSH
sudo ufw allow 80/tcp  # HTTP
sudo ufw allow 443/tcp # HTTPS
sudo ufw enable
```

### 4. 监控和日志
```bash
# 查看应用日志
pm2 logs dollcollection

# 查看Nginx日志
tail -f /var/log/nginx/access.log
tail -f /var/log/nginx/error.log
```

## 三、免费替代方案（个人使用）

### Railway部署（简单但有限制）
1. 注册 [Railway](https://railway.app)
2. 连接GitHub仓库
3. 添加环境变量
4. 自动部署

### Render部署（免费但会休眠）
1. 注册 [Render](https://render.com)
2. 创建Web Service
3. 连接GitHub
4. 配置环境变量

## 四、重要安全提醒

### ⚠️ 必须做的事：
1. **修改默认密码**: 立即修改管理员账户密码
2. **设置强密钥**: JWT_SECRET必须是随机生成的
3. **限制CORS**: 只允许你的域名访问API
4. **定期备份**: 下载备份到本地保存
5. **监控访问**: 定期查看访问日志

### 🚫 绝对不要做：
1. 不要把.env文件提交到Git
2. 不要使用默认密码
3. 不要关闭防火墙
4. 不要忽略异常访问

## 五、域名配置

### 购买域名
- 国内: 阿里云/腾讯云（需实名）
- 国外: Namecheap/Cloudflare

### DNS设置
```
A记录: @ -> 你的服务器IP
A记录: www -> 你的服务器IP
```

## 六、维护命令

```bash
# 重启应用
pm2 restart dollcollection

# 查看状态
pm2 status

# 手动备份
node /var/www/dollcollection/server/backup.js

# 更新代码
git pull
npm install
npm run build
pm2 restart dollcollection
```

## 需要帮助？

如果遇到问题，可以：
1. 查看日志: `pm2 logs`
2. 检查端口: `netstat -tlnp`
3. 测试API: `curl http://localhost:5000/api/test`

记住：**数据安全第一！**