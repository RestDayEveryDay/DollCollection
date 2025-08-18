# Vercel部署修复指南

## 当前问题
- ❌ 前端请求`http://localhost:5000`（本地地址）
- ❌ 手机/平板无法访问（显示网络错误）
- ❌ 衣柜等页面显示401错误

## 解决方案

### 立即修复步骤

#### 1. 在Vercel设置环境变量
登录Vercel控制台，在项目Settings → Environment Variables添加：

如果您部署了独立的后端服务器：
```
REACT_APP_API_URL = https://您的后端地址.com
```

如果使用Vercel Serverless（推荐）：
```
JWT_SECRET = your-secret-key-here
```
（不需要设置REACT_APP_API_URL，会自动使用相对路径）

#### 2. 重新部署
在Vercel控制台点击"Redeploy"，或推送新代码触发自动部署。

### 后端部署选项

#### 选项A：使用Vercel Serverless Functions（最简单）
- ✅ 前后端同域，无CORS问题
- ✅ 自动扩缩容
- ✅ 免费额度够用
- ❌ 数据库需要外部服务

已创建的文件：
- `/api/index.js` - 基础认证API
- `/api/wardrobe/[...path].js` - 衣柜API

#### 选项B：部署独立后端服务器

**免费平台选择：**

1. **Render.com**（推荐）
   - 免费750小时/月
   - 支持SQLite
   - 自动HTTPS
   
2. **Railway.app**
   - 免费额度
   - 简单部署
   - 需要信用卡验证

3. **Fly.io**
   - 免费额度
   - 全球部署
   - 需要信用卡

**部署步骤：**
1. 选择平台注册
2. 连接GitHub仓库
3. 设置root directory为`server`
4. 添加环境变量：
   ```
   JWT_SECRET=your-secret-key
   NODE_ENV=production
   ```
5. 获取部署URL
6. 在Vercel设置`REACT_APP_API_URL`为该URL

### 验证修复

#### 本地测试
1. 设置环境变量：
   ```bash
   # Windows
   set REACT_APP_API_URL=https://your-backend.com
   
   # Mac/Linux
   export REACT_APP_API_URL=https://your-backend.com
   ```
2. 重启开发服务器
3. 检查Network标签，确认请求正确的地址

#### 生产环境测试
1. 部署后访问网站
2. 打开浏览器控制台
3. 检查API请求地址是否正确
4. 用手机访问测试

### 常见问题

#### Q: 为什么手机显示网络错误？
A: 因为代码请求`localhost:5000`，这是本地地址，手机无法访问您电脑的本地服务。

#### Q: 为什么您的电脑能访问？
A: 因为您的电脑上运行着后端服务（端口5000），所以localhost能访问到。

#### Q: 如何彻底解决？
A: 必须将后端部署到公网可访问的地址，或使用Vercel Serverless Functions。

### 临时解决方案（用于测试）

如果您想让手机临时访问您电脑上的后端：

1. **确保电脑和手机在同一WiFi**
2. **获取电脑IP地址**：
   ```bash
   # Windows
   ipconfig
   # 找到IPv4地址，如192.168.1.100
   ```
3. **修改后端允许外部访问**（server/index.js）：
   ```javascript
   app.listen(5000, '0.0.0.0', () => {
     console.log('Server running on port 5000');
   });
   ```
4. **关闭防火墙或添加规则允许5000端口**
5. **手机访问**：`http://192.168.1.100:5000`

⚠️ 注意：这只是临时方案，不适合生产环境！

### 最终建议

1. **短期**：使用Vercel Serverless Functions
2. **长期**：部署独立后端到Render或Railway
3. **数据库**：使用Supabase或PlanetScale（免费PostgreSQL/MySQL）

## 需要的代码已经准备好

- ✅ `client/src/utils/api.js` - 智能判断API地址
- ✅ `api/index.js` - Serverless认证功能
- ✅ `api/wardrobe/[...path].js` - Serverless衣柜API
- ✅ `vercel.json` - Vercel配置文件

现在只需要：
1. 推送代码到GitHub
2. 在Vercel设置环境变量
3. 重新部署

问题就能解决！