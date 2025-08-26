# 🚀 阿里云部署步骤（使用IP地址）

## 准备工作
- ✅ 阿里云服务器（已有）
- ✅ 服务器公网IP
- ✅ root密码

## 📋 详细步骤

### 步骤1：连接服务器
```bash
# Windows PowerShell 或 CMD
ssh root@你的服务器IP

# 输入密码
```

### 步骤2：一键部署
```bash
# 在服务器上执行
cd /root

# 下载部署脚本
cat > quick-deploy.sh << 'EOF'
[把 quick-deploy.sh 的内容粘贴这里]
EOF

# 执行脚本
chmod +x quick-deploy.sh
./quick-deploy.sh
```

### 步骤3：上传项目文件

#### 方法A：使用压缩包（推荐）
**在本地Windows：**
```powershell
# 1. 打开PowerShell，进入项目目录
cd C:\Users\12096\Desktop\Programming\DollCollection_carefulver\DollCollection-master

# 2. 打包项目
Compress-Archive -Path * -DestinationPath dollcollection.zip

# 3. 上传到服务器
scp dollcollection.zip root@你的服务器IP:/var/www/dollcollection/
```

**在服务器上：**
```bash
cd /var/www/dollcollection
unzip dollcollection.zip
```

#### 方法B：使用FileZilla（图形界面）
1. 下载 [FileZilla](https://filezilla-project.org/)
2. 连接信息：
   - 主机：你的服务器IP
   - 用户名：root
   - 密码：你的密码
   - 端口：22
3. 上传整个项目文件夹到 `/var/www/dollcollection`

### 步骤4：配置阿里云安全组

**重要！必须开放端口：**

1. 登录阿里云控制台
2. 进入 ECS 实例详情
3. 点击"安全组" → "配置规则"
4. 添加入方向规则：
   - **端口80**（HTTP）：
     - 协议类型：TCP
     - 端口范围：80/80
     - 授权对象：0.0.0.0/0
   - **端口22**（SSH）：
     - 协议类型：TCP
     - 端口范围：22/22
     - 授权对象：0.0.0.0/0

### 步骤5：启动应用

```bash
# 在服务器上
cd /var/www/dollcollection/server

# 安装依赖
npm install

# 配置环境变量
nano .env
# 添加：
NODE_ENV=production
PORT=5000
JWT_SECRET=your-secret-key-123456
ALLOWED_ORIGIN=http://你的服务器IP

# 启动
pm2 start index.js --name dollcollection
pm2 save
```

### 步骤6：配置Nginx

```bash
# 编辑配置
nano /etc/nginx/sites-available/default
```

内容：
```nginx
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
    }
}
```

```bash
# 重启Nginx
nginx -t
systemctl restart nginx
```

## ✅ 完成！

访问：`http://你的服务器IP`

## 🔧 常见问题

### 1. 网站打不开
- 检查安全组是否开放80端口
- 检查服务状态：`pm2 status`
- 查看日志：`pm2 logs`

### 2. 502错误
- 应用未启动：`pm2 start /var/www/dollcollection/server/index.js`
- 检查端口：`netstat -tlnp | grep 5000`

### 3. 上传文件失败
- 检查权限：`chown -R www-data:www-data /var/www/dollcollection/server/uploads`

### 4. 数据库错误
- 检查数据库文件：`ls -la /var/www/dollcollection/server/*.db`
- 设置权限：`chmod 666 /var/www/dollcollection/server/doll_collection.db`

## 📝 维护命令

```bash
# 查看状态
pm2 status

# 重启应用
pm2 restart dollcollection

# 查看日志
pm2 logs

# 实时日志
pm2 logs --lines 100

# 停止应用
pm2 stop dollcollection

# 备份数据库
cp /var/www/dollcollection/server/doll_collection.db ~/backup-$(date +%Y%m%d).db
```