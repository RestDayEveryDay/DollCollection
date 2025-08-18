// Vercel Serverless Function - 简化版后端API
// 这是一个示例，用于在Vercel上运行后端API

const express = require('express');
const cors = require('cors');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

const app = express();

// 中间件
app.use(cors());
app.use(express.json());

// 简单的内存存储（仅用于演示，生产环境应使用数据库）
let users = [];

// JWT密钥
const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key';

// 注册接口
app.post('/api/auth/register', async (req, res) => {
  try {
    const { username, password } = req.body;
    
    // 检查用户是否存在
    if (users.find(u => u.username === username)) {
      return res.status(400).json({ error: '用户名已存在' });
    }
    
    // 加密密码
    const hashedPassword = await bcrypt.hash(password, 10);
    
    // 创建用户
    const user = {
      id: Date.now().toString(),
      username,
      password: hashedPassword
    };
    users.push(user);
    
    // 生成token
    const token = jwt.sign({ userId: user.id, username }, JWT_SECRET);
    
    res.json({
      token,
      user: { id: user.id, username }
    });
  } catch (error) {
    res.status(500).json({ error: '注册失败' });
  }
});

// 登录接口
app.post('/api/auth/login', async (req, res) => {
  try {
    const { username, password } = req.body;
    
    // 查找用户
    const user = users.find(u => u.username === username);
    if (!user) {
      return res.status(401).json({ error: '用户名或密码错误' });
    }
    
    // 验证密码
    const isValid = await bcrypt.compare(password, user.password);
    if (!isValid) {
      return res.status(401).json({ error: '用户名或密码错误' });
    }
    
    // 生成token
    const token = jwt.sign({ userId: user.id, username }, JWT_SECRET);
    
    res.json({
      token,
      user: { id: user.id, username }
    });
  } catch (error) {
    res.status(500).json({ error: '登录失败' });
  }
});

// 健康检查
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', message: '服务运行正常' });
});

// 导出为Vercel函数
module.exports = app;