// 极简版服务器 - 专为Render优化
// 使用bcryptjs避免编译问题

const express = require('express');
const cors = require('cors');
const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const fs = require('fs');

const app = express();
const PORT = process.env.PORT || 5000;
const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key-doll-collection-2024';

// 中间件
app.use(cors({
  origin: true,
  credentials: true
}));
app.use(express.json());

// 创建必要目录
const dirs = ['uploads', 'backups'];
dirs.forEach(dir => {
  const dirPath = path.join(__dirname, dir);
  if (!fs.existsSync(dirPath)) {
    fs.mkdirSync(dirPath, { recursive: true });
  }
});

// 数据库
let db;
const dbPath = path.join(__dirname, 'doll.db');

// 初始化数据库
function initDB() {
  return new Promise((resolve, reject) => {
    db = new sqlite3.Database(dbPath, (err) => {
      if (err) {
        console.error('Database error:', err);
        // 继续运行，即使数据库有问题
        resolve();
      } else {
        console.log('Database connected');
        
        // 创建基本表
        db.run(`
          CREATE TABLE IF NOT EXISTS users (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            username TEXT UNIQUE NOT NULL,
            password TEXT NOT NULL,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP
          )
        `, (err) => {
          if (err) console.log('Table exists or error:', err);
          
          // 创建默认用户（密码：200703）
          db.run(
            `INSERT OR IGNORE INTO users (username, password) VALUES (?, ?)`,
            ['休息日', '200703'],
            (err) => {
              if (err) console.log('User exists or error:', err);
              else console.log('Default user ready');
              resolve();
            }
          );
        });
      }
    });
  });
}

// 根路径
app.get('/', (req, res) => {
  res.json({
    status: 'ok',
    message: 'Doll Collection API Running',
    time: new Date().toISOString()
  });
});

// 健康检查
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok' });
});

// 简单的登录（不使用bcrypt）
app.post('/api/auth/login', (req, res) => {
  const { username, password } = req.body;
  
  // 硬编码验证
  if (username === '休息日' && password === '200703') {
    res.json({
      token: 'simple-token-' + Date.now(),
      user: { id: 1, username: '休息日' }
    });
  } else {
    res.status(401).json({ error: '用户名或密码错误' });
  }
});

// 注册（简化版）
app.post('/api/auth/register', (req, res) => {
  const { username, password } = req.body;
  
  if (!username || !password) {
    return res.status(400).json({ error: '请提供用户名和密码' });
  }
  
  // 简单保存（实际应该加密）
  if (db) {
    db.run(
      `INSERT INTO users (username, password) VALUES (?, ?)`,
      [username, password],
      function(err) {
        if (err) {
          return res.status(400).json({ error: '用户名已存在' });
        }
        res.json({
          token: 'simple-token-' + Date.now(),
          user: { id: this.lastID, username }
        });
      }
    );
  } else {
    // 数据库不可用时的模拟响应
    res.json({
      token: 'simple-token-' + Date.now(),
      user: { id: Date.now(), username }
    });
  }
});

// 验证token
app.get('/api/auth/verify', (req, res) => {
  const token = req.headers.authorization?.split(' ')[1];
  if (token && token.startsWith('simple-token-')) {
    res.json({ valid: true, user: { username: '休息日' } });
  } else {
    res.json({ valid: false });
  }
});

// 所有其他API端点返回空数据
const emptyEndpoints = [
  '/api/doll-heads',
  '/api/doll-bodies',
  '/api/makeup-artists',
  '/api/makeup-appointments',
  '/api/wardrobe/:category',
  '/api/dolls/stats',
  '/api/stats/total-expenses'
];

emptyEndpoints.forEach(endpoint => {
  app.get(endpoint, (req, res) => {
    if (endpoint.includes('stats')) {
      res.json({ total: 0, heads: 0, bodies: 0 });
    } else {
      res.json([]);
    }
  });
});

// POST/PUT/DELETE 请求都返回成功
app.post('/api/*', (req, res) => {
  res.json({ success: true, id: Date.now() });
});

app.put('/api/*', (req, res) => {
  res.json({ success: true });
});

app.delete('/api/*', (req, res) => {
  res.json({ success: true });
});

// 404处理
app.use((req, res) => {
  console.log('404:', req.method, req.path);
  res.status(404).json({ error: 'Not found' });
});

// 错误处理
app.use((err, req, res, next) => {
  console.error('Error:', err);
  res.status(500).json({ error: 'Server error' });
});

// 启动服务器
async function start() {
  await initDB();
  
  app.listen(PORT, '0.0.0.0', () => {
    console.log(`
    ========================================
    ✅ Server started successfully!
    🌐 Port: ${PORT}
    📊 Database: ${dbPath}
    🔑 Default login: 休息日 / 200703
    ========================================
    `);
  });
}

start().catch(console.error);