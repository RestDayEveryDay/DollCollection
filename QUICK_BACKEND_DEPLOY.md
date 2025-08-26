# 快速后端部署指南 - 5分钟解决404问题

## 当前问题
Vercel只部署了前端，没有后端API，所以所有请求都返回404。

## 最快解决方案：使用Render.com（免费）

### 步骤1：准备后端代码
后端代码已经在`server`目录准备好了。

### 步骤2：部署到Render

1. **注册Render账号**
   - 访问 https://render.com
   - 用GitHub账号注册/登录

2. **创建Web Service**
   - 点击"New +"
   - 选择"Web Service"
   - 连接GitHub账号
   - 选择`RestDayEveryDay/DollCollection`仓库

3. **配置服务**
   ```
   Name: doll-collection-backend
   Region: Singapore（或离您最近的）
   Branch: master
   Root Directory: server
   Build Command: npm install
   Start Command: node index.js
   ```

4. **添加环境变量**
   点击"Advanced"，添加：
   ```
   JWT_SECRET = 46825feb9153e92825b5ada7528e00deef6d6d61f3b1bd034e25194774dbcb21
   NODE_ENV = production
   PORT = 5000
   ```

5. **创建服务**
   - 点击"Create Web Service"
   - 等待部署（约3-5分钟）
   - 获得URL如：`https://doll-collection-backend.onrender.com`

### 步骤3：配置Vercel前端

1. **登录Vercel**
   - https://vercel.com/dashboard
   - 进入您的项目

2. **设置环境变量**
   Settings → Environment Variables，添加：
   ```
   REACT_APP_API_URL = https://doll-collection-backend.onrender.com
   ```
   （使用您从Render获得的实际URL）

3. **重新部署**
   - 点击"Redeploy"
   - 选择最新commit

### 步骤4：验证
1. 等待Vercel部署完成（2分钟）
2. 访问您的网站
3. 登录测试（用户名：休息日，密码：200703）

## 备选方案

### 使用Glitch（更简单但性能较慢）

1. **访问** https://glitch.com
2. **点击** "New project" → "Import from GitHub"
3. **输入** `https://github.com/RestDayEveryDay/DollCollection`
4. **编辑** `.env`文件：
   ```
   JWT_SECRET=46825feb9153e92825b5ada7528e00deef6d6d61f3b1bd034e25194774dbcb21
   PORT=3000
   ```
5. **编辑** `package.json`的start脚本：
   ```json
   "start": "cd server && node index.js"
   ```
6. **获取URL** 如：`https://your-project.glitch.me`
7. **在Vercel设置** `REACT_APP_API_URL`

### 使用Cyclic（自动部署）

1. **访问** https://cyclic.sh
2. **登录** 用GitHub
3. **点击** "Deploy"
4. **选择** DollCollection仓库
5. **设置** 环境变量
6. **获取URL** 并在Vercel配置

## 常见问题

### Q: 为什么不用Vercel的Serverless？
A: Vercel Serverless适合简单API，但您的项目需要：
- SQLite数据库（Serverless不支持文件系统数据库）
- 文件上传（需要持久存储）
- 复杂的业务逻辑

### Q: Render免费吗？
A: 是的！免费套餐包括：
- 750小时/月（够用）
- 自动HTTPS
- 支持SQLite
- 可以上传文件

### Q: 部署后速度慢？
A: 免费服务器可能会休眠。首次访问需要30秒唤醒。之后就快了。

### Q: 数据会丢失吗？
A: Render的免费层会保留数据。但建议定期备份：
- 下载`database.db`文件
- 使用备份功能（已内置）

## 最终效果

部署完成后：
- ✅ 所有404错误消失
- ✅ 手机可以正常访问
- ✅ 数据正常保存
- ✅ 图片上传正常

## 需要帮助？

如果遇到问题：
1. 检查Render的Logs标签
2. 确认环境变量设置正确
3. 确保使用https而不是http