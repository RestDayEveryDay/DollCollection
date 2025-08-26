# 部署指南 - 娃娃收藏管理系统

## 问题：网站登录注册页显示"网络错误，请稍后重试"

### 原因分析
1. **前端已部署在Vercel，但后端服务器未部署**
2. **API地址仍指向localhost:5000（本地地址）**
3. **前端无法连接到后端服务器**

### 解决方案

## 方案一：部署后端到免费云服务（推荐）

### 1. 使用 Railway 部署后端
1. 访问 [Railway](https://railway.app/)
2. 使用GitHub登录
3. 点击 "New Project" → "Deploy from GitHub repo"
4. 选择您的 DollCollection 仓库
5. 在设置中：
   - Root Directory: `server`
   - Build Command: `npm install`
   - Start Command: `node index.js`
6. 添加环境变量：
   ```
   JWT_SECRET=your-secret-key-here
   NODE_ENV=production
   PORT=5000
   ```
7. 获取部署后的URL（如：https://your-app.railway.app）

### 2. 使用 Render 部署后端
1. 访问 [Render](https://render.com/)
2. 创建新的 Web Service
3. 连接GitHub仓库
4. 配置：
   - Root Directory: `server`
   - Build Command: `npm install`
   - Start Command: `node index.js`
5. 添加环境变量（同上）
6. 获取部署后的URL

### 3. 在 Vercel 配置后端API地址
1. 登录Vercel控制台
2. 进入您的项目设置
3. 找到 Environment Variables
4. 添加：
   ```
   REACT_APP_API_URL = https://your-backend-url.railway.app
   ```
5. 重新部署

## 方案二：使用自己的服务器

### 1. 准备服务器
- 阿里云ECS / 腾讯云 / AWS EC2
- 安装Node.js 16+
- 安装PM2: `npm install -g pm2`

### 2. 部署后端
```bash
# 克隆代码
git clone https://github.com/RestDayEveryDay/DollCollection.git
cd DollCollection/server

# 安装依赖
npm install

# 创建.env文件
cat > .env << EOF
JWT_SECRET=your-secret-key-here
NODE_ENV=production
PORT=5000
EOF

# 使用PM2启动
pm2 start index.js --name doll-backend
pm2 save
pm2 startup
```

### 3. 配置Nginx反向代理
```nginx
server {
    listen 80;
    server_name your-domain.com;

    location /api {
        proxy_pass http://localhost:5000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }
}
```

### 4. 配置HTTPS（使用Let's Encrypt）
```bash
sudo apt-get install certbot python3-certbot-nginx
sudo certbot --nginx -d your-domain.com
```

## 方案三：本地测试（仅用于开发）

如果只是想在本地测试：

1. **启动后端服务器**
```bash
cd server
npm install
node index.js
```

2. **启动前端（另一个终端）**
```bash
cd client
npm install
npm start
```

3. **访问** http://localhost:3000

## 环境变量配置说明

### 前端环境变量（client/.env）
```
REACT_APP_API_URL=https://your-backend-url.com
```

### 后端环境变量（server/.env）
```
JWT_SECRET=your-very-secure-secret-key
NODE_ENV=production
PORT=5000
DATABASE_URL=./database.db  # SQLite数据库路径
```

## 常见问题

### 1. CORS跨域错误
确保后端的CORS配置允许前端域名：
```javascript
// server/index.js
app.use(cors({
  origin: ['https://your-frontend.vercel.app', 'http://localhost:3000'],
  credentials: true
}));
```

### 2. 数据库连接问题
- SQLite数据库文件会自动创建
- 确保服务器有写入权限
- 建议定期备份数据库文件

### 3. 文件上传问题
- 确保uploads目录存在且有写入权限
- 考虑使用云存储服务（如阿里云OSS、AWS S3）

## 推荐的部署组合

1. **免费方案**
   - 前端：Vercel
   - 后端：Railway / Render
   - 数据库：SQLite（内置）

2. **专业方案**
   - 前端：Vercel / Netlify
   - 后端：阿里云ECS / AWS EC2
   - 数据库：PostgreSQL / MySQL
   - 文件存储：阿里云OSS / AWS S3

## 安全建议

1. **必须修改的配置**
   - JWT_SECRET：使用强密码
   - 数据库：定期备份
   - HTTPS：生产环境必须启用

2. **可选的安全增强**
   - 添加速率限制
   - 启用日志监控
   - 配置防火墙规则

## 需要帮助？

- 查看 [GitHub Issues](https://github.com/RestDayEveryDay/DollCollection/issues)
- 参考 server/DEPLOY_STEPS.md 获取更多细节