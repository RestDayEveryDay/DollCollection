const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const sqlite3 = require('sqlite3').verbose();
const path = require('path');

// JWT密钥（生产环境应该使用环境变量）
const JWT_SECRET = 'your-secret-key-doll-collection-2024';
const SALT_ROUNDS = 10;

// 数据库连接
const db = new sqlite3.Database(path.join(__dirname, 'doll_collection.db'));

// 创建用户表
const initUserTable = () => {
  return new Promise((resolve, reject) => {
    db.run(`
      CREATE TABLE IF NOT EXISTS users (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        username TEXT UNIQUE NOT NULL,
        password_hash TEXT NOT NULL,
        email TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        last_login DATETIME,
        is_active BOOLEAN DEFAULT 1
      )
    `, (err) => {
      if (err) reject(err);
      else resolve();
    });
  });
};

// 创建默认管理员账户（休息日）
const createDefaultAdmin = async () => {
  return new Promise(async (resolve, reject) => {
    // 检查是否已存在
    db.get('SELECT * FROM users WHERE username = ?', ['休息日'], async (err, user) => {
      if (err) {
        reject(err);
        return;
      }
      
      if (!user) {
        // 创建账户
        const passwordHash = await bcrypt.hash('200703', SALT_ROUNDS);
        db.run(
          'INSERT INTO users (username, password_hash) VALUES (?, ?)',
          ['休息日', passwordHash],
          function(err) {
            if (err) reject(err);
            else {
              console.log('✅ 默认管理员账户 "休息日" 已创建');
              resolve(this.lastID);
            }
          }
        );
      } else {
        console.log('ℹ️ 管理员账户 "休息日" 已存在');
        resolve(user.id);
      }
    });
  });
};

// 用户注册
const register = async (username, password, email = null) => {
  return new Promise(async (resolve, reject) => {
    try {
      // 检查用户名是否已存在
      db.get('SELECT * FROM users WHERE username = ?', [username], async (err, user) => {
        if (err) {
          reject(err);
          return;
        }
        
        if (user) {
          resolve({ success: false, error: '用户名已存在' });
          return;
        }
        
        // 加密密码
        const passwordHash = await bcrypt.hash(password, SALT_ROUNDS);
        
        // 创建用户
        db.run(
          'INSERT INTO users (username, password_hash, email) VALUES (?, ?, ?)',
          [username, passwordHash, email],
          function(err) {
            if (err) reject(err);
            else {
              resolve({
                success: true,
                userId: this.lastID,
                username: username
              });
            }
          }
        );
      });
    } catch (error) {
      reject(error);
    }
  });
};

// 用户登录
const login = async (username, password) => {
  return new Promise(async (resolve, reject) => {
    // 查找用户
    db.get('SELECT * FROM users WHERE username = ?', [username], async (err, user) => {
      if (err) {
        reject(err);
        return;
      }
      
      if (!user) {
        resolve({ success: false, error: '用户名或密码错误' });
        return;
      }
      
      // 验证密码
      const passwordMatch = await bcrypt.compare(password, user.password_hash);
      if (!passwordMatch) {
        resolve({ success: false, error: '用户名或密码错误' });
        return;
      }
      
      // 更新最后登录时间
      db.run(
        'UPDATE users SET last_login = CURRENT_TIMESTAMP WHERE id = ?',
        [user.id]
      );
      
      // 生成JWT token
      const token = jwt.sign(
        { 
          userId: user.id, 
          username: user.username 
        },
        JWT_SECRET,
        { expiresIn: '7d' }
      );
      
      resolve({
        success: true,
        token,
        userId: user.id,
        user: {
          id: user.id,
          username: user.username,
          email: user.email
        }
      });
    });
  });
};

// 验证JWT token
const verifyToken = (token) => {
  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    return decoded;
  } catch (error) {
    return null;
  }
};

// Express中间件：验证用户身份
const authMiddleware = (req, res, next) => {
  const token = req.headers.authorization?.replace('Bearer ', '');
  
  if (!token) {
    return res.status(401).json({ error: '请先登录' });
  }
  
  const decoded = verifyToken(token);
  if (!decoded) {
    return res.status(401).json({ error: '登录已过期，请重新登录' });
  }
  
  // 将用户信息添加到请求对象
  req.userId = decoded.userId;
  req.username = decoded.username;
  next();
};

// 修改密码
const changePassword = async (userId, oldPassword, newPassword) => {
  return new Promise(async (resolve, reject) => {
    // 获取用户信息
    db.get('SELECT * FROM users WHERE id = ?', [userId], async (err, user) => {
      if (err) {
        reject(err);
        return;
      }
      
      if (!user) {
        reject(new Error('用户不存在'));
        return;
      }
      
      // 验证旧密码
      const passwordMatch = await bcrypt.compare(oldPassword, user.password_hash);
      if (!passwordMatch) {
        reject(new Error('原密码错误'));
        return;
      }
      
      // 加密新密码
      const newPasswordHash = await bcrypt.hash(newPassword, SALT_ROUNDS);
      
      // 更新密码
      db.run(
        'UPDATE users SET password_hash = ? WHERE id = ?',
        [newPasswordHash, userId],
        (err) => {
          if (err) reject(err);
          else resolve({ message: '密码修改成功' });
        }
      );
    });
  });
};

// 获取用户信息
const getUserInfo = (userId) => {
  return new Promise((resolve, reject) => {
    db.get(
      'SELECT id, username, email, created_at, last_login FROM users WHERE id = ?',
      [userId],
      (err, user) => {
        if (err) reject(err);
        else resolve(user);
      }
    );
  });
};

// 修改用户名
const changeUsername = async (userId, newUsername) => {
  return new Promise(async (resolve, reject) => {
    // 检查新用户名是否已存在
    db.get('SELECT * FROM users WHERE username = ? AND id != ?', [newUsername, userId], async (err, existingUser) => {
      if (err) {
        reject(err);
        return;
      }
      
      if (existingUser) {
        reject(new Error('用户名已存在'));
        return;
      }
      
      // 更新用户名
      db.run(
        'UPDATE users SET username = ? WHERE id = ?',
        [newUsername, userId],
        function(err) {
          if (err) reject(err);
          else {
            if (this.changes === 0) {
              reject(new Error('用户不存在'));
            } else {
              // 生成新的JWT token
              const token = jwt.sign(
                { 
                  userId: userId, 
                  username: newUsername 
                },
                JWT_SECRET,
                { expiresIn: '7d' }
              );
              
              resolve({ 
                success: true, 
                username: newUsername,
                token: token 
              });
            }
          }
        }
      );
    });
  });
};

module.exports = {
  initUserTable,
  createDefaultAdmin,
  register,
  login,
  verifyToken,
  authMiddleware,
  changePassword,
  changeUsername,
  getUserInfo,
  JWT_SECRET
};