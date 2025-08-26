const express = require('express');
const cors = require('cors');
const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const multer = require('multer');
const fs = require('fs');
const auth = require('./auth');

const app = express();
const PORT = process.env.PORT || 5001; // 使用不同端口避免冲突

app.use(cors());
app.use(express.json());

// 静态文件服务
app.use('/uploads', express.static('uploads'));

// 配置文件上传
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, 'uploads/');
  },
  filename: function (req, file, cb) {
    // 生成唯一文件名：时间戳 + 随机数 + 原扩展名
    const uniqueName = Date.now() + '-' + Math.round(Math.random() * 1E9) + path.extname(file.originalname);
    cb(null, uniqueName);
  }
});

const fileFilter = (req, file, cb) => {
  // 只允许图片文件
  if (file.mimetype.startsWith('image/')) {
    cb(null, true);
  } else {
    cb(new Error('只允许上传图片文件！'), false);
  }
};

const upload = multer({ 
  storage: storage,
  fileFilter: fileFilter
  // 移除文件大小限制
});

// 使用主数据库 - 只读模式保护数据
const db = new sqlite3.Database('./doll_collection.db', sqlite3.OPEN_READONLY, (err) => {
  if (err) {
    console.error('Error opening database:', err);
  } else {
    console.log('=====================================');
    console.log('✅ Connected to MAIN DATABASE (Read-Only)');
    console.log('📁 Database: doll_collection.db');
    console.log('🔒 Mode: READ-ONLY (数据受保护，无法修改)');
    console.log('📍 Port: ' + PORT);
    console.log('🔑 Login: 休息日 / 200703');
    console.log('⚠️  注意: 数据库以只读模式打开，所有写操作将失败');
    console.log('=====================================');
    // 注意：只读模式下不能初始化数据库表
    // initializeDatabase();
  }
});

// 只读模式下不需要初始化数据库
/*
function initializeDatabase() {
  // 妆师表
  db.run(`
    CREATE TABLE IF NOT EXISTS makeup_artists (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      contact TEXT,
      specialty TEXT,
      price_range TEXT,
      makeup_rules_image TEXT,
      note_template TEXT,
      is_favorite BOOLEAN DEFAULT 0,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `, (err) => {
    if (err) {
      console.error('创建makeup_artists表失败:', err);
    } else {
      // 检查并添加缺失的字段
      addMissingColumns();
    }
  });

  // 娃头表
  db.run(`
    CREATE TABLE IF NOT EXISTS doll_heads (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      company TEXT,
      skin_tone TEXT,
      size TEXT,
      price REAL,
      profile_image_url TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);

  // 娃体表
  db.run(`
    CREATE TABLE IF NOT EXISTS doll_bodies (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      company TEXT,
      skin_tone TEXT,
      size TEXT,
      neck_circumference REAL,
      shoulder_width REAL,
      profile_image_url TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);

  // 娃头妆容历史表
  db.run(`
    CREATE TABLE IF NOT EXISTS head_makeup_history (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      head_id INTEGER NOT NULL,
      makeup_artist_id INTEGER,
      makeup_artist_name TEXT,
      makeup_fee REAL,
      notes TEXT,
      makeup_date DATETIME,
      removal_date DATETIME,
      image_url TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (head_id) REFERENCES doll_heads (id),
      FOREIGN KEY (makeup_artist_id) REFERENCES makeup_artists (id)
    )
  `);

  // 娃头当前妆容表
  db.run(`
    CREATE TABLE IF NOT EXISTS head_current_makeup (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      head_id INTEGER NOT NULL UNIQUE,
      makeup_artist_id INTEGER,
      makeup_artist_name TEXT,
      makeup_fee REAL,
      notes TEXT,
      makeup_date DATETIME,
      image_url TEXT,
      from_history_id INTEGER,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (head_id) REFERENCES doll_heads (id),
      FOREIGN KEY (makeup_artist_id) REFERENCES makeup_artists (id),
      FOREIGN KEY (from_history_id) REFERENCES head_makeup_history (id)
    )
  `);

  // 娃头约妆表
  db.run(`
    CREATE TABLE IF NOT EXISTS head_makeup_appointments (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      head_id INTEGER NOT NULL UNIQUE,
      makeup_artist_id INTEGER,
      makeup_artist_name TEXT,
      makeup_fee REAL,
      notes TEXT,
      expected_arrival DATETIME,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (head_id) REFERENCES doll_heads (id),
      FOREIGN KEY (makeup_artist_id) REFERENCES makeup_artists (id)
    )
  `);

  // 娃体妆容表
  db.run(`
    CREATE TABLE IF NOT EXISTS body_makeup (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      body_id INTEGER NOT NULL UNIQUE,
      makeup_artist_id INTEGER,
      makeup_artist_name TEXT,
      makeup_fee REAL,
      makeup_date DATETIME,
      image_url TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (body_id) REFERENCES doll_bodies (id),
      FOREIGN KEY (makeup_artist_id) REFERENCES makeup_artists (id)
    )
  `);

  // 照片表
  db.run(`
    CREATE TABLE IF NOT EXISTS photos (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      entity_type TEXT NOT NULL, -- 'head' or 'body'
      entity_id INTEGER NOT NULL,
      photo_type TEXT NOT NULL, -- 'profile', 'album', 'makeup'
      image_url TEXT NOT NULL,
      caption TEXT,
      is_cover BOOLEAN DEFAULT 0,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);

  // 未约妆心仪妆师表
  db.run(`
    CREATE TABLE IF NOT EXISTS head_unmade_preferences (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      head_id INTEGER NOT NULL,
      makeup_artist_id INTEGER NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (head_id) REFERENCES doll_heads (id),
      FOREIGN KEY (makeup_artist_id) REFERENCES makeup_artists (id),
      UNIQUE(head_id, makeup_artist_id)
    )
  `);

  // 衣柜服饰表
  db.run(`
    CREATE TABLE IF NOT EXISTS wardrobe_items (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      category TEXT NOT NULL, -- 'body_accessories', 'headwear', 'sets', 'single_items', 'handheld'
      brand TEXT,
      platform TEXT,
      ownership_status TEXT DEFAULT 'owned', -- 'owned' or 'preorder'
      total_price REAL,
      deposit REAL,
      final_payment REAL,
      final_payment_date TEXT,
      profile_image_url TEXT,
      sort_order INTEGER DEFAULT 0,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);

  console.log('Database tables initialized');
}

function addMissingColumns() {
  // 检查makeup_artists表的列
  db.all("PRAGMA table_info(makeup_artists)", [], (err, columns) => {
    if (err) {
      console.error('获取表信息失败:', err);
      return;
    }
    
    const columnNames = columns.map(col => col.name);
    console.log('Current columns:', columnNames);
    
    // 检查并添加makeup_rules_image字段
    if (!columnNames.includes('makeup_rules_image')) {
      db.run("ALTER TABLE makeup_artists ADD COLUMN makeup_rules_image TEXT", (err) => {
        if (err) {
          console.error('添加makeup_rules_image字段失败:', err);
        } else {
          console.log('成功添加makeup_rules_image字段');
        }
      });
    }
    
    // 检查并添加note_template字段
    if (!columnNames.includes('note_template')) {
      db.run("ALTER TABLE makeup_artists ADD COLUMN note_template TEXT", (err) => {
        if (err) {
          console.error('添加note_template字段失败:', err);
        } else {
          console.log('成功添加note_template字段');
        }
      });
    }
    
    // 检查并添加is_favorite字段
    if (!columnNames.includes('is_favorite')) {
      db.run("ALTER TABLE makeup_artists ADD COLUMN is_favorite BOOLEAN DEFAULT 0", (err) => {
        if (err) {
          console.error('添加is_favorite字段失败:', err);
        } else {
          console.log('成功添加is_favorite字段');
        }
      });
    }
    
    // 检查并添加sort_order字段
    if (!columnNames.includes('sort_order')) {
      db.run("ALTER TABLE makeup_artists ADD COLUMN sort_order INTEGER DEFAULT 0", (err) => {
        if (err) {
          console.error('添加sort_order字段失败:', err);
        } else {
          console.log('成功添加makeup_artists表sort_order字段');
        }
      });
    }
    
    // 检查并添加when_available字段
    if (!columnNames.includes('when_available')) {
      db.run("ALTER TABLE makeup_artists ADD COLUMN when_available TEXT", (err) => {
        if (err) {
          console.error('添加when_available字段失败:', err);
        } else {
          console.log('成功添加makeup_artists表when_available字段');
        }
      });
    }
  });

  // 检查doll_heads表的列
  db.all("PRAGMA table_info(doll_heads)", [], (err, columns) => {
    if (err) {
      console.error('获取doll_heads表信息失败:', err);
      return;
    }
    
    const columnNames = columns.map(col => col.name);
    
    // 添加新字段到doll_heads表
    const headsNewColumns = [
      { name: 'sort_order', type: 'INTEGER DEFAULT 0' },
      { name: 'original_price', type: 'REAL' },
      { name: 'actual_price', type: 'REAL' },
      { name: 'release_date', type: 'TEXT' },
      { name: 'received_date', type: 'TEXT' },
      { name: 'purchase_channel', type: 'TEXT' },
      { name: 'ownership_status', type: 'TEXT DEFAULT "owned"' },
      { name: 'head_circumference', type: 'TEXT' },
      { name: 'size_category', type: 'TEXT' },
      { name: 'image_position_x', type: 'REAL DEFAULT 50' },
      { name: 'image_position_y', type: 'REAL DEFAULT 50' },
      { name: 'image_scale', type: 'REAL DEFAULT 100' },
      { name: 'total_price', type: 'REAL' },
      { name: 'deposit', type: 'REAL' },
      { name: 'final_payment', type: 'REAL' },
      { name: 'final_payment_date', type: 'TEXT' },
      { name: 'payment_status', type: 'TEXT DEFAULT "deposit_only"' }
    ];

    headsNewColumns.forEach(column => {
      if (!columnNames.includes(column.name)) {
        db.run(`ALTER TABLE doll_heads ADD COLUMN ${column.name} ${column.type}`, (err) => {
          if (err) {
            console.error(`添加doll_heads表${column.name}字段失败:`, err);
          } else {
            console.log(`成功添加doll_heads表${column.name}字段`);
          }
        });
      }
    });
  });

  // 检查doll_bodies表的列
  db.all("PRAGMA table_info(doll_bodies)", [], (err, columns) => {
    if (err) {
      console.error('获取doll_bodies表信息失败:', err);
      return;
    }
    
    const columnNames = columns.map(col => col.name);
    
    // 添加新字段到doll_bodies表
    const bodiesNewColumns = [
      { name: 'sort_order', type: 'INTEGER DEFAULT 0' },
      { name: 'original_price', type: 'REAL' },
      { name: 'actual_price', type: 'REAL' },
      { name: 'release_date', type: 'TEXT' },
      { name: 'received_date', type: 'TEXT' },
      { name: 'purchase_channel', type: 'TEXT' },
      { name: 'ownership_status', type: 'TEXT DEFAULT "owned"' },
      { name: 'head_circumference', type: 'TEXT' },
      { name: 'size_category', type: 'TEXT' },
      { name: 'image_position_x', type: 'REAL DEFAULT 50' },
      { name: 'image_position_y', type: 'REAL DEFAULT 50' },
      { name: 'image_scale', type: 'REAL DEFAULT 100' },
      { name: 'total_price', type: 'REAL' },
      { name: 'deposit', type: 'REAL' },
      { name: 'final_payment', type: 'REAL' },
      { name: 'final_payment_date', type: 'TEXT' },
      { name: 'payment_status', type: 'TEXT DEFAULT "deposit_only"' }
    ];

    bodiesNewColumns.forEach(column => {
      if (!columnNames.includes(column.name)) {
        db.run(`ALTER TABLE doll_bodies ADD COLUMN ${column.name} ${column.type}`, (err) => {
          if (err) {
            console.error(`添加doll_bodies表${column.name}字段失败:`, err);
          } else {
            console.log(`成功添加doll_bodies表${column.name}字段`);
          }
        });
      }
    });
  });

  // 检查photos表的列
  db.all("PRAGMA table_info(photos)", [], (err, columns) => {
    if (err) {
      console.error('获取photos表信息失败:', err);
      return;
    }
    
    const columnNames = columns.map(col => col.name);
    
    // 添加新字段到photos表
    const photosNewColumns = [
      { name: 'image_position_x', type: 'REAL DEFAULT 50' },
      { name: 'image_position_y', type: 'REAL DEFAULT 50' },
      { name: 'image_scale', type: 'REAL DEFAULT 100' }
    ];

    photosNewColumns.forEach(column => {
      if (!columnNames.includes(column.name)) {
        db.run(`ALTER TABLE photos ADD COLUMN ${column.name} ${column.type}`, (err) => {
          if (err) {
            console.error(`添加photos表${column.name}字段失败:`, err);
          } else {
            console.log(`成功添加photos表${column.name}字段`);
          }
        });
      }
    });
  });

  // 检查wardrobe_items表的列
  db.all("PRAGMA table_info(wardrobe_items)", [], (err, columns) => {
    if (err) {
      console.error('获取wardrobe_items表信息失败:', err);
      return;
    }
    
    const columnNames = columns.map(col => col.name);
    
    // 检查并添加sizes字段
    if (!columnNames.includes('sizes')) {
      db.run("ALTER TABLE wardrobe_items ADD COLUMN sizes TEXT", (err) => {
        if (err) {
          console.error('添加wardrobe_items表sizes字段失败:', err);
        } else {
          console.log('成功添加wardrobe_items表sizes字段');
        }
      });
    }

    // 检查并添加is_overdue字段
    if (!columnNames.includes('is_overdue')) {
      db.run("ALTER TABLE wardrobe_items ADD COLUMN is_overdue BOOLEAN DEFAULT 0", (err) => {
        if (err) {
          console.error('添加wardrobe_items表is_overdue字段失败:', err);
        } else {
          console.log('成功添加wardrobe_items表is_overdue字段');
        }
      });
    }
    
    // 检查并添加payment_status字段
    if (!columnNames.includes('payment_status')) {
      db.run("ALTER TABLE wardrobe_items ADD COLUMN payment_status TEXT DEFAULT 'deposit_only'", (err) => {
        if (err) {
          console.error('添加wardrobe_items表payment_status字段失败:', err);
        } else {
          console.log('成功添加wardrobe_items表payment_status字段');
        }
      });
    }
    
    // 检查并添加图片位置字段
    if (!columnNames.includes('image_position_x')) {
      db.run("ALTER TABLE wardrobe_items ADD COLUMN image_position_x REAL DEFAULT 50", (err) => {
        if (err) {
          console.error('添加wardrobe_items表image_position_x字段失败:', err);
        } else {
          console.log('成功添加wardrobe_items表image_position_x字段');
        }
      });
    }
    
    if (!columnNames.includes('image_position_y')) {
      db.run("ALTER TABLE wardrobe_items ADD COLUMN image_position_y REAL DEFAULT 50", (err) => {
        if (err) {
          console.error('添加wardrobe_items表image_position_y字段失败:', err);
        } else {
          console.log('成功添加wardrobe_items表image_position_y字段');
        }
      });
    }
    
    if (!columnNames.includes('image_scale')) {
      db.run("ALTER TABLE wardrobe_items ADD COLUMN image_scale REAL DEFAULT 100", (err) => {
        if (err) {
          console.error('添加wardrobe_items表image_scale字段失败:', err);
        } else {
          console.log('成功添加wardrobe_items表image_scale字段');
        }
      });
    }
  });
}
*/

