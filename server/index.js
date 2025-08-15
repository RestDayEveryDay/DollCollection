const express = require('express');
const cors = require('cors');
const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const multer = require('multer');
const fs = require('fs');

const app = express();
const PORT = process.env.PORT || 5001;

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

const db = new sqlite3.Database('./doll_collection.db', (err) => {
  if (err) {
    console.error('Error opening database:', err);
  } else {
    console.log('Connected to SQLite database');
    initializeDatabase();
  }
});

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
  });
}

// 娃娃统计API
app.get('/api/dolls/stats', (req, res) => {
  // 获取所有娃头数据
  db.all('SELECT * FROM doll_heads', [], (err, heads) => {
    if (err) {
      res.status(500).json({ error: err.message });
      return;
    }
    
    // 获取所有娃体数据
    db.all('SELECT * FROM doll_bodies', [], (err, bodies) => {
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
app.post('/api/upload', upload.single('image'), (req, res) => {
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
app.delete('/api/upload/:filename', (req, res) => {
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
app.get('/api/doll-heads', (req, res) => {
  db.all('SELECT * FROM doll_heads ORDER BY sort_order ASC, created_at ASC', [], (err, rows) => {
    if (err) {
      res.status(500).json({ error: err.message });
      return;
    }
    res.json(rows);
  });
});

app.post('/api/doll-heads', (req, res) => {
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
    image_position_x, image_position_y, image_scale
  ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`;
  
  const params = [
    name, company, skin_tone, head_circumference, size_category,
    original_price, actual_price, total_price, deposit, final_payment, final_payment_date,
    release_date, received_date, 
    purchase_channel, ownership_status || 'owned', 
    profile_image_url,
    image_position_x || 50, image_position_y || 50, image_scale || 100
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

app.put('/api/doll-heads/:id', (req, res) => {
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
    WHERE id = ?`;
    
  const params = [
    name, company, skin_tone, head_circumference, size_category,
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
      res.status(404).json({ error: 'Doll head not found' });
    } else {
      res.json({ message: 'Doll head updated successfully' });
    }
  });
});

app.delete('/api/doll-heads/:id', (req, res) => {
  const sql = 'DELETE FROM doll_heads WHERE id = ?';
  const params = [req.params.id];
  
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

app.get('/api/doll-bodies', (req, res) => {
  db.all('SELECT * FROM doll_bodies ORDER BY sort_order ASC, created_at ASC', [], (err, rows) => {
    if (err) {
      res.status(500).json({ error: err.message });
      return;
    }
    res.json(rows);
  });
});

app.post('/api/doll-bodies', (req, res) => {
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
    image_position_x, image_position_y, image_scale
  ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`;
  
  const params = [
    name, company, skin_tone, head_circumference, size_category,
    neck_circumference, shoulder_width,
    original_price, actual_price, total_price, deposit, final_payment, final_payment_date,
    release_date, received_date, 
    purchase_channel, ownership_status || 'owned', 
    profile_image_url,
    image_position_x || 50, image_position_y || 50, image_scale || 100
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

app.put('/api/doll-bodies/:id', (req, res) => {
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

app.delete('/api/doll-bodies/:id', (req, res) => {
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
app.put('/api/doll-heads/:id/payment-status', (req, res) => {
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
app.put('/api/doll-bodies/:id/payment-status', (req, res) => {
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
app.put('/api/doll-heads/:id/confirm-arrival', (req, res) => {
  const id = req.params.id;
  
  const sql = `UPDATE doll_heads SET ownership_status = 'owned' WHERE id = ?`;
  
  db.run(sql, [id], function(err) {
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
});

// 娃体到货确认端点
app.put('/api/doll-bodies/:id/confirm-arrival', (req, res) => {
  const id = req.params.id;
  
  const sql = `UPDATE doll_bodies SET ownership_status = 'owned' WHERE id = ?`;
  
  db.run(sql, [id], function(err) {
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
});

// 妆容历史管理API
app.get('/api/makeup-history/:headId', (req, res) => {
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

app.post('/api/makeup-history', (req, res) => {
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

app.put('/api/makeup-history/:id', (req, res) => {
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

app.delete('/api/makeup-history/:id', (req, res) => {
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
app.get('/api/current-makeup/:headId', (req, res) => {
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

app.post('/api/current-makeup', (req, res) => {
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

app.delete('/api/current-makeup/:headId', (req, res) => {
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
app.get('/api/makeup-appointment/:headId', (req, res) => {
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

app.post('/api/makeup-appointment', (req, res) => {
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

app.delete('/api/makeup-appointment/:headId', (req, res) => {
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
app.get('/api/makeup-appointments', (req, res) => {
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
app.get('/api/unmade-preferences/:headId', (req, res) => {
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

app.post('/api/unmade-preferences', (req, res) => {
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

app.delete('/api/unmade-preferences/:headId/:artistId', (req, res) => {
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

app.get('/api/makeup-artists', (req, res) => {
  db.all('SELECT * FROM makeup_artists ORDER BY sort_order ASC, created_at DESC', [], (err, rows) => {
    if (err) {
      res.status(500).json({ error: err.message });
      return;
    }
    res.json(rows);
  });
});

app.post('/api/makeup-artists', (req, res) => {
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

  const sql = `INSERT INTO makeup_artists (name, contact, specialty, price_range, makeup_rules_image, note_template, is_favorite, when_available) 
               VALUES (?, ?, ?, ?, ?, ?, ?, ?)`;
  const params = [name, safeContact, safeSpecialty, safePriceRange, safeMakeupRulesImage, safeNoteTemplate, safeIsFavorite, safeWhenAvailable];
  
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

app.put('/api/makeup-artists/:id', (req, res) => {
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
               WHERE id = ?`;
  const params = [name, safeContact, safeSpecialty, safePriceRange, safeMakeupRulesImage, safeNoteTemplate, safeIsFavorite, safeWhenAvailable, id];
  
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

app.delete('/api/makeup-artists/:id', (req, res) => {
  const id = req.params.id;
  
  db.run('DELETE FROM makeup_artists WHERE id = ?', [id], function(err) {
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

app.post('/api/sort/makeup-artists', (req, res) => {
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

// 自动创建妆师卡API
app.post('/api/auto-create-makeup-artists', (req, res) => {
  // 预设的妆师模板
  const artistTemplates = [
    {
      name: '花音化妆师',
      contact: '微信：hanami_makeup',
      specialty: '森女系、日系甜美',
      price_range: '280-480',
      when_available: '周二、周四、周末',
      note_template: '【花音妆师】\n妆容风格：森女系、日系甜美\n化妆时长：约2-3小时\n注意事项：请提前预约'
    },
    {
      name: '雅韵工作室',
      contact: 'QQ：123456789',
      specialty: '古风、汉服妆容',
      price_range: '350-600',
      when_available: '工作日预约',
      note_template: '【雅韵工作室】\n妆容风格：古风、汉服系列\n化妆时长：约3-4小时\n注意事项：古风妆容需提前沟通造型'
    },
    {
      name: '糖果色彩',
      contact: '小红书：candy_doll',
      specialty: '洛丽塔、甜系',
      price_range: '200-400',
      when_available: '周三至周日',
      note_template: '【糖果色彩】\n妆容风格：洛丽塔、甜系可爱\n化妆时长：约2小时\n注意事项：甜系妆容，适合可爱娃头'
    },
    {
      name: '月色画室',
      contact: '电话：138-0000-0000',
      specialty: '欧美系、复古',
      price_range: '400-800',
      when_available: '需要预约',
      note_template: '【月色画室】\n妆容风格：欧美系、复古风\n化妆时长：约3-5小时\n注意事项：欧美妆容线条感强，适合立体娃头'
    },
    {
      name: '樱花妆艺',
      contact: '微信：sakura_art',
      specialty: '日常淡妆、清新',
      price_range: '150-300',
      when_available: '随时接单',
      note_template: '【樱花妆艺】\n妆容风格：日常淡妆、清新自然\n化妆时长：约1-2小时\n注意事项：擅长淡妆，价格亲民'
    }
  ];

  let createdCount = 0;
  let completed = 0;

  artistTemplates.forEach((template, index) => {
    const sql = `INSERT INTO makeup_artists (
      name, contact, specialty, price_range, when_available, note_template, 
      is_favorite, sort_order, created_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)`;

    db.run(sql, [
      template.name,
      template.contact, 
      template.specialty,
      template.price_range,
      template.when_available,
      template.note_template,
      0, // 默认不是收藏
      index + 1000 // 给一个较大的排序值，避免与现有数据冲突
    ], function(err) {
      completed++;
      
      if (err) {
        console.error('创建妆师模板失败:', err);
      } else {
        createdCount++;
        console.log(`创建妆师: ${template.name}`);
      }
      
      // 所有操作完成后返回结果
      if (completed === artistTemplates.length) {
        res.json({ 
          success: true, 
          count: createdCount,
          total: artistTemplates.length,
          message: `成功创建了${createdCount}个妆师卡`
        });
      }
    });
  });
});

// 娃体妆容管理API
app.get('/api/body-makeup/:bodyId', (req, res) => {
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

app.post('/api/body-makeup', (req, res) => {
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

app.put('/api/body-makeup/:bodyId', (req, res) => {
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

app.delete('/api/body-makeup/:bodyId', (req, res) => {
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
app.get('/api/wardrobe/:category', (req, res) => {
  const category = req.params.category;
  const sql = 'SELECT * FROM wardrobe_items WHERE category = ? ORDER BY sort_order ASC, created_at ASC';
  
  db.all(sql, [category], (err, rows) => {
    if (err) {
      res.status(500).json({ error: err.message });
      return;
    }
    res.json(rows);
  });
});

app.post('/api/wardrobe', (req, res) => {
  const { name, category, brand, platform, ownership_status, total_price, deposit, final_payment, final_payment_date, profile_image_url, sizes } = req.body;
  
  if (!name || !category) {
    return res.status(400).json({ error: 'Name and category are required' });
  }

  const sql = `INSERT INTO wardrobe_items 
               (name, category, brand, platform, ownership_status, total_price, deposit, final_payment, final_payment_date, profile_image_url, sizes) 
               VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`;
  
  // 将sizes数组转换为JSON字符串
  const sizesJson = sizes && Array.isArray(sizes) ? JSON.stringify(sizes) : (sizes || null);
  const params = [name, category, brand, platform, ownership_status || 'owned', total_price, deposit, final_payment, final_payment_date, profile_image_url, sizesJson];
  
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

app.put('/api/wardrobe/:id', (req, res) => {
  const { name, category, brand, platform, ownership_status, total_price, deposit, final_payment, final_payment_date, profile_image_url, sizes } = req.body;
  const id = req.params.id;
  
  if (!name || !category) {
    return res.status(400).json({ error: 'Name and category are required' });
  }

  const sql = `UPDATE wardrobe_items SET 
               name = ?, category = ?, brand = ?, platform = ?, ownership_status = ?, 
               total_price = ?, deposit = ?, final_payment = ?, final_payment_date = ?, 
               profile_image_url = ?, sizes = ?
               WHERE id = ?`;
  
  // 将sizes数组转换为JSON字符串
  console.log('更新wardrobe item - sizes数据:', sizes, 'type:', typeof sizes, 'isArray:', Array.isArray(sizes));
  const sizesJson = sizes && Array.isArray(sizes) ? JSON.stringify(sizes) : (sizes || null);
  console.log('转换后的sizesJson:', sizesJson);
  const params = [name, category, brand, platform, ownership_status || 'owned', total_price, deposit, final_payment, final_payment_date, profile_image_url, sizesJson, id];
  
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

app.delete('/api/wardrobe/:id', (req, res) => {
  const id = req.params.id;
  
  db.run('DELETE FROM wardrobe_items WHERE id = ?', [id], function(err) {
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

app.get('/api/wardrobe/search/:term', (req, res) => {
  const term = req.params.term;
  const sql = `SELECT * FROM wardrobe_items 
               WHERE name LIKE ? OR brand LIKE ? OR platform LIKE ?
               ORDER BY sort_order ASC, created_at ASC`;
  
  const searchTerm = `%${term}%`;
  db.all(sql, [searchTerm, searchTerm, searchTerm], (err, rows) => {
    if (err) {
      res.status(500).json({ error: err.message });
      return;
    }
    res.json(rows);
  });
});

app.put('/api/wardrobe/:id/confirm-arrival', (req, res) => {
  const id = req.params.id;
  
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
});

// 衣柜付款状态更新端点
app.put('/api/wardrobe/:id/payment-status', (req, res) => {
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

app.get('/api/wardrobe/stats/brands', (req, res) => {
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

app.get('/api/wardrobe/stats/sizes', (req, res) => {
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

app.get('/api/wardrobe/stats/status', (req, res) => {
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

app.post('/api/sort/wardrobe/:category', (req, res) => {
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
app.post('/api/sort/doll-heads', (req, res) => {
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

app.post('/api/sort/doll-bodies', (req, res) => {
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
app.get('/api/photos/:entityType/:entityId', (req, res) => {
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

app.post('/api/photos', (req, res) => {
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

app.put('/api/photos/:id', (req, res) => {
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

app.delete('/api/photos/:id', (req, res) => {
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
app.get('/api/stats/total-expenses', async (req, res) => {
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
          const total = rows.reduce((sum, row) => sum + (row.item_cost || 0), 0);
          resolve(total);
        }
      });
    });

    stats.wardrobe.total = wardrobeCost;
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
app.get('/api/stats/monthly-trend', async (req, res) => {
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
app.put('/api/doll-heads/:id/image-position', (req, res) => {
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

app.put('/api/doll-bodies/:id/image-position', (req, res) => {
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