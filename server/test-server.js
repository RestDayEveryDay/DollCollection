// 最简单的测试服务器 - 用于验证Render是否工作
const express = require('express');
const app = express();
const PORT = process.env.PORT || 5000;

// 允许跨域
app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  if (req.method === 'OPTIONS') {
    return res.sendStatus(200);
  }
  next();
});

app.use(express.json());

// 根路径 - 测试服务器是否运行
app.get('/', (req, res) => {
  res.json({ 
    message: '✅ Server is running!',
    time: new Date().toISOString()
  });
});

// 健康检查
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok' });
});

// 登录接口 - 硬编码
app.post('/api/auth/login', (req, res) => {
  const { username, password } = req.body;
  if (username === '休息日' && password === '200703') {
    res.json({
      token: 'test-token-123456',
      user: { id: 1, username: '休息日' }
    });
  } else {
    res.status(401).json({ error: '用户名或密码错误' });
  }
});

// 注册接口
app.post('/api/auth/register', (req, res) => {
  res.json({
    token: 'test-token-' + Date.now(),
    user: { id: 1, username: req.body.username }
  });
});

// 验证接口
app.get('/api/auth/verify', (req, res) => {
  res.json({ valid: true, user: { username: '休息日' } });
});

// 所有GET请求返回空数组
app.get('/api/*', (req, res) => {
  console.log('GET:', req.path);
  res.json([]);
});

// 所有POST请求返回成功
app.post('/api/*', (req, res) => {
  console.log('POST:', req.path);
  res.json({ success: true });
});

// 所有PUT请求返回成功
app.put('/api/*', (req, res) => {
  console.log('PUT:', req.path);
  res.json({ success: true });
});

// 所有DELETE请求返回成功
app.delete('/api/*', (req, res) => {
  console.log('DELETE:', req.path);
  res.json({ success: true });
});

// 启动服务器
app.listen(PORT, '0.0.0.0', () => {
  console.log('=====================================');
  console.log('✅ TEST SERVER STARTED SUCCESSFULLY!');
  console.log(`📍 Port: ${PORT}`);
  console.log('🔑 Login: 休息日 / 200703');
  console.log('🌐 Test URL: http://localhost:' + PORT);
  console.log('=====================================');
});

console.log('Starting test server...');