// ==================== 认证相关路由 ====================

// 注册路由
app.post('/api/auth/register', async (req, res) => {
  const { username, password } = req.body;
  
  if (!username || !password) {
    return res.status(400).json({ error: '用户名和密码不能为空' });
  }

  if (password.length < 6) {
    return res.status(400).json({ error: '密码长度至少6位' });
  }

  try {
    const result = await auth.register(username, password);
    if (result.success) {
      const loginResult = await auth.login(username, password);
      res.json({
        token: loginResult.token,
        user: { id: result.userId, username: username }
      });
    } else {
      res.status(400).json({ error: result.error });
    }
  } catch (error) {
    console.error('注册失败:', error);
    res.status(500).json({ error: '注册失败' });
  }
});

// 登录路由
app.post('/api/auth/login', async (req, res) => {
  const { username, password } = req.body;
  
  if (!username || !password) {
    return res.status(400).json({ error: '用户名和密码不能为空' });
  }

  try {
    const result = await auth.login(username, password);
    if (result.success) {
      res.json({
        token: result.token,
        user: { id: result.userId, username: username }
      });
    } else {
      res.status(401).json({ error: result.error });
    }
  } catch (error) {
    console.error('登录失败:', error);
    res.status(500).json({ error: '登录失败' });
  }
});

// 验证token路由
app.get('/api/auth/verify', auth.authMiddleware, (req, res) => {
  res.json({ valid: true, userId: req.userId });
});

