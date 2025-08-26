const express = require('express');
const cors = require('cors');
const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const multer = require('multer');
const fs = require('fs');

const app = express();
const PORT = process.env.PORT || 5000;

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
      { name: 'final_payment_date', type: 'TEXT' }
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
      { name: 'final_payment_date', type: 'TEXT' }
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
  });
}

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
  const { caption, is_cover } = req.body;
  const id = req.params.id;
  
  // 如果设为封面，先获取这张照片的信息
  if (is_cover) {
    db.get('SELECT entity_type, entity_id FROM photos WHERE id = ?', [id], (err, photo) => {
      if (!err && photo) {
        // 取消同实体其他封面
        db.run('UPDATE photos SET is_cover = 0 WHERE entity_type = ? AND entity_id = ?', 
          [photo.entity_type, photo.entity_id]);
      }
    });
  }

  const sql = 'UPDATE photos SET caption = ?, is_cover = ? WHERE id = ?';
  db.run(sql, [caption, is_cover || 0, id], function(err) {
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
  
  // 先获取照片信息以删除文件
  db.get('SELECT image_url FROM photos WHERE id = ?', [id], (err, photo) => {
    if (!err && photo && photo.image_url) {
      // 删除物理文件
      const filename = photo.image_url.split('/').pop();
      const filePath = path.join(__dirname, 'uploads', filename);
      fs.unlink(filePath, (err) => {
        if (err) console.error('删除文件失败:', err);
      });
    }
  });

  // 删除数据库记录
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

// 妆容历史管理API
app.get('/api/makeup-history/:headId', (req, res) => {
  const headId = req.params.headId;
  
  const sql = `SELECT hmh.*, ma.name as artist_name FROM head_makeup_history hmh
               LEFT JOIN makeup_artists ma ON hmh.makeup_artist_id = ma.id
               WHERE hmh.head_id = ? ORDER BY hmh.created_at DESC`;
  
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
  const { makeup_artist_id, makeup_artist_name, makeup_fee, notes, makeup_date, removal_date, image_url } = req.body;
  const id = req.params.id;
  
  const sql = `UPDATE head_makeup_history SET 
               makeup_artist_id = ?, makeup_artist_name = ?, makeup_fee = ?, 
               notes = ?, makeup_date = ?, removal_date = ?, image_url = ?
               WHERE id = ?`;
  
  const params = [makeup_artist_id, makeup_artist_name, makeup_fee, notes, makeup_date, removal_date, image_url, id];
  
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

  // 先删除现有的约妆（如果存在）
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

// 未约妆心仪妆师管理API
app.get('/api/unmade-preferences/:headId', (req, res) => {
  const headId = req.params.headId;
  
  const sql = `SELECT hup.*, ma.name as makeup_artist_name FROM head_unmade_preferences hup
               LEFT JOIN makeup_artists ma ON hup.makeup_artist_id = ma.id
               WHERE hup.head_id = ?`;
  
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

  const sql = `INSERT INTO head_unmade_preferences (head_id, makeup_artist_id) 
               VALUES (?, ?)`;
  
  db.run(sql, [head_id, makeup_artist_id], function(err) {
    if (err) {
      if (err.message.includes('UNIQUE constraint failed')) {
        res.status(400).json({ error: 'This artist is already in preferences' });
      } else {
        res.status(500).json({ error: err.message });
      }
      return;
    }
    res.json({
      message: 'Preference added successfully',
      id: this.lastID
    });
  });
});

app.delete('/api/unmade-preferences/:headId/:artistId', (req, res) => {
  const { headId, artistId } = req.params;
  
  db.run('DELETE FROM head_unmade_preferences WHERE head_id = ? AND makeup_artist_id = ?', 
    [headId, artistId], function(err) {
    if (err) {
      res.status(500).json({ error: err.message });
      return;
    }
    if (this.changes === 0) {
      res.status(404).json({ error: 'Preference not found' });
    } else {
      res.json({ message: 'Preference removed successfully' });
    }
  });
});

// 妆师API
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
  
  console.log('POST request received:', { body: req.body });
  
  if (!name) {
    return res.status(400).json({ error: 'Name is required' });
  }

  // 确保所有字段都有合适的默认值
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
  
  console.log('POST SQL params:', params);
  
  db.run(sql, params, function(err) {
    if (err) {
      console.error('POST Database error:', err);
      res.status(500).json({ error: err.message });
      return;
    }
    res.json({
      message: 'Makeup artist added successfully',
      id: this.lastID
    });
  });
});

// 娃头API
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
    original_price, actual_price, 
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
    original_price, actual_price, 
    release_date, received_date, 
    purchase_channel, ownership_status, 
    profile_image_url,
    image_position_x, image_position_y, image_scale
  ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`;
  
  const params = [
    name, company, skin_tone, head_circumference, size_category,
    original_price, actual_price, 
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
    original_price, actual_price, 
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
    original_price = ?, actual_price = ?, 
    release_date = ?, received_date = ?, 
    purchase_channel = ?, ownership_status = ?, 
    profile_image_url = ?,
    image_position_x = ?, image_position_y = ?, image_scale = ?
    WHERE id = ?`;
    
  const params = [
    name, company, skin_tone, head_circumference, size_category,
    original_price, actual_price, 
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

// 娃体API
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
    original_price, actual_price, 
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
    original_price, actual_price, 
    release_date, received_date, 
    purchase_channel, ownership_status, 
    profile_image_url,
    image_position_x, image_position_y, image_scale
  ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`;
  
  const params = [
    name, company, skin_tone, head_circumference, size_category,
    neck_circumference, shoulder_width,
    original_price, actual_price, 
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
    original_price, actual_price, 
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
    original_price = ?, actual_price = ?, 
    release_date = ?, received_date = ?, 
    purchase_channel = ?, ownership_status = ?, 
    profile_image_url = ?,
    image_position_x = ?, image_position_y = ?, image_scale = ?
    WHERE id = ?`;
    
  const params = [
    name, company, skin_tone, head_circumference, size_category,
    neck_circumference, shoulder_width,
    original_price, actual_price, 
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

// 更新娃头图片位置参数
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

// 更新娃体图片位置参数
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

// 更新妆师API
app.put('/api/makeup-artists/:id', (req, res) => {
  const { name, contact, specialty, price_range, makeup_rules_image, note_template, is_favorite, when_available } = req.body;
  const id = req.params.id;
  
  console.log('PUT request received:', { id, body: req.body });
  
  if (!name) {
    return res.status(400).json({ error: 'Name is required' });
  }

  // 确保所有字段都有合适的默认值
  const safeContact = contact || '';
  const safeSpecialty = specialty || '';
  const safePriceRange = price_range || '';
  const safeMakeupRulesImage = makeup_rules_image || '';
  const safeNoteTemplate = note_template || '';
  const safeWhenAvailable = when_available || '';
  const safeIsFavorite = is_favorite ? 1 : 0;

  const sql = `UPDATE makeup_artists SET name = ?, contact = ?, specialty = ?, 
               price_range = ?, makeup_rules_image = ?, note_template = ?, is_favorite = ?, when_available = ? WHERE id = ?`;
  const params = [name, safeContact, safeSpecialty, safePriceRange, safeMakeupRulesImage, safeNoteTemplate, safeIsFavorite, safeWhenAvailable, id];
  
  console.log('SQL params:', params);
  
  db.run(sql, params, function(err) {
    if (err) {
      console.error('Database error:', err);
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

// 删除API
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

app.delete('/api/makeup-artists/:id', (req, res) => {
  const sql = 'DELETE FROM makeup_artists WHERE id = ?';
  const params = [req.params.id];
  
  db.run(sql, params, function(err) {
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

// 排序API
app.post('/api/sort/makeup-artists', (req, res) => {
  const { sortOrder } = req.body; // sortOrder是一个数组，包含id和新的sort_order
  
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

// 体妆管理API
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

  // 先删除现有的体妆（如果存在）
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
      message: 'Body makeup set successfully',
      id: this.lastID
    });
  });
});

app.put('/api/body-makeup/:bodyId', (req, res) => {
  const { makeup_artist_id, makeup_artist_name, makeup_fee, makeup_date, image_url } = req.body;
  const bodyId = req.params.bodyId;
  
  const sql = `UPDATE body_makeup SET 
               makeup_artist_id = ?, makeup_artist_name = ?, makeup_fee = ?, 
               makeup_date = ?, image_url = ?
               WHERE body_id = ?`;
  
  const params = [makeup_artist_id, makeup_artist_name, makeup_fee, makeup_date, image_url, bodyId];
  
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
      res.status(404).json({ error: 'No body makeup found' });
    } else {
      res.json({ message: 'Body makeup cleared successfully' });
    }
  });
});

// 衣柜管理API
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

// 衣柜全局搜索API
app.get('/api/wardrobe/search/:searchTerm', (req, res) => {
  const searchTerm = req.params.searchTerm;
  if (!searchTerm || !searchTerm.trim()) {
    return res.json([]);
  }

  const sql = 'SELECT * FROM wardrobe_items WHERE name LIKE ? OR sizes LIKE ? ORDER BY category, sort_order ASC, created_at ASC';
  const searchPattern = `%${searchTerm}%`;
  
  db.all(sql, [searchPattern, searchPattern], (err, rows) => {
    if (err) {
      res.status(500).json({ error: err.message });
      return;
    }
    res.json(rows);
  });
});

// 品牌统计API
app.get('/api/wardrobe/stats/brands', (req, res) => {
  const sql = `
    SELECT 
      brand,
      COUNT(*) as count,
      COUNT(CASE WHEN ownership_status = 'owned' THEN 1 END) as owned_count,
      COUNT(CASE WHEN ownership_status = 'preorder' THEN 1 END) as preorder_count,
      COALESCE(SUM(CASE WHEN ownership_status = 'owned' AND total_price IS NOT NULL THEN total_price END), 0) as total_amount_owned,
      COALESCE(SUM(CASE WHEN ownership_status = 'preorder' AND total_price IS NOT NULL THEN total_price END), 0) as total_amount_preorder,
      COALESCE(SUM(CASE WHEN total_price IS NOT NULL THEN total_price END), 0) as total_amount
    FROM wardrobe_items 
    WHERE brand IS NOT NULL AND brand != '' 
    GROUP BY brand 
    ORDER BY count DESC
  `;
  
  db.all(sql, [], (err, rows) => {
    if (err) {
      res.status(500).json({ error: err.message });
      return;
    }
    res.json(rows);
  });
});

// 尺寸统计API
app.get('/api/wardrobe/stats/sizes', (req, res) => {
  const sql = 'SELECT * FROM wardrobe_items WHERE sizes IS NOT NULL AND sizes != ""';
  
  db.all(sql, [], (err, rows) => {
    if (err) {
      res.status(500).json({ error: err.message });
      return;
    }

    // 处理尺寸数据聚合
    const sizeStats = {};
    
    rows.forEach(item => {
      try {
        const sizesArray = JSON.parse(item.sizes);
        sizesArray.forEach(size => {
          if (!sizeStats[size]) {
            sizeStats[size] = {
              size: size,
              count: 0,
              owned_count: 0,
              preorder_count: 0,
              total_amount_owned: 0,
              total_amount_preorder: 0,
              total_amount: 0
            };
          }
          
          sizeStats[size].count++;
          
          if (item.ownership_status === 'owned') {
            sizeStats[size].owned_count++;
            if (item.total_price) {
              sizeStats[size].total_amount_owned += item.total_price;
            }
          } else if (item.ownership_status === 'preorder') {
            sizeStats[size].preorder_count++;
            if (item.total_price) {
              sizeStats[size].total_amount_preorder += item.total_price;
            }
          }
          
          if (item.total_price) {
            sizeStats[size].total_amount += item.total_price;
          }
        });
      } catch (e) {
        // 忽略无效的JSON数据
      }
    });

    // 转换为数组并按数量排序
    const result = Object.values(sizeStats).sort((a, b) => b.count - a.count);
    res.json(result);
  });
});

// 状态统计API
app.get('/api/wardrobe/stats/status', (req, res) => {
  const sql = `
    SELECT 
      ownership_status,
      COUNT(*) as count,
      COALESCE(SUM(CASE WHEN total_price IS NOT NULL THEN total_price END), 0) as total_amount,
      GROUP_CONCAT(category) as categories,
      COUNT(DISTINCT category) as category_count
    FROM wardrobe_items 
    GROUP BY ownership_status 
    ORDER BY count DESC
  `;
  
  db.all(sql, [], (err, rows) => {
    if (err) {
      res.status(500).json({ error: err.message });
      return;
    }
    
    // 处理结果，添加中文状态名称和图标
    const result = rows.map(row => ({
      ...row,
      status_name: row.ownership_status === 'owned' ? '已到家' : '空气',
      status_icon: row.ownership_status === 'owned' ? '🏠' : '💭',
      categories: row.categories ? row.categories.split(',') : []
    }));
    
    res.json(result);
  });
});

// 获取所有配件数据API
app.get('/api/wardrobe/all', (req, res) => {
  const sql = 'SELECT * FROM wardrobe_items';
  
  db.all(sql, [], (err, rows) => {
    if (err) {
      console.error('SQL Error in /api/wardrobe/all:', err.message);
      res.status(500).json({ error: err.message });
      return;
    }
    console.log(`Found ${rows.length} items in wardrobe_items table`);
    res.json(rows);
  });
});

app.post('/api/wardrobe', (req, res) => {
  const { 
    name, category, brand, platform, ownership_status, 
    total_price, deposit, final_payment, final_payment_date, 
    profile_image_url, sizes
  } = req.body;
  
  if (!name || !category) {
    return res.status(400).json({ error: 'Name and category are required' });
  }

  // 处理尺寸数组，转换为JSON字符串存储
  const sizesJson = sizes && Array.isArray(sizes) ? JSON.stringify(sizes) : null;

  const sql = `INSERT INTO wardrobe_items (
    name, category, brand, platform, ownership_status, 
    total_price, deposit, final_payment, final_payment_date, 
    profile_image_url, sizes
  ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`;
  
  const params = [
    name, category, brand, platform, ownership_status || 'owned', 
    total_price, deposit, final_payment, final_payment_date, 
    profile_image_url, sizesJson
  ];
  
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
  const { 
    name, category, brand, platform, ownership_status, 
    total_price, deposit, final_payment, final_payment_date, 
    profile_image_url, sizes
  } = req.body;
  const id = req.params.id;
  
  if (!name || !category) {
    return res.status(400).json({ error: 'Name and category are required' });
  }

  // 处理尺寸数组，转换为JSON字符串存储
  const sizesJson = sizes && Array.isArray(sizes) ? JSON.stringify(sizes) : null;

  const sql = `UPDATE wardrobe_items SET 
    name = ?, category = ?, brand = ?, platform = ?, ownership_status = ?, 
    total_price = ?, deposit = ?, final_payment = ?, final_payment_date = ?, 
    profile_image_url = ?, sizes = ?
    WHERE id = ?`;
    
  const params = [
    name, category, brand, platform, ownership_status || 'owned', 
    total_price, deposit, final_payment, final_payment_date, 
    profile_image_url, sizesJson, id
  ];
  
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
  const sql = 'DELETE FROM wardrobe_items WHERE id = ?';
  const params = [req.params.id];
  
  db.run(sql, params, function(err) {
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

// 衣柜排序API
app.post('/api/sort/wardrobe/:category', (req, res) => {
  const category = req.params.category;
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
    db.run('UPDATE wardrobe_items SET sort_order = ? WHERE id = ? AND category = ?', 
      [order, id, category], function(err) {
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

// 确认空气物品已到家API
app.put('/api/wardrobe/:id/confirm-arrival', (req, res) => {
  const id = req.params.id;
  const { hasArrived } = req.body;

  if (hasArrived) {
    // 如果确认已到家，更新状态为owned，价格改为总价
    const sql = `UPDATE wardrobe_items SET 
                 ownership_status = 'owned',
                 is_overdue = 0,
                 deposit = '',
                 final_payment = '',
                 final_payment_date = ''
                 WHERE id = ?`;
    
    db.run(sql, [id], function(err) {
      if (err) {
        res.status(500).json({ error: err.message });
        return;
      }
      if (this.changes === 0) {
        res.status(404).json({ error: 'Wardrobe item not found' });
      } else {
        res.json({ message: 'Item confirmed as arrived' });
      }
    });
  } else {
    // 如果确认未到家，标记为逾期
    const sql = `UPDATE wardrobe_items SET is_overdue = 1 WHERE id = ?`;
    
    db.run(sql, [id], function(err) {
      if (err) {
        res.status(500).json({ error: err.message });
        return;
      }
      if (this.changes === 0) {
        res.status(404).json({ error: 'Wardrobe item not found' });
      } else {
        res.json({ message: 'Item marked as overdue' });
      }
    });
  }
});

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
      
      // 获取所有妆费数据
      const getMakeupStats = (callback) => {
        // 获取娃头历史妆费
        db.all('SELECT makeup_fee FROM head_makeup_history WHERE makeup_fee IS NOT NULL', [], (err, headHistory) => {
          if (err) {
            callback(err, null);
            return;
          }
          
          // 获取娃头当前妆费
          db.all('SELECT makeup_fee FROM head_current_makeup WHERE makeup_fee IS NOT NULL', [], (err, headCurrent) => {
            if (err) {
              callback(err, null);
              return;
            }
            
            // 获取娃头约妆费用
            db.all('SELECT makeup_fee FROM head_makeup_appointments WHERE makeup_fee IS NOT NULL', [], (err, headAppointments) => {
              if (err) {
                callback(err, null);
                return;
              }
              
              // 获取娃体妆费
              db.all('SELECT makeup_fee FROM body_makeup WHERE makeup_fee IS NOT NULL', [], (err, bodyMakeup) => {
                if (err) {
                  callback(err, null);
                  return;
                }
                
                // 计算总妆费
                const allMakeupFees = [
                  ...headHistory.map(h => h.makeup_fee || 0),
                  ...headCurrent.map(h => h.makeup_fee || 0),
                  ...headAppointments.map(h => h.makeup_fee || 0),
                  ...bodyMakeup.map(b => b.makeup_fee || 0)
                ];
                
                const makeupStats = {
                  total_makeup_cost: allMakeupFees.reduce((sum, fee) => sum + fee, 0),
                  total_makeup_count: allMakeupFees.length,
                  head_history_cost: headHistory.reduce((sum, h) => sum + (h.makeup_fee || 0), 0),
                  head_current_cost: headCurrent.reduce((sum, h) => sum + (h.makeup_fee || 0), 0),
                  head_appointment_cost: headAppointments.reduce((sum, h) => sum + (h.makeup_fee || 0), 0),
                  body_makeup_cost: bodyMakeup.reduce((sum, b) => sum + (b.makeup_fee || 0), 0)
                };
                
                callback(null, makeupStats);
              });
            });
          });
        });
      };
      
      getMakeupStats((err, makeupStats) => {
        if (err) {
          res.status(500).json({ error: err.message });
          return;
        }
        
        const allDolls = [
          ...heads.map(h => ({ ...h, type: 'head' })),
          ...bodies.map(b => ({ ...b, type: 'body' }))
        ];
        
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
          // 添加妆费统计
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
    });
  });
});

// 调试路由 - 检查表结构
app.get('/api/debug/table-info', (req, res) => {
  db.all("PRAGMA table_info(makeup_artists)", [], (err, rows) => {
    if (err) {
      res.status(500).json({ error: err.message });
      return;
    }
    res.json(rows);
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