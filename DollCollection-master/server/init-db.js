// 数据库初始化脚本
// 确保所有表都正确创建

const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const bcrypt = require('bcrypt');

const dbPath = process.env.DATABASE_URL || path.join(__dirname, 'doll_collection.db');
console.log('Initializing database at:', dbPath);

const db = new sqlite3.Database(dbPath);

// 创建所有必要的表
const initTables = () => {
  return new Promise((resolve, reject) => {
    db.serialize(() => {
      // 1. 用户表
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
        if (err) console.error('Error creating users table:', err);
        else console.log('✓ Users table created');
      });

      // 2. 娃头表
      db.run(`
        CREATE TABLE IF NOT EXISTS doll_heads (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          name TEXT NOT NULL,
          price REAL,
          size TEXT,
          purchase_date TEXT,
          image_url TEXT,
          notes TEXT,
          sort_order INTEGER DEFAULT 0,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          user_id INTEGER,
          FOREIGN KEY (user_id) REFERENCES users (id)
        )
      `, (err) => {
        if (err) console.error('Error creating doll_heads table:', err);
        else console.log('✓ Doll heads table created');
      });

      // 3. 娃体表
      db.run(`
        CREATE TABLE IF NOT EXISTS doll_bodies (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          name TEXT NOT NULL,
          price REAL,
          size TEXT,
          purchase_date TEXT,
          image_url TEXT,
          notes TEXT,
          sort_order INTEGER DEFAULT 0,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          user_id INTEGER,
          FOREIGN KEY (user_id) REFERENCES users (id)
        )
      `, (err) => {
        if (err) console.error('Error creating doll_bodies table:', err);
        else console.log('✓ Doll bodies table created');
      });

      // 4. 妆师表
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
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          sort_order INTEGER DEFAULT 0,
          when_available TEXT,
          user_id INTEGER,
          FOREIGN KEY (user_id) REFERENCES users (id)
        )
      `, (err) => {
        if (err) console.error('Error creating makeup_artists table:', err);
        else console.log('✓ Makeup artists table created');
      });

      // 5. 约妆表
      db.run(`
        CREATE TABLE IF NOT EXISTS makeup_appointments (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          head_id INTEGER,
          artist_id INTEGER,
          appointment_date TEXT,
          status TEXT DEFAULT 'pending',
          notes TEXT,
          price REAL,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          user_id INTEGER,
          FOREIGN KEY (head_id) REFERENCES doll_heads (id),
          FOREIGN KEY (artist_id) REFERENCES makeup_artists (id),
          FOREIGN KEY (user_id) REFERENCES users (id)
        )
      `, (err) => {
        if (err) console.error('Error creating makeup_appointments table:', err);
        else console.log('✓ Makeup appointments table created');
      });

      // 6. 衣柜表
      db.run(`
        CREATE TABLE IF NOT EXISTS wardrobe_items (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          category TEXT NOT NULL,
          name TEXT NOT NULL,
          brand TEXT,
          price REAL,
          purchase_date TEXT,
          sizes TEXT,
          colors TEXT,
          platform TEXT,
          link TEXT,
          image_url TEXT,
          notes TEXT,
          ownership_status TEXT DEFAULT 'owned',
          payment_status TEXT DEFAULT 'full_paid',
          arrival_status TEXT DEFAULT 'arrived',
          sort_order INTEGER DEFAULT 0,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          user_id INTEGER,
          FOREIGN KEY (user_id) REFERENCES users (id)
        )
      `, (err) => {
        if (err) console.error('Error creating wardrobe_items table:', err);
        else console.log('✓ Wardrobe items table created');
      });

      // 完成后创建默认用户
      setTimeout(() => {
        createDefaultUser().then(() => {
          console.log('Database initialization complete!');
          resolve();
        });
      }, 1000);
    });
  });
};

// 创建默认用户
const createDefaultUser = async () => {
  return new Promise(async (resolve) => {
    // 先检查是否已存在
    db.get('SELECT * FROM users WHERE username = ?', ['休息日'], async (err, user) => {
      if (err) {
        console.error('Error checking user:', err);
        resolve();
        return;
      }
      
      if (!user) {
        try {
          const passwordHash = await bcrypt.hash('200703', 10);
          db.run(
            'INSERT INTO users (username, password_hash) VALUES (?, ?)',
            ['休息日', passwordHash],
            function(err) {
              if (err) {
                console.error('Error creating default user:', err);
              } else {
                console.log('✓ Default user created (username: 休息日, password: 200703)');
              }
              resolve();
            }
          );
        } catch (err) {
          console.error('Error hashing password:', err);
          resolve();
        }
      } else {
        console.log('✓ Default user already exists');
        resolve();
      }
    });
  });
};

// 执行初始化
initTables().then(() => {
  console.log('\n=== Database initialization successful! ===\n');
  db.close();
  process.exit(0);
}).catch(err => {
  console.error('Database initialization failed:', err);
  process.exit(1);
});