// 修改用户名
app.put('/api/auth/change-username', auth.authMiddleware, async (req, res) => {
  const { newUsername } = req.body;
  
  if (!newUsername || newUsername.trim() === '') {
    return res.status(400).json({ error: '用户名不能为空' });
  }
  
  try {
    const result = await auth.changeUsername(req.userId, newUsername.trim());
    res.json(result);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

// ==================== 需要认证的API路由 ====================
// 从这里开始，所有路由都需要认证

// 娃娃统计API
app.get('/api/dolls/stats', auth.authMiddleware, (req, res) => {
  const userId = req.userId;
  // 获取所有娃头数据
  db.all('SELECT * FROM doll_heads WHERE user_id = ?', [userId], (err, heads) => {
    if (err) {
      res.status(500).json({ error: err.message });
      return;
    }
    
    // 获取所有娃体数据
    db.all('SELECT * FROM doll_bodies WHERE user_id = ?', [userId], (err, bodies) => {
      if (err) {
        res.status(500).json({ error: err.message });
        return;
      }
      
      // 获取妆费统计
      Promise.all([
        new Promise((resolve, reject) => {
          db.all('SELECT makeup_fee FROM head_makeup_history WHERE makeup_fee IS NOT NULL', [], (err, rows) => {
            if (err) reject(err);
            else resolve(rows.map(r => r.makeup_fee || 0));
          });
        }),
        new Promise((resolve, reject) => {
          db.all('SELECT makeup_fee FROM head_current_makeup WHERE makeup_fee IS NOT NULL', [], (err, rows) => {
            if (err) reject(err);
            else resolve(rows.map(r => r.makeup_fee || 0));
          });
        }),
        new Promise((resolve, reject) => {
          db.all('SELECT makeup_fee FROM head_makeup_appointments WHERE makeup_fee IS NOT NULL', [], (err, rows) => {
            if (err) reject(err);
            else resolve(rows.map(r => r.makeup_fee || 0));
          });
        }),
        new Promise((resolve, reject) => {
          db.all('SELECT makeup_fee FROM body_makeup WHERE makeup_fee IS NOT NULL', [], (err, rows) => {
            if (err) reject(err);
            else resolve(rows.map(r => r.makeup_fee || 0));
          });
        })
      ]).then(([headHistory, headCurrent, headAppointments, bodyMakeup]) => {
        
        const allDolls = [
          ...heads.map(h => ({ ...h, type: 'head' })),
          ...bodies.map(b => ({ ...b, type: 'body' }))
        ];
        
        // 计算妆费统计
        const makeupStats = {
          total_makeup_cost: [...headHistory, ...headCurrent, ...headAppointments, ...bodyMakeup].reduce((sum, fee) => sum + fee, 0),
          total_makeup_count: [...headHistory, ...headCurrent, ...headAppointments, ...bodyMakeup].length,
          head_history_cost: headHistory.reduce((sum, fee) => sum + fee, 0),
          head_current_cost: headCurrent.reduce((sum, fee) => sum + fee, 0),
          head_appointment_cost: headAppointments.reduce((sum, fee) => sum + fee, 0),
          body_makeup_cost: bodyMakeup.reduce((sum, fee) => sum + fee, 0)
        };
        
        // 计算总统计
        const totalStats = {
          total_count: allDolls.length,
          owned_count: allDolls.filter(d => d.ownership_status === 'owned').length,
          preorder_count: allDolls.filter(d => d.ownership_status === 'preorder' || d.ownership_status === 'wishlist').length,
          total_amount: allDolls.reduce((sum, d) => sum + (d.total_price || d.actual_price || d.original_price || 0), 0),
          total_amount_owned: allDolls.filter(d => d.ownership_status === 'owned').reduce((sum, d) => sum + (d.actual_price || d.original_price || 0), 0),
          total_amount_preorder: allDolls.filter(d => d.ownership_status === 'preorder' || d.ownership_status === 'wishlist').reduce((sum, d) => sum + (d.total_price || 0), 0),
          total_paid: allDolls.reduce((sum, d) => sum + (d.deposit || 0), 0),
          total_remaining: allDolls.reduce((sum, d) => sum + (d.final_payment || 0), 0),
          ...makeupStats
        };
      
        // 按类型分组统计
        const typeStats = {
          head: {
            total_count: heads.length,
            owned_count: heads.filter(h => h.ownership_status === 'owned').length,
            preorder_count: heads.filter(h => h.ownership_status === 'preorder' || h.ownership_status === 'wishlist').length,
            total_amount: heads.reduce((sum, h) => sum + (h.total_price || h.actual_price || h.original_price || 0), 0),
            total_amount_owned: heads.filter(h => h.ownership_status === 'owned').reduce((sum, h) => sum + (h.actual_price || h.original_price || 0), 0),
            total_amount_preorder: heads.filter(h => h.ownership_status === 'preorder' || h.ownership_status === 'wishlist').reduce((sum, h) => sum + (h.total_price || 0), 0),
            total_paid: heads.reduce((sum, h) => sum + (h.deposit || 0), 0),
            total_remaining: heads.reduce((sum, h) => sum + (h.final_payment || 0), 0)
          },
          body: {
            total_count: bodies.length,
            owned_count: bodies.filter(b => b.ownership_status === 'owned').length,
            preorder_count: bodies.filter(b => b.ownership_status === 'preorder' || b.ownership_status === 'wishlist').length,
            total_amount: bodies.reduce((sum, b) => sum + (b.total_price || b.actual_price || b.original_price || 0), 0),
            total_amount_owned: bodies.filter(b => b.ownership_status === 'owned').reduce((sum, b) => sum + (b.actual_price || b.original_price || 0), 0),
            total_amount_preorder: bodies.filter(b => b.ownership_status === 'preorder' || b.ownership_status === 'wishlist').reduce((sum, b) => sum + (b.total_price || 0), 0),
            total_paid: bodies.reduce((sum, b) => sum + (b.deposit || 0), 0),
            total_remaining: bodies.reduce((sum, b) => sum + (b.final_payment || 0), 0)
          }
        };
        
        // 按尺寸分组统计
        const sizeStats = {};
        allDolls.forEach(doll => {
          const size = doll.size_category || '未分类';
          if (!sizeStats[size]) {
            sizeStats[size] = {
              total_count: 0,
              owned_count: 0,
              preorder_count: 0,
              total_amount: 0,
              total_amount_owned: 0,
              total_amount_preorder: 0,
              total_paid: 0,
              total_remaining: 0
            };
          }
          
          sizeStats[size].total_count++;
          if (doll.ownership_status === 'owned') {
            sizeStats[size].owned_count++;
            sizeStats[size].total_amount_owned += (doll.actual_price || doll.original_price || 0);
          } else if (doll.ownership_status === 'preorder' || doll.ownership_status === 'wishlist') {
            sizeStats[size].preorder_count++;
            sizeStats[size].total_amount_preorder += (doll.total_price || 0);
          }
          
          sizeStats[size].total_amount += (doll.total_price || doll.actual_price || doll.original_price || 0);
          sizeStats[size].total_paid += (doll.deposit || 0);
          sizeStats[size].total_remaining += (doll.final_payment || 0);
        });
        
        res.json({
          total: totalStats,
          byType: typeStats,
          bySize: sizeStats,
          makeup: makeupStats
        });
        
      }).catch(error => {
        console.error('获取妆费统计失败:', error);
        res.status(500).json({ error: error.message });
      });
    });
  });
});

// 文件上传API
app.post('/api/upload', auth.authMiddleware, upload.single('image'), (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: '没有上传文件' });
    }
    
    const imageUrl = `/uploads/${req.file.filename}`;
    res.json({
      message: '文件上传成功',
      imageUrl: imageUrl,
      filename: req.file.filename
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// 删除文件API
app.delete('/api/upload/:filename', auth.authMiddleware, (req, res) => {
  const filename = req.params.filename;
  const filePath = path.join(__dirname, 'uploads', filename);
  
  fs.unlink(filePath, (err) => {
    if (err) {
      console.error('删除文件失败:', err);
      return res.status(500).json({ error: '删除文件失败' });
    }
    res.json({ message: '文件删除成功' });
  });
});

// 其他API路由保持简化版本
app.get('/api/doll-heads', auth.authMiddleware, (req, res) => {
  const userId = req.userId;
  db.all('SELECT * FROM doll_heads WHERE user_id = ? ORDER BY sort_order ASC, created_at ASC', [userId], (err, rows) => {
    if (err) {
      res.status(500).json({ error: err.message });
      return;
    }
    res.json(rows);
  });
});

app.post('/api/doll-heads', auth.authMiddleware, (req, res) => {
  const userId = req.userId;
  const { 
    name, company, skin_tone, head_circumference, size_category,
    original_price, actual_price, total_price, deposit, final_payment, final_payment_date,
    release_date, received_date, 
    purchase_channel, ownership_status, 
    profile_image_url,
    image_position_x, image_position_y, image_scale
  } = req.body;
  
  if (!name) {
    return res.status(400).json({ error: 'Name is required' });
  }

  const sql = `INSERT INTO doll_heads (
    name, company, skin_tone, head_circumference, size_category,
    original_price, actual_price, total_price, deposit, final_payment, final_payment_date,
    release_date, received_date, 
    purchase_channel, ownership_status, 
    profile_image_url,
    image_position_x, image_position_y, image_scale,
    user_id
  ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`;
  
  const params = [
    name, company, skin_tone, head_circumference, size_category,
    original_price, actual_price, total_price, deposit, final_payment, final_payment_date,
    release_date, received_date, 
    purchase_channel, ownership_status || 'owned', 
    profile_image_url,
    image_position_x || 50, image_position_y || 50, image_scale || 100,
    userId
  ];
  
  db.run(sql, params, function(err) {
    if (err) {
      res.status(500).json({ error: err.message });
      return;
    }
    res.json({
      message: 'Doll head added successfully',
      id: this.lastID
    });
  });
});

app.put('/api/doll-heads/:id', auth.authMiddleware, (req, res) => {
  const userId = req.userId;
  const { 
    name, company, skin_tone, head_circumference, size_category,
    original_price, actual_price, total_price, deposit, final_payment, final_payment_date,
    release_date, received_date, 
    purchase_channel, ownership_status, 
    profile_image_url,
    image_position_x, image_position_y, image_scale
  } = req.body;
  const id = req.params.id;
  
  if (!name) {
    return res.status(400).json({ error: 'Name is required' });
  }

  const sql = `UPDATE doll_heads SET 
    name = ?, company = ?, skin_tone = ?, head_circumference = ?, size_category = ?,
    original_price = ?, actual_price = ?, total_price = ?, deposit = ?, final_payment = ?, final_payment_date = ?,
    release_date = ?, received_date = ?, 
    purchase_channel = ?, ownership_status = ?, 
    profile_image_url = ?,
    image_position_x = ?, image_position_y = ?, image_scale = ?
    WHERE id = ? AND user_id = ?`;
    
  const params = [
    name, company, skin_tone, head_circumference, size_category,
    original_price, actual_price, total_price, deposit, final_payment, final_payment_date,
    release_date, received_date, 
    purchase_channel, ownership_status || 'owned', 
    profile_image_url,
    image_position_x || 50, image_position_y || 50, image_scale || 100, id, userId
  ];
  
  db.run(sql, params, function(err) {
    if (err) {
      res.status(500).json({ error: err.message });
      return;
    }
    if (this.changes === 0) {
      res.status(404).json({ error: 'Doll head not found' });
    } else {
      res.json({ message: 'Doll head updated successfully' });
    }
  });
});

app.delete('/api/doll-heads/:id', auth.authMiddleware, (req, res) => {
  const userId = req.userId;
  const sql = 'DELETE FROM doll_heads WHERE id = ? AND user_id = ?';
  const params = [req.params.id, userId];
  
  db.run(sql, params, function(err) {
    if (err) {
      res.status(500).json({ error: err.message });
      return;
    }
    if (this.changes === 0) {
      res.status(404).json({ error: 'Doll head not found' });
    } else {
      res.json({ message: 'Doll head deleted successfully' });
    }
  });
});

app.get('/api/doll-bodies', auth.authMiddleware, (req, res) => {
  const userId = req.userId;
  db.all('SELECT * FROM doll_bodies WHERE user_id = ? ORDER BY sort_order ASC, created_at ASC', [userId], (err, rows) => {
    if (err) {
      res.status(500).json({ error: err.message });
      return;
    }
    res.json(rows);
  });
});

app.post('/api/doll-bodies', auth.authMiddleware, (req, res) => {
  const userId = req.userId;
  const { 
    name, company, skin_tone, head_circumference, size_category,
    neck_circumference, shoulder_width,
    original_price, actual_price, total_price, deposit, final_payment, final_payment_date,
    release_date, received_date, 
    purchase_channel, ownership_status, 
    profile_image_url,
    image_position_x, image_position_y, image_scale
  } = req.body;
  
  if (!name) {
    return res.status(400).json({ error: 'Name is required' });
  }

  const sql = `INSERT INTO doll_bodies (
    name, company, skin_tone, head_circumference, size_category,
    neck_circumference, shoulder_width,
    original_price, actual_price, total_price, deposit, final_payment, final_payment_date,
    release_date, received_date, 
    purchase_channel, ownership_status, 
    profile_image_url,
    image_position_x, image_position_y, image_scale,
    user_id
  ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`;
  
  const params = [
    name, company, skin_tone, head_circumference, size_category,
    neck_circumference, shoulder_width,
    original_price, actual_price, total_price, deposit, final_payment, final_payment_date,
    release_date, received_date, 
    purchase_channel, ownership_status || 'owned', 
    profile_image_url,
    image_position_x || 50, image_position_y || 50, image_scale || 100,
    userId
  ];
  
  db.run(sql, params, function(err) {
    if (err) {
      res.status(500).json({ error: err.message });
      return;
    }
    res.json({
      message: 'Doll body added successfully',
      id: this.lastID
    });
  });
});

app.put('/api/doll-bodies/:id', auth.authMiddleware, (req, res) => {
  const userId = req.userId;
  const { 
    name, company, skin_tone, head_circumference, size_category,
    neck_circumference, shoulder_width,
    original_price, actual_price, total_price, deposit, final_payment, final_payment_date,
    release_date, received_date, 
    purchase_channel, ownership_status, 
    profile_image_url,
    image_position_x, image_position_y, image_scale
  } = req.body;
  const id = req.params.id;
  
  if (!name) {
    return res.status(400).json({ error: 'Name is required' });
  }

  const sql = `UPDATE doll_bodies SET 
    name = ?, company = ?, skin_tone = ?, head_circumference = ?, size_category = ?,
    neck_circumference = ?, shoulder_width = ?,
    original_price = ?, actual_price = ?, total_price = ?, deposit = ?, final_payment = ?, final_payment_date = ?,
    release_date = ?, received_date = ?, 
    purchase_channel = ?, ownership_status = ?, 
    profile_image_url = ?,
    image_position_x = ?, image_position_y = ?, image_scale = ?
    WHERE id = ?`;
    
  const params = [
    name, company, skin_tone, head_circumference, size_category,
    neck_circumference, shoulder_width,
    original_price, actual_price, total_price, deposit, final_payment, final_payment_date,
    release_date, received_date, 
    purchase_channel, ownership_status || 'owned', 
    profile_image_url,
    image_position_x || 50, image_position_y || 50, image_scale || 100, id
  ];
  
  db.run(sql, params, function(err) {
    if (err) {
      res.status(500).json({ error: err.message });
      return;
    }
    if (this.changes === 0) {
      res.status(404).json({ error: 'Doll body not found' });
    } else {
      res.json({ message: 'Doll body updated successfully' });
    }
  });
});

app.delete('/api/doll-bodies/:id', auth.authMiddleware, (req, res) => {
  const userId = req.userId;
  const sql = 'DELETE FROM doll_bodies WHERE id = ?';
  const params = [req.params.id];
  
  db.run(sql, params, function(err) {
    if (err) {
      res.status(500).json({ error: err.message });
      return;
    }
    if (this.changes === 0) {
      res.status(404).json({ error: 'Doll body not found' });
    } else {
      res.json({ message: 'Doll body deleted successfully' });
    }
  });
});

// 娃头付款状态更新端点
app.put('/api/doll-heads/:id/payment-status', auth.authMiddleware, (req, res) => {
  const userId = req.userId;
  const id = req.params.id;
  const { payment_status } = req.body;
  
  const sql = `UPDATE doll_heads SET payment_status = ? WHERE id = ?`;
  
  db.run(sql, [payment_status, id], function(err) {
    if (err) {
      res.status(500).json({ error: err.message });
      return;
    }
    if (this.changes === 0) {
      res.status(404).json({ error: 'Doll head not found' });
    } else {
      res.json({ message: 'Payment status updated successfully' });
    }
  });
});

// 娃体付款状态更新端点
app.put('/api/doll-bodies/:id/payment-status', auth.authMiddleware, (req, res) => {
  const userId = req.userId;
  const id = req.params.id;
  const { payment_status } = req.body;
  
  const sql = `UPDATE doll_bodies SET payment_status = ? WHERE id = ?`;
  
  db.run(sql, [payment_status, id], function(err) {
    if (err) {
      res.status(500).json({ error: err.message });
      return;
    }
    if (this.changes === 0) {
      res.status(404).json({ error: 'Doll body not found' });
    } else {
      res.json({ message: 'Payment status updated successfully' });
    }
  });
});

// 娃头到货确认端点
app.put('/api/doll-heads/:id/confirm-arrival', auth.authMiddleware, (req, res) => {
  const userId = req.userId;
  const id = req.params.id;
  const { hasArrived } = req.body;
  
  // 只有选择"是"才更新为已到家
  if (hasArrived === true) {
    const sql = `UPDATE doll_heads SET ownership_status = 'owned' WHERE id = ? AND user_id = ?`;
    
    db.run(sql, [id, userId], function(err) {
      if (err) {
        res.status(500).json({ error: err.message });
        return;
      }
      if (this.changes === 0) {
        res.status(404).json({ error: 'Doll head not found' });
      } else {
        res.json({ message: 'Arrival confirmed successfully' });
      }
    });
  } else {
    // 选择"否"不做任何更改
    res.json({ message: 'Status unchanged' });
  }
});

// 娃体到货确认端点
app.put('/api/doll-bodies/:id/confirm-arrival', auth.authMiddleware, (req, res) => {
  const userId = req.userId;
  const id = req.params.id;
  const { hasArrived } = req.body;
  
  // 只有选择"是"才更新为已到家
  if (hasArrived === true) {
    const sql = `UPDATE doll_bodies SET ownership_status = 'owned' WHERE id = ? AND user_id = ?`;
    
    db.run(sql, [id, userId], function(err) {
      if (err) {
        res.status(500).json({ error: err.message });
        return;
      }
      if (this.changes === 0) {
        res.status(404).json({ error: 'Doll body not found' });
      } else {
        res.json({ message: 'Arrival confirmed successfully' });
      }
    });
  } else {
    // 选择"否"不做任何更改
    res.json({ message: 'Status unchanged' });
  }
});

// 妆容历史管理API
app.get('/api/makeup-history/:headId', auth.authMiddleware, (req, res) => {
  const userId = req.userId;
  const headId = req.params.headId;
  
  const sql = `SELECT hmh.*, ma.name as artist_name FROM head_makeup_history hmh
               LEFT JOIN makeup_artists ma ON hmh.makeup_artist_id = ma.id
               WHERE hmh.head_id = ? ORDER BY hmh.makeup_date DESC, hmh.created_at DESC`;
  
  db.all(sql, [headId], (err, rows) => {
    if (err) {
      res.status(500).json({ error: err.message });
      return;
    }
    res.json(rows);
  });
});

app.post('/api/makeup-history', auth.authMiddleware, (req, res) => {
  const userId = req.userId;
  const { head_id, makeup_artist_id, makeup_artist_name, makeup_fee, notes, makeup_date, removal_date, image_url } = req.body;
  
  if (!head_id) {
    return res.status(400).json({ error: 'Head ID is required' });
  }

  const sql = `INSERT INTO head_makeup_history 
               (head_id, makeup_artist_id, makeup_artist_name, makeup_fee, notes, makeup_date, removal_date, image_url) 
               VALUES (?, ?, ?, ?, ?, ?, ?, ?)`;
  
  const params = [head_id, makeup_artist_id, makeup_artist_name, makeup_fee, notes, makeup_date, removal_date, image_url];
  
  db.run(sql, params, function(err) {
    if (err) {
      res.status(500).json({ error: err.message });
      return;
    }
    res.json({
      message: 'Makeup history added successfully',
      id: this.lastID
    });
  });
});

app.put('/api/makeup-history/:id', auth.authMiddleware, (req, res) => {
  const userId = req.userId;
  const { head_id, makeup_artist_id, makeup_artist_name, makeup_fee, notes, makeup_date, removal_date, image_url } = req.body;
  const id = req.params.id;
  
  if (!head_id) {
    return res.status(400).json({ error: 'Head ID is required' });
  }

  const sql = `UPDATE head_makeup_history SET 
               head_id = ?, makeup_artist_id = ?, makeup_artist_name = ?, makeup_fee = ?, 
               notes = ?, makeup_date = ?, removal_date = ?, image_url = ?
               WHERE id = ?`;
  
  const params = [head_id, makeup_artist_id, makeup_artist_name, makeup_fee, notes, makeup_date, removal_date, image_url, id];
  
  db.run(sql, params, function(err) {
    if (err) {
      res.status(500).json({ error: err.message });
      return;
    }
    if (this.changes === 0) {
      res.status(404).json({ error: 'Makeup history not found' });
    } else {
      res.json({ message: 'Makeup history updated successfully' });
    }
  });
});

app.delete('/api/makeup-history/:id', auth.authMiddleware, (req, res) => {
  const userId = req.userId;
  const id = req.params.id;
  
  db.run('DELETE FROM head_makeup_history WHERE id = ?', [id], function(err) {
    if (err) {
      res.status(500).json({ error: err.message });
      return;
    }
    if (this.changes === 0) {
      res.status(404).json({ error: 'Makeup history not found' });
    } else {
      res.json({ message: 'Makeup history deleted successfully' });
    }
  });
});

// 当前妆容管理API
app.get('/api/current-makeup/:headId', auth.authMiddleware, (req, res) => {
  const userId = req.userId;
  const headId = req.params.headId;
  
  const sql = `SELECT hcm.*, ma.name as artist_name FROM head_current_makeup hcm
               LEFT JOIN makeup_artists ma ON hcm.makeup_artist_id = ma.id
               WHERE hcm.head_id = ?`;
  
  db.get(sql, [headId], (err, row) => {
    if (err) {
      res.status(500).json({ error: err.message });
      return;
    }
    if (!row) {
      res.status(404).json({ error: 'No current makeup found' });
      return;
    }
    res.json(row);
  });
});

app.post('/api/current-makeup', auth.authMiddleware, (req, res) => {
  const userId = req.userId;
  const { head_id, makeup_artist_id, makeup_artist_name, makeup_fee, notes, makeup_date, image_url, from_history_id } = req.body;
  
  if (!head_id || !makeup_date) {
    return res.status(400).json({ error: 'Head ID and makeup date are required' });
  }

  // 先删除现有的当前妆容（如果存在）
  db.run('DELETE FROM head_current_makeup WHERE head_id = ?', [head_id], (err) => {
    if (err) {
      console.error('Error clearing existing current makeup:', err);
    }
  });

  const sql = `INSERT INTO head_current_makeup 
               (head_id, makeup_artist_id, makeup_artist_name, makeup_fee, notes, makeup_date, image_url, from_history_id) 
               VALUES (?, ?, ?, ?, ?, ?, ?, ?)`;
  
  const params = [head_id, makeup_artist_id, makeup_artist_name, makeup_fee, notes, makeup_date, image_url, from_history_id];
  
  db.run(sql, params, function(err) {
    if (err) {
      res.status(500).json({ error: err.message });
      return;
    }
    res.json({
      message: 'Current makeup set successfully',
      id: this.lastID
    });
  });
});

app.delete('/api/current-makeup/:headId', auth.authMiddleware, (req, res) => {
  const userId = req.userId;
  const headId = req.params.headId;
  
  db.run('DELETE FROM head_current_makeup WHERE head_id = ?', [headId], function(err) {
    if (err) {
      res.status(500).json({ error: err.message });
      return;
    }
    if (this.changes === 0) {
      res.status(404).json({ error: 'No current makeup found' });
    } else {
      res.json({ message: 'Current makeup cleared successfully' });
    }
  });
});

// 约妆管理API
app.get('/api/makeup-appointment/:headId', auth.authMiddleware, (req, res) => {
  const userId = req.userId;
  const headId = req.params.headId;
  
  const sql = `SELECT hma.*, ma.name as artist_name FROM head_makeup_appointments hma
               LEFT JOIN makeup_artists ma ON hma.makeup_artist_id = ma.id
               WHERE hma.head_id = ?`;
  
  db.get(sql, [headId], (err, row) => {
    if (err) {
      res.status(500).json({ error: err.message });
      return;
    }
    if (!row) {
      res.status(404).json({ error: 'No appointment found' });
      return;
    }
    res.json(row);
  });
});

app.post('/api/makeup-appointment', auth.authMiddleware, (req, res) => {
  const userId = req.userId;
  const { head_id, makeup_artist_id, makeup_artist_name, makeup_fee, notes, expected_arrival } = req.body;
  
  if (!head_id) {
    return res.status(400).json({ error: 'Head ID is required' });
  }

  // 先删除现有约妆（如果存在）
  db.run('DELETE FROM head_makeup_appointments WHERE head_id = ?', [head_id], (err) => {
    if (err) {
      console.error('Error clearing existing appointment:', err);
    }
  });

  const sql = `INSERT INTO head_makeup_appointments 
               (head_id, makeup_artist_id, makeup_artist_name, makeup_fee, notes, expected_arrival) 
               VALUES (?, ?, ?, ?, ?, ?)`;
  
  const params = [head_id, makeup_artist_id, makeup_artist_name, makeup_fee, notes, expected_arrival];
  
  db.run(sql, params, function(err) {
    if (err) {
      res.status(500).json({ error: err.message });
      return;
    }
    res.json({
      message: 'Appointment set successfully',
      id: this.lastID
    });
  });
});

app.delete('/api/makeup-appointment/:headId', auth.authMiddleware, (req, res) => {
  const userId = req.userId;
  const headId = req.params.headId;
  
  db.run('DELETE FROM head_makeup_appointments WHERE head_id = ?', [headId], function(err) {
    if (err) {
      res.status(500).json({ error: err.message });
      return;
    }
    if (this.changes === 0) {
      res.status(404).json({ error: 'No appointment found' });
    } else {
      res.json({ message: 'Appointment cancelled successfully' });
    }
  });
});

// 获取所有约妆信息API
app.get('/api/makeup-appointments', auth.authMiddleware, (req, res) => {
  const userId = req.userId;
  const sql = `SELECT hma.*, ma.name as artist_name, dh.name as head_name, dh.company as head_company 
               FROM head_makeup_appointments hma
               LEFT JOIN makeup_artists ma ON hma.makeup_artist_id = ma.id
               LEFT JOIN doll_heads dh ON hma.head_id = dh.id
               ORDER BY hma.expected_arrival ASC, hma.created_at DESC`;
  
  db.all(sql, [], (err, rows) => {
    if (err) {
      res.status(500).json({ error: err.message });
      return;
    }
    res.json(rows);
  });
});

// 未约妆心仪妆师API
app.get('/api/unmade-preferences/:headId', auth.authMiddleware, (req, res) => {
  const userId = req.userId;
  const headId = req.params.headId;
  
  const sql = `SELECT hup.*, ma.name, ma.specialty, ma.price_range, ma.contact 
               FROM head_unmade_preferences hup
               JOIN makeup_artists ma ON hup.makeup_artist_id = ma.id
               WHERE hup.head_id = ?
               ORDER BY ma.is_favorite DESC, ma.sort_order ASC, ma.created_at DESC`;
  
  db.all(sql, [headId], (err, rows) => {
    if (err) {
      res.status(500).json({ error: err.message });
      return;
    }
    res.json(rows);
  });
});

app.post('/api/unmade-preferences', auth.authMiddleware, (req, res) => {
  const userId = req.userId;
  const { head_id, makeup_artist_id } = req.body;
  
  if (!head_id || !makeup_artist_id) {
    return res.status(400).json({ error: 'Head ID and makeup artist ID are required' });
  }

  const sql = `INSERT OR IGNORE INTO head_unmade_preferences (head_id, makeup_artist_id) VALUES (?, ?)`;
  
  db.run(sql, [head_id, makeup_artist_id], function(err) {
    if (err) {
      res.status(500).json({ error: err.message });
      return;
    }
    res.json({
      message: 'Preference added successfully',
      id: this.lastID
    });
  });
});

app.delete('/api/unmade-preferences/:headId/:artistId', auth.authMiddleware, (req, res) => {
  const userId = req.userId;
  const headId = req.params.headId;
  const artistId = req.params.artistId;
  
  db.run('DELETE FROM head_unmade_preferences WHERE head_id = ? AND makeup_artist_id = ?', [headId, artistId], function(err) {
    if (err) {
      res.status(500).json({ error: err.message });
      return;
    }
    res.json({ message: 'Preference removed successfully' });
  });
});

app.get('/api/makeup-artists', auth.authMiddleware, (req, res) => {
  const userId = req.userId;
  db.all('SELECT * FROM makeup_artists WHERE user_id = ? ORDER BY sort_order ASC, created_at DESC', [userId], (err, rows) => {
    if (err) {
      res.status(500).json({ error: err.message });
      return;
    }
    res.json(rows);
  });
});

app.post('/api/makeup-artists', auth.authMiddleware, (req, res) => {
  const userId = req.userId;
  const { name, contact, specialty, price_range, makeup_rules_image, note_template, is_favorite, when_available } = req.body;
  
  if (!name) {
    return res.status(400).json({ error: 'Name is required' });
  }

  const safeContact = contact || '';
  const safeSpecialty = specialty || '';
  const safePriceRange = price_range || '';
  const safeMakeupRulesImage = makeup_rules_image || '';
  const safeNoteTemplate = note_template || '';
  const safeWhenAvailable = when_available || '';
  const safeIsFavorite = is_favorite ? 1 : 0;

  const sql = `INSERT INTO makeup_artists (name, contact, specialty, price_range, makeup_rules_image, note_template, is_favorite, when_available, user_id) 
               VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`;
  const params = [name, safeContact, safeSpecialty, safePriceRange, safeMakeupRulesImage, safeNoteTemplate, safeIsFavorite, safeWhenAvailable, userId];
  
  db.run(sql, params, function(err) {
    if (err) {
      res.status(500).json({ error: err.message });
      return;
    }
    res.json({
      message: 'Makeup artist added successfully',
      id: this.lastID
    });
  });
});

app.put('/api/makeup-artists/:id', auth.authMiddleware, (req, res) => {
  const userId = req.userId;
  const { name, contact, specialty, price_range, makeup_rules_image, note_template, is_favorite, when_available } = req.body;
  const id = req.params.id;
  
  if (!name) {
    return res.status(400).json({ error: 'Name is required' });
  }

  const safeContact = contact || '';
  const safeSpecialty = specialty || '';
  const safePriceRange = price_range || '';
  const safeMakeupRulesImage = makeup_rules_image || '';
  const safeNoteTemplate = note_template || '';
  const safeWhenAvailable = when_available || '';
  const safeIsFavorite = is_favorite ? 1 : 0;

  const sql = `UPDATE makeup_artists SET 
               name = ?, contact = ?, specialty = ?, price_range = ?, 
               makeup_rules_image = ?, note_template = ?, is_favorite = ?, when_available = ?
               WHERE id = ? AND user_id = ?`;
  const params = [name, safeContact, safeSpecialty, safePriceRange, safeMakeupRulesImage, safeNoteTemplate, safeIsFavorite, safeWhenAvailable, id, userId];
  
  db.run(sql, params, function(err) {
    if (err) {
      res.status(500).json({ error: err.message });
      return;
    }
    if (this.changes === 0) {
      res.status(404).json({ error: 'Makeup artist not found' });
    } else {
      res.json({ message: 'Makeup artist updated successfully' });
    }
  });
});

app.delete('/api/makeup-artists/:id', auth.authMiddleware, (req, res) => {
  const userId = req.userId;
  const id = req.params.id;
  
  db.run('DELETE FROM makeup_artists WHERE id = ? AND user_id = ?', [id, userId], function(err) {
    if (err) {
      res.status(500).json({ error: err.message });
      return;
    }
    if (this.changes === 0) {
      res.status(404).json({ error: 'Makeup artist not found' });
    } else {
      res.json({ message: 'Makeup artist deleted successfully' });
    }
  });
});

app.post('/api/sort/makeup-artists', auth.authMiddleware, (req, res) => {
  const userId = req.userId;
  const { sortOrder } = req.body;
  
  if (!Array.isArray(sortOrder)) {
    return res.status(400).json({ error: 'sortOrder should be an array' });
  }

  let completed = 0;
  const total = sortOrder.length;
  
  if (total === 0) {
    return res.json({ message: 'No items to sort' });
  }

  sortOrder.forEach(({ id, order }, index) => {
    db.run('UPDATE makeup_artists SET sort_order = ? WHERE id = ?', [order, id], function(err) {
      if (err) {
        console.error('更新妆师排序失败:', err);
        return res.status(500).json({ error: err.message });
      }
      
      completed++;
      if (completed === total) {
        res.json({ message: 'Sort order updated successfully' });
      }
    });
  });
});

// 从约妆记录创建妆师卡片API
app.post('/api/makeup-artists/create-from-appointment', auth.authMiddleware, (req, res) => {
  const userId = req.userId;
  const { appointment_id } = req.body;
  
  if (!appointment_id) {
    return res.status(400).json({ error: 'Appointment ID is required' });
  }
  
  // 先获取约妆记录的信息
  db.get(`
    SELECT 
      makeup_artist_name,
      notes,
      makeup_fee,
      created_at as appointment_date
    FROM head_makeup_appointments 
    WHERE id = ?
  `, [appointment_id], (err, appointment) => {
    if (err) {
      return res.status(500).json({ error: err.message });
    }
    
    if (!appointment) {
      return res.status(404).json({ error: 'Appointment not found' });
    }
    
    // 检查是否已存在同名妆师
    db.get(`
      SELECT id, name FROM makeup_artists 
      WHERE name = ?
    `, [appointment.makeup_artist_name], (err, existingArtist) => {
      if (err) {
        return res.status(500).json({ error: err.message });
      }
      
      if (existingArtist) {
        // 如果妆师已存在，返回妆师信息
        return res.json({ 
          message: 'Artist already exists',
          artist: existingArtist,
          existed: true
        });
      }
      
      // 创建新妆师卡片
      // 尝试从备注中提取价格范围信息
      let priceRange = '';
      if (appointment.makeup_fee) {
        priceRange = `参考价格: ¥${appointment.makeup_fee}`;
      }
      
      // 获取最大排序值
      db.get('SELECT MAX(sort_order) as maxOrder FROM makeup_artists', [], (err, row) => {
        const nextOrder = (row?.maxOrder || 0) + 1;
        
        const sql = `INSERT INTO makeup_artists 
                     (name, contact, specialty, price_range, note_template, is_favorite, when_available, sort_order) 
                     VALUES (?, ?, ?, ?, ?, ?, ?, ?)`;
        
        const params = [
          appointment.makeup_artist_name,
          '', // 联系方式留空，用户可以后续补充
          '', // 专长留空
          priceRange,
          appointment.notes || '', // 使用约妆备注作为初始模板
          0, // 默认不是收藏
          '', // 可约时间留空
          nextOrder
        ];
        
        db.run(sql, params, function(err) {
          if (err) {
            return res.status(500).json({ error: err.message });
          }
          
          res.json({
            message: 'Artist created successfully',
            artist: {
              id: this.lastID,
              name: appointment.makeup_artist_name
            },
            created: true
          });
        });
      });
    });
  });
});

// 娃体妆容管理API
app.get('/api/body-makeup/:bodyId', auth.authMiddleware, (req, res) => {
  const userId = req.userId;
  const bodyId = req.params.bodyId;
  
  const sql = `SELECT bm.*, ma.name as artist_name FROM body_makeup bm
               LEFT JOIN makeup_artists ma ON bm.makeup_artist_id = ma.id
               WHERE bm.body_id = ?`;
  
  db.get(sql, [bodyId], (err, row) => {
    if (err) {
      res.status(500).json({ error: err.message });
      return;
    }
    if (!row) {
      res.status(404).json({ error: 'No body makeup found' });
      return;
    }
    res.json(row);
  });
});

app.post('/api/body-makeup', auth.authMiddleware, (req, res) => {
  const userId = req.userId;
  const { body_id, makeup_artist_id, makeup_artist_name, makeup_fee, makeup_date, image_url } = req.body;
  
  if (!body_id) {
    return res.status(400).json({ error: 'Body ID is required' });
  }

  // 先删除现有的娃体妆容（如果存在）
  db.run('DELETE FROM body_makeup WHERE body_id = ?', [body_id], (err) => {
    if (err) {
      console.error('Error clearing existing body makeup:', err);
    }
  });

  const sql = `INSERT INTO body_makeup 
               (body_id, makeup_artist_id, makeup_artist_name, makeup_fee, makeup_date, image_url) 
               VALUES (?, ?, ?, ?, ?, ?)`;
  
  const params = [body_id, makeup_artist_id, makeup_artist_name, makeup_fee, makeup_date, image_url];
  
  db.run(sql, params, function(err) {
    if (err) {
      res.status(500).json({ error: err.message });
      return;
    }
    res.json({
      message: 'Body makeup added successfully',
      id: this.lastID
    });
  });
});

app.put('/api/body-makeup/:bodyId', auth.authMiddleware, (req, res) => {
  const userId = req.userId;
  const { body_id, makeup_artist_id, makeup_artist_name, makeup_fee, makeup_date, image_url } = req.body;
  const bodyId = req.params.bodyId;
  
  if (!body_id) {
    return res.status(400).json({ error: 'Body ID is required' });
  }

  const sql = `UPDATE body_makeup SET 
               body_id = ?, makeup_artist_id = ?, makeup_artist_name = ?, 
               makeup_fee = ?, makeup_date = ?, image_url = ?
               WHERE body_id = ?`;
  
  const params = [body_id, makeup_artist_id, makeup_artist_name, makeup_fee, makeup_date, image_url, bodyId];
  
  db.run(sql, params, function(err) {
    if (err) {
      res.status(500).json({ error: err.message });
      return;
    }
    if (this.changes === 0) {
      res.status(404).json({ error: 'Body makeup not found' });
    } else {
      res.json({ message: 'Body makeup updated successfully' });
    }
  });
});

app.delete('/api/body-makeup/:bodyId', auth.authMiddleware, (req, res) => {
  const userId = req.userId;
  const bodyId = req.params.bodyId;
  
  db.run('DELETE FROM body_makeup WHERE body_id = ?', [bodyId], function(err) {
    if (err) {
      res.status(500).json({ error: err.message });
      return;
    }
    if (this.changes === 0) {
      res.status(404).json({ error: 'Body makeup not found' });
    } else {
      res.json({ message: 'Body makeup deleted successfully' });
    }
  });
});

// 衣柜相关API
app.get('/api/wardrobe/:category', auth.authMiddleware, (req, res) => {
  const userId = req.userId;
  const category = req.params.category;
  const sql = 'SELECT * FROM wardrobe_items WHERE category = ? AND user_id = ? ORDER BY sort_order ASC, created_at ASC';
  
  db.all(sql, [category, userId], (err, rows) => {
    if (err) {
      res.status(500).json({ error: err.message });
      return;
    }
    res.json(rows);
  });
});

app.post('/api/wardrobe', auth.authMiddleware, (req, res) => {
  const userId = req.userId;
  const { name, category, brand, platform, ownership_status, total_price, deposit, final_payment, final_payment_date, profile_image_url, sizes, image_position_x, image_position_y, image_scale } = req.body;
  
  if (!name || !category) {
    return res.status(400).json({ error: 'Name and category are required' });
  }

  const sql = `INSERT INTO wardrobe_items 
               (name, category, brand, platform, ownership_status, total_price, deposit, final_payment, final_payment_date, profile_image_url, sizes, image_position_x, image_position_y, image_scale, user_id) 
               VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`;
  
  // 将sizes数组转换为JSON字符串
  const sizesJson = sizes && Array.isArray(sizes) ? JSON.stringify(sizes) : (sizes || null);
  const params = [name, category, brand, platform, ownership_status || 'owned', total_price, deposit, final_payment, final_payment_date, profile_image_url, sizesJson, image_position_x || 50, image_position_y || 50, image_scale || 100, userId];
  
  db.run(sql, params, function(err) {
    if (err) {
      res.status(500).json({ error: err.message });
      return;
    }
    res.json({
      message: 'Wardrobe item added successfully',
      id: this.lastID
    });
  });
});

app.put('/api/wardrobe/:id', auth.authMiddleware, (req, res) => {
  const userId = req.userId;
  const { name, category, brand, platform, ownership_status, total_price, deposit, final_payment, final_payment_date, profile_image_url, sizes, image_position_x, image_position_y, image_scale } = req.body;
  const id = req.params.id;
  
  if (!name || !category) {
    return res.status(400).json({ error: 'Name and category are required' });
  }

  const sql = `UPDATE wardrobe_items SET 
               name = ?, category = ?, brand = ?, platform = ?, ownership_status = ?, 
               total_price = ?, deposit = ?, final_payment = ?, final_payment_date = ?, 
               profile_image_url = ?, sizes = ?, image_position_x = ?, image_position_y = ?, image_scale = ?
               WHERE id = ? AND user_id = ?`;
  
  // 将sizes数组转换为JSON字符串
  console.log('更新wardrobe item - sizes数据:', sizes, 'type:', typeof sizes, 'isArray:', Array.isArray(sizes));
  const sizesJson = sizes && Array.isArray(sizes) ? JSON.stringify(sizes) : (sizes || null);
  console.log('转换后的sizesJson:', sizesJson);
  const params = [name, category, brand, platform, ownership_status || 'owned', total_price, deposit, final_payment, final_payment_date, profile_image_url, sizesJson, image_position_x || 50, image_position_y || 50, image_scale || 100, id, userId];
  
  db.run(sql, params, function(err) {
    if (err) {
      res.status(500).json({ error: err.message });
      return;
    }
    if (this.changes === 0) {
      res.status(404).json({ error: 'Wardrobe item not found' });
    } else {
      res.json({ message: 'Wardrobe item updated successfully' });
    }
  });
});

app.delete('/api/wardrobe/:id', auth.authMiddleware, (req, res) => {
  const userId = req.userId;
  const id = req.params.id;
  
  db.run('DELETE FROM wardrobe_items WHERE id = ? AND user_id = ?', [id, userId], function(err) {
    if (err) {
      res.status(500).json({ error: err.message });
      return;
    }
    if (this.changes === 0) {
      res.status(404).json({ error: 'Wardrobe item not found' });
    } else {
      res.json({ message: 'Wardrobe item deleted successfully' });
    }
  });
});

app.get('/api/wardrobe/search/:term', auth.authMiddleware, (req, res) => {
  const userId = req.userId;
  const term = req.params.term;
  const sql = `SELECT * FROM wardrobe_items 
               WHERE (name LIKE ? OR brand LIKE ? OR platform LIKE ?) AND user_id = ?
               ORDER BY sort_order ASC, created_at ASC`;
  
  const searchTerm = `%${term}%`;
  db.all(sql, [searchTerm, searchTerm, searchTerm, userId], (err, rows) => {
    if (err) {
      res.status(500).json({ error: err.message });
      return;
    }
    res.json(rows);
  });
});

// 娃柜搜索API
app.get('/api/dolls/search/:term', auth.authMiddleware, (req, res) => {
  const userId = req.userId;
  const term = req.params.term;
  const searchTerm = `%${term}%`;
  
  // 搜索娃头
  const headsSql = `SELECT *, 'head' as type FROM doll_heads 
                     WHERE (name LIKE ? OR company LIKE ? OR skin_tone LIKE ? 
                     OR purchase_channel LIKE ? OR size_category LIKE ?) AND user_id = ?
                     ORDER BY sort_order ASC, created_at ASC`;
  
  // 搜索娃体
  const bodiesSql = `SELECT *, 'body' as type FROM doll_bodies 
                      WHERE (name LIKE ? OR company LIKE ? OR skin_tone LIKE ? 
                      OR purchase_channel LIKE ? OR size_category LIKE ?) AND user_id = ?
                      ORDER BY sort_order ASC, created_at ASC`;
  
  const results = [];
  
  // 先查询娃头
  db.all(headsSql, [searchTerm, searchTerm, searchTerm, searchTerm, searchTerm, userId], (err, heads) => {
    if (err) {
      res.status(500).json({ error: err.message });
      return;
    }
    
    // 再查询娃体
    db.all(bodiesSql, [searchTerm, searchTerm, searchTerm, searchTerm, searchTerm, userId], (err, bodies) => {
      if (err) {
        res.status(500).json({ error: err.message });
        return;
      }
      
      // 合并结果
      const allResults = [...heads, ...bodies];
      res.json(allResults);
    });
  });
});

app.put('/api/wardrobe/:id/confirm-arrival', auth.authMiddleware, (req, res) => {
  const userId = req.userId;
  const id = req.params.id;
  const { hasArrived } = req.body;
  
  // 只有选择"是"才更新为已到家
  if (hasArrived === true) {
    const sql = `UPDATE wardrobe_items SET ownership_status = 'owned' WHERE id = ?`;
    
    db.run(sql, [id], function(err) {
      if (err) {
        res.status(500).json({ error: err.message });
        return;
      }
      if (this.changes === 0) {
        res.status(404).json({ error: 'Wardrobe item not found' });
      } else {
        res.json({ message: 'Arrival confirmed successfully' });
      }
    });
  } else {
    // 选择"否"不做任何更改
    res.json({ message: 'Status unchanged' });
  }
});

// 衣柜付款状态更新端点
app.put('/api/wardrobe/:id/payment-status', auth.authMiddleware, (req, res) => {
  const userId = req.userId;
  const id = req.params.id;
  const { payment_status } = req.body;
  
  const sql = `UPDATE wardrobe_items SET payment_status = ? WHERE id = ?`;
  
  db.run(sql, [payment_status, id], function(err) {
    if (err) {
      res.status(500).json({ error: err.message });
      return;
    }
    if (this.changes === 0) {
      res.status(404).json({ error: 'Wardrobe item not found' });
    } else {
      res.json({ message: 'Payment status updated successfully' });
    }
  });
});

app.get('/api/wardrobe/stats/brands', auth.authMiddleware, (req, res) => {
  const userId = req.userId;
  const sql = `SELECT brand, COUNT(*) as count FROM wardrobe_items 
               WHERE brand IS NOT NULL AND brand != '' 
               GROUP BY brand ORDER BY count DESC`;
  
  db.all(sql, [], (err, rows) => {
    if (err) {
      res.status(500).json({ error: err.message });
      return;
    }
    res.json(rows);
  });
});

app.get('/api/wardrobe/stats/sizes', auth.authMiddleware, (req, res) => {
  const userId = req.userId;
  const sql = `SELECT sizes, COUNT(*) as count FROM wardrobe_items 
               WHERE sizes IS NOT NULL AND sizes != '' 
               GROUP BY sizes ORDER BY count DESC`;
  
  db.all(sql, [], (err, rows) => {
    if (err) {
      res.status(500).json({ error: err.message });
      return;
    }
    res.json(rows);
  });
});

app.get('/api/wardrobe/stats/status', auth.authMiddleware, (req, res) => {
  const userId = req.userId;
  const sql = `SELECT ownership_status, COUNT(*) as count FROM wardrobe_items 
               GROUP BY ownership_status ORDER BY count DESC`;
  
  db.all(sql, [], (err, rows) => {
    if (err) {
      res.status(500).json({ error: err.message });
      return;
    }
    res.json(rows);
  });
});

app.post('/api/sort/wardrobe/:category', auth.authMiddleware, (req, res) => {
  const userId = req.userId;
  const { sortOrder } = req.body;
  const category = req.params.category;
  
  if (!Array.isArray(sortOrder)) {
    return res.status(400).json({ error: 'sortOrder should be an array' });
  }

  let completed = 0;
  const total = sortOrder.length;
  
  if (total === 0) {
    return res.json({ message: 'No items to sort' });
  }

  sortOrder.forEach(({ id, order }, index) => {
    db.run('UPDATE wardrobe_items SET sort_order = ? WHERE id = ?', [order, id], function(err) {
      if (err) {
        console.error('更新衣柜排序失败:', err);
        return res.status(500).json({ error: err.message });
      }
      
      completed++;
      if (completed === total) {
        res.json({ message: 'Sort order updated successfully' });
      }
    });
  });
});

// 排序API
app.post('/api/sort/doll-heads', auth.authMiddleware, (req, res) => {
  const userId = req.userId;
  const { sortOrder } = req.body;
  
  if (!Array.isArray(sortOrder)) {
    return res.status(400).json({ error: 'sortOrder should be an array' });
  }

  let completed = 0;
  const total = sortOrder.length;
  
  if (total === 0) {
    return res.json({ message: 'No items to sort' });
  }

  sortOrder.forEach(({ id, order }, index) => {
    db.run('UPDATE doll_heads SET sort_order = ? WHERE id = ?', [order, id], function(err) {
      if (err) {
        console.error('更新娃头排序失败:', err);
        return res.status(500).json({ error: err.message });
      }
      
      completed++;
      if (completed === total) {
        res.json({ message: 'Sort order updated successfully' });
      }
    });
  });
});

app.post('/api/sort/doll-bodies', auth.authMiddleware, (req, res) => {
  const userId = req.userId;
  const { sortOrder } = req.body;
  
  if (!Array.isArray(sortOrder)) {
    return res.status(400).json({ error: 'sortOrder should be an array' });
  }

  let completed = 0;
  const total = sortOrder.length;
  
  if (total === 0) {
    return res.json({ message: 'No items to sort' });
  }

  sortOrder.forEach(({ id, order }, index) => {
    db.run('UPDATE doll_bodies SET sort_order = ? WHERE id = ?', [order, id], function(err) {
      if (err) {
        console.error('更新娃体排序失败:', err);
        return res.status(500).json({ error: err.message });
      }
      
      completed++;
      if (completed === total) {
        res.json({ message: 'Sort order updated successfully' });
      }
    });
  });
});

// 照片管理API
app.get('/api/photos/:entityType/:entityId', auth.authMiddleware, (req, res) => {
  const userId = req.userId;
  const { entityType, entityId } = req.params;
  
  const sql = 'SELECT * FROM photos WHERE entity_type = ? AND entity_id = ? ORDER BY created_at ASC';
  db.all(sql, [entityType, entityId], (err, rows) => {
    if (err) {
      res.status(500).json({ error: err.message });
      return;
    }
    res.json(rows);
  });
});

app.post('/api/photos', auth.authMiddleware, (req, res) => {
  const userId = req.userId;
  const { entity_type, entity_id, photo_type, image_url, caption, is_cover } = req.body;
  
  if (!entity_type || !entity_id || !image_url) {
    return res.status(400).json({ error: 'Missing required fields' });
  }

  // 如果设为封面，先取消其他封面
  if (is_cover) {
    db.run('UPDATE photos SET is_cover = 0 WHERE entity_type = ? AND entity_id = ?', 
      [entity_type, entity_id], (err) => {
        if (err) {
          console.error('Error clearing cover:', err);
        }
      });
  }

  const sql = `INSERT INTO photos (entity_type, entity_id, photo_type, image_url, caption, is_cover) 
               VALUES (?, ?, ?, ?, ?, ?)`;
  const params = [entity_type, entity_id, photo_type || 'album', image_url, caption, is_cover || 0];
  
  db.run(sql, params, function(err) {
    if (err) {
      res.status(500).json({ error: err.message });
      return;
    }
    res.json({
      message: 'Photo added successfully',
      id: this.lastID
    });
  });
});

app.put('/api/photos/:id', auth.authMiddleware, (req, res) => {
  const userId = req.userId;
  const { entity_type, entity_id, photo_type, image_url, caption, is_cover } = req.body;
  const id = req.params.id;
  
  if (!entity_type || !entity_id || !image_url) {
    return res.status(400).json({ error: 'Missing required fields' });
  }

  // 如果设为封面，先取消其他封面
  if (is_cover) {
    db.run('UPDATE photos SET is_cover = 0 WHERE entity_type = ? AND entity_id = ? AND id != ?', 
      [entity_type, entity_id, id], (err) => {
        if (err) {
          console.error('Error clearing cover:', err);
        }
      });
  }

  const sql = `UPDATE photos SET 
               entity_type = ?, entity_id = ?, photo_type = ?, image_url = ?, 
               caption = ?, is_cover = ?
               WHERE id = ?`;
  const params = [entity_type, entity_id, photo_type || 'album', image_url, caption, is_cover || 0, id];
  
  db.run(sql, params, function(err) {
    if (err) {
      res.status(500).json({ error: err.message });
      return;
    }
    if (this.changes === 0) {
      res.status(404).json({ error: 'Photo not found' });
    } else {
      res.json({ message: 'Photo updated successfully' });
    }
  });
});

app.delete('/api/photos/:id', auth.authMiddleware, (req, res) => {
  const userId = req.userId;
  const id = req.params.id;
  
  db.run('DELETE FROM photos WHERE id = ?', [id], function(err) {
    if (err) {
      res.status(500).json({ error: err.message });
      return;
    }
    if (this.changes === 0) {
      res.status(404).json({ error: 'Photo not found' });
    } else {
      res.json({ message: 'Photo deleted successfully' });
    }
  });
});

// 综合花费统计API
app.get('/api/stats/total-expenses', auth.authMiddleware, async (req, res) => {
  const userId = req.userId;
  try {
    const stats = {
      dolls: { heads: 0, bodies: 0, total: 0 },
      makeup: { history: 0, current: 0, appointment: 0, body: 0, total: 0 },
      wardrobe: { total: 0 },
      grandTotal: 0,
      breakdown: [],
      monthlyTrend: []
    };

    // 娃柜花费统计
    const dollHeadsCost = await new Promise((resolve, reject) => {
      db.all('SELECT SUM(actual_price) as total FROM doll_heads WHERE actual_price IS NOT NULL', [], (err, rows) => {
        if (err) reject(err);
        else resolve(rows[0]?.total || 0);
      });
    });

    const dollBodiesCost = await new Promise((resolve, reject) => {
      db.all('SELECT SUM(actual_price) as total FROM doll_bodies WHERE actual_price IS NOT NULL', [], (err, rows) => {
        if (err) reject(err);
        else resolve(rows[0]?.total || 0);
      });
    });

    stats.dolls.heads = dollHeadsCost;
    stats.dolls.bodies = dollBodiesCost;
    stats.dolls.total = dollHeadsCost + dollBodiesCost;

    // 妆容花费统计
    const makeupHistoryCost = await new Promise((resolve, reject) => {
      db.all('SELECT SUM(makeup_fee) as total FROM head_makeup_history WHERE makeup_fee IS NOT NULL', [], (err, rows) => {
        if (err) reject(err);
        else resolve(rows[0]?.total || 0);
      });
    });

    const makeupCurrentCost = await new Promise((resolve, reject) => {
      db.all('SELECT SUM(makeup_fee) as total FROM head_current_makeup WHERE makeup_fee IS NOT NULL', [], (err, rows) => {
        if (err) reject(err);
        else resolve(rows[0]?.total || 0);
      });
    });

    const makeupAppointmentCost = await new Promise((resolve, reject) => {
      db.all('SELECT SUM(makeup_fee) as total FROM head_makeup_appointments WHERE makeup_fee IS NOT NULL', [], (err, rows) => {
        if (err) reject(err);
        else resolve(rows[0]?.total || 0);
      });
    });

    const bodyMakeupCost = await new Promise((resolve, reject) => {
      db.all('SELECT SUM(makeup_fee) as total FROM body_makeup WHERE makeup_fee IS NOT NULL', [], (err, rows) => {
        if (err) reject(err);
        else resolve(rows[0]?.total || 0);
      });
    });

    stats.makeup.history = makeupHistoryCost;
    stats.makeup.current = makeupCurrentCost;
    stats.makeup.appointment = makeupAppointmentCost;
    stats.makeup.body = bodyMakeupCost;
    stats.makeup.total = makeupHistoryCost + makeupCurrentCost + makeupAppointmentCost + bodyMakeupCost;

    // 衣柜花费统计（与配饰页面保持一致的计算方式）
    const wardrobeCost = await new Promise((resolve, reject) => {
      db.all(`
        SELECT 
          category,
          CASE 
            WHEN ownership_status = 'owned' THEN 
              COALESCE(total_price, 0)
            ELSE 
              COALESCE(deposit, 0) + COALESCE(final_payment, 0)
          END as item_cost
        FROM wardrobe_items
      `, [], (err, rows) => {
        if (err) reject(err);
        else {
          const categoryTotals = {
            body_accessories: 0,
            eyes: 0,
            wigs: 0,
            headwear: 0,
            sets: 0,
            single_items: 0,
            handheld: 0
          };
          
          let total = 0;
          rows.forEach(row => {
            const cost = row.item_cost || 0;
            total += cost;
            if (categoryTotals.hasOwnProperty(row.category)) {
              categoryTotals[row.category] += cost;
            }
          });
          
          resolve({ 
            total, 
            body_accessories: categoryTotals.body_accessories,
            eyes: categoryTotals.eyes,
            wigs: categoryTotals.wigs,
            headwear: categoryTotals.headwear,
            sets: categoryTotals.sets,
            single_items: categoryTotals.single_items,
            handheld: categoryTotals.handheld
          });
        }
      });
    });

    stats.wardrobe = wardrobeCost;
    stats.grandTotal = stats.dolls.total + stats.makeup.total + stats.wardrobe.total;

    // 构建分类统计
    stats.breakdown = [
      { category: '娃柜', amount: stats.dolls.total, icon: '🎎', color: '#e91e63' },
      { category: '妆容', amount: stats.makeup.total, icon: '💄', color: '#9c27b0' },
      { category: '衣柜', amount: stats.wardrobe.total, icon: '👗', color: '#4caf50' }
    ].sort((a, b) => b.amount - a.amount);

    res.json(stats);
  } catch (error) {
    console.error('获取花费统计失败:', error);
    res.status(500).json({ error: error.message });
  }
});

// 月度花费趋势API
app.get('/api/stats/monthly-trend', auth.authMiddleware, async (req, res) => {
  const userId = req.userId;
  try {
    const months = [];
    const currentDate = new Date();
    
    // 获取最近12个月的数据
    for (let i = 11; i >= 0; i--) {
      const date = new Date(currentDate.getFullYear(), currentDate.getMonth() - i, 1);
      const yearMonth = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
      
      months.push({
        month: yearMonth,
        display: `${date.getMonth() + 1}月`,
        dolls: 0,
        makeup: 0,
        wardrobe: 0,
        total: 0
      });
    }

    // 获取娃柜月度花费（基于到手年月）
    const dollsMonthly = await new Promise((resolve, reject) => {
      db.all(`
        SELECT received_date, SUM(actual_price) as amount 
        FROM (
          SELECT received_date, actual_price FROM doll_heads WHERE received_date IS NOT NULL AND actual_price IS NOT NULL
          UNION ALL
          SELECT received_date, actual_price FROM doll_bodies WHERE received_date IS NOT NULL AND actual_price IS NOT NULL
        ) 
        GROUP BY received_date
      `, [], (err, rows) => {
        if (err) reject(err);
        else resolve(rows);
      });
    });

    // 获取妆容月度花费（基于妆容日期）
    const makeupMonthly = await new Promise((resolve, reject) => {
      db.all(`
        SELECT substr(makeup_date, 1, 7) as month, SUM(makeup_fee) as amount
        FROM (
          SELECT makeup_date, makeup_fee FROM head_makeup_history WHERE makeup_date IS NOT NULL AND makeup_fee IS NOT NULL
          UNION ALL
          SELECT makeup_date, makeup_fee FROM head_current_makeup WHERE makeup_date IS NOT NULL AND makeup_fee IS NOT NULL
          UNION ALL
          SELECT makeup_date, makeup_fee FROM body_makeup WHERE makeup_date IS NOT NULL AND makeup_fee IS NOT NULL
        )
        GROUP BY substr(makeup_date, 1, 7)
      `, [], (err, rows) => {
        if (err) reject(err);
        else resolve(rows);
      });
    });

    // 映射数据到月份
    dollsMonthly.forEach(row => {
      const monthData = months.find(m => m.month === row.received_date);
      if (monthData) {
        monthData.dolls = row.amount || 0;
      }
    });

    makeupMonthly.forEach(row => {
      const monthData = months.find(m => m.month === row.month);
      if (monthData) {
        monthData.makeup = row.amount || 0;
      }
    });

    // 计算总计
    months.forEach(month => {
      month.total = month.dolls + month.makeup + month.wardrobe;
    });

    res.json(months);
  } catch (error) {
    console.error('获取月度趋势失败:', error);
    res.status(500).json({ error: error.message });
  }
});

// 图片位置更新API
app.put('/api/doll-heads/:id/image-position', auth.authMiddleware, (req, res) => {
  const userId = req.userId;
  const { image_position_x, image_position_y, image_scale } = req.body;
  const id = req.params.id;
  
  const sql = `UPDATE doll_heads SET 
    image_position_x = ?, image_position_y = ?, image_scale = ?
    WHERE id = ?`;
    
  const params = [
    image_position_x || 50, image_position_y || 50, image_scale || 100, id
  ];
  
  db.run(sql, params, function(err) {
    if (err) {
      res.status(500).json({ error: err.message });
      return;
    }
    
    if (this.changes === 0) {
      res.status(404).json({ error: 'Doll head not found' });
      return;
    }
    
    res.json({ 
      message: 'Image position updated successfully',
      changes: this.changes 
    });
  });
});

app.put('/api/doll-bodies/:id/image-position', auth.authMiddleware, (req, res) => {
  const userId = req.userId;
  const { image_position_x, image_position_y, image_scale } = req.body;
  const id = req.params.id;
  
  const sql = `UPDATE doll_bodies SET 
    image_position_x = ?, image_position_y = ?, image_scale = ?
    WHERE id = ?`;
    
  const params = [
    image_position_x || 50, image_position_y || 50, image_scale || 100, id
  ];
  
  db.run(sql, params, function(err) {
    if (err) {
      res.status(500).json({ error: err.message });
      return;
    }
    
    if (this.changes === 0) {
      res.status(404).json({ error: 'Doll body not found' });
      return;
    }
    
    res.json({ 
      message: 'Image position updated successfully',
      changes: this.changes 
    });
  });
});

// 衣柜物品图片位置更新API
app.put('/api/wardrobe/:id/image-position', auth.authMiddleware, (req, res) => {
  const userId = req.userId;
  const { image_position_x, image_position_y, image_scale } = req.body;
  const id = req.params.id;
  
  const sql = `UPDATE wardrobe_items SET 
    image_position_x = ?, image_position_y = ?, image_scale = ?
    WHERE id = ?`;
    
  const params = [
    image_position_x || 50, image_position_y || 50, image_scale || 100, id
  ];
  
  db.run(sql, params, function(err) {
    if (err) {
      res.status(500).json({ error: err.message });
      return;
    }
    
    if (this.changes === 0) {
      res.status(404).json({ error: 'Wardrobe item not found' });
      return;
    }
    
    res.json({ 
      message: 'Image position updated successfully',
      changes: this.changes 
    });
  });
});

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});

process.on('SIGINT', () => {
  db.close((err) => {
    if (err) {
      console.error(err.message);
    }
    console.log('Database connection closed.');
    process.exit(0);
  });
});