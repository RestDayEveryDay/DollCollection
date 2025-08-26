#!/usr/bin/env node

const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const auth = require('./auth');

const db = new sqlite3.Database(path.join(__dirname, 'database.db'));

console.log('🔄 开始数据库迁移...\n');

// 需要添加user_id字段的表
const tablesToMigrate = [
  'doll_heads',
  'doll_bodies',
  'wardrobe_items',
  'makeup_artists',
  'head_makeup_appointments',
  'head_makeup_history',
  'head_current_makeup',
  'body_makeup',
  'photos'
];

// 执行迁移
async function migrate() {
  try {
    // 1. 初始化用户表
    console.log('📋 步骤 1/4: 创建用户表...');
    await auth.initUserTable();
    console.log('✅ 用户表创建成功\n');

    // 2. 创建默认管理员账户
    console.log('📋 步骤 2/4: 创建管理员账户...');
    const adminId = await auth.createDefaultAdmin();
    console.log(`✅ 管理员账户创建成功 (ID: ${adminId})\n`);

    // 3. 为所有表添加user_id字段
    console.log('📋 步骤 3/4: 为现有表添加user_id字段...');
    for (const table of tablesToMigrate) {
      await new Promise((resolve, reject) => {
        // 检查表是否存在
        db.get(
          `SELECT name FROM sqlite_master WHERE type='table' AND name=?`,
          [table],
          (err, row) => {
            if (err) {
              console.error(`❌ 检查表 ${table} 时出错:`, err);
              resolve(); // 继续处理其他表
              return;
            }
            
            if (!row) {
              console.log(`⏭️ 表 ${table} 不存在，跳过`);
              resolve();
              return;
            }

            // 检查是否已有user_id列
            db.all(`PRAGMA table_info(${table})`, (err, columns) => {
              if (err) {
                console.error(`❌ 检查表 ${table} 列信息时出错:`, err);
                resolve();
                return;
              }

              const hasUserId = columns.some(col => col.name === 'user_id');
              
              if (hasUserId) {
                console.log(`ℹ️ 表 ${table} 已有user_id字段`);
                resolve();
              } else {
                // 添加user_id字段
                db.run(
                  `ALTER TABLE ${table} ADD COLUMN user_id INTEGER`,
                  (err) => {
                    if (err) {
                      console.error(`❌ 为表 ${table} 添加user_id字段失败:`, err);
                    } else {
                      console.log(`✅ 为表 ${table} 添加user_id字段成功`);
                    }
                    resolve();
                  }
                );
              }
            });
          }
        );
      });
    }
    console.log('');

    // 4. 将所有现有数据迁移到管理员账户
    console.log('📋 步骤 4/4: 迁移现有数据到管理员账户...');
    for (const table of tablesToMigrate) {
      await new Promise((resolve, reject) => {
        // 检查表是否存在
        db.get(
          `SELECT name FROM sqlite_master WHERE type='table' AND name=?`,
          [table],
          (err, row) => {
            if (err || !row) {
              resolve();
              return;
            }

            // 更新所有记录的user_id为管理员ID
            db.run(
              `UPDATE ${table} SET user_id = ? WHERE user_id IS NULL`,
              [adminId],
              function(err) {
                if (err) {
                  console.error(`❌ 迁移表 ${table} 数据失败:`, err);
                } else if (this.changes > 0) {
                  console.log(`✅ 迁移表 ${table} 的 ${this.changes} 条记录`);
                }
                resolve();
              }
            );
          }
        );
      });
    }

    console.log('\n🎉 数据库迁移完成！');
    console.log('📝 管理员账户信息:');
    console.log('   用户名: 休息日');
    console.log('   密码: 200703');
    console.log('\n⚠️ 请重启服务器以应用更改');
    
  } catch (error) {
    console.error('❌ 迁移失败:', error);
  } finally {
    db.close();
  }
}

// 运行迁移
migrate();