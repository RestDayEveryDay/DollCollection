const fs = require('fs');
const path = require('path');
const sqlite3 = require('sqlite3').verbose();

// 配置
const config = {
  sourceDb: './doll_collection.db',
  backupDir: './backups',
  maxBackups: 30, // 保留最近30个备份
  autoBackupInterval: 3600000 // 每小时自动备份一次
};

// 确保备份目录存在
if (!fs.existsSync(config.backupDir)) {
  fs.mkdirSync(config.backupDir, { recursive: true });
}

// 创建备份
function createBackup(isManual = false) {
  const timestamp = new Date().toISOString().replace(/:/g, '-').replace(/\./g, '-');
  const backupType = isManual ? 'manual' : 'auto';
  const backupFileName = `backup_${backupType}_${timestamp}.db`;
  const backupPath = path.join(config.backupDir, backupFileName);
  
  // 检查源数据库是否存在
  if (!fs.existsSync(config.sourceDb)) {
    console.error('❌ 源数据库不存在:', config.sourceDb);
    return false;
  }
  
  try {
    // 复制数据库文件
    fs.copyFileSync(config.sourceDb, backupPath);
    
    // 验证备份
    const stats = fs.statSync(backupPath);
    const sourceStats = fs.statSync(config.sourceDb);
    
    if (stats.size === sourceStats.size) {
      console.log('✅ 备份成功!');
      console.log('📁 备份文件:', backupFileName);
      console.log('📦 文件大小:', (stats.size / 1024).toFixed(2), 'KB');
      console.log('📍 备份位置:', backupPath);
      console.log('🕐 备份时间:', new Date().toLocaleString('zh-CN'));
      
      // 验证数据库完整性
      verifyBackup(backupPath);
      
      // 清理旧备份
      cleanOldBackups();
      
      return backupPath;
    } else {
      console.error('❌ 备份验证失败：文件大小不匹配');
      fs.unlinkSync(backupPath);
      return false;
    }
  } catch (error) {
    console.error('❌ 备份失败:', error.message);
    return false;
  }
}

// 验证备份数据库
function verifyBackup(backupPath) {
  const db = new sqlite3.Database(backupPath, sqlite3.OPEN_READONLY, (err) => {
    if (err) {
      console.error('⚠️  备份验证失败:', err.message);
      return;
    }
    
    // 检查关键表的数据
    db.get('SELECT COUNT(*) as count FROM doll_heads', (err, row) => {
      if (err) {
        console.error('⚠️  无法读取娃头数据:', err.message);
      } else {
        console.log('📊 娃头数量:', row.count);
      }
    });
    
    db.get('SELECT COUNT(*) as count FROM doll_bodies', (err, row) => {
      if (err) {
        console.error('⚠️  无法读取娃体数据:', err.message);
      } else {
        console.log('📊 娃体数量:', row.count);
      }
    });
    
    db.get('SELECT COUNT(*) as count FROM wardrobe_items', (err, row) => {
      if (err) {
        console.error('⚠️  无法读取衣柜数据:', err.message);
      } else {
        console.log('📊 衣柜物品:', row.count);
      }
    });
    
    db.close();
  });
}

// 清理旧备份
function cleanOldBackups() {
  const files = fs.readdirSync(config.backupDir);
  const backupFiles = files
    .filter(f => f.startsWith('backup_') && f.endsWith('.db'))
    .map(f => ({
      name: f,
      path: path.join(config.backupDir, f),
      time: fs.statSync(path.join(config.backupDir, f)).mtime
    }))
    .sort((a, b) => b.time - a.time); // 按时间降序排序
  
  // 删除超出数量限制的旧备份
  if (backupFiles.length > config.maxBackups) {
    const toDelete = backupFiles.slice(config.maxBackups);
    toDelete.forEach(file => {
      fs.unlinkSync(file.path);
      console.log('🗑️  删除旧备份:', file.name);
    });
  }
  
  console.log('📚 当前备份数量:', Math.min(backupFiles.length, config.maxBackups));
}

// 列出所有备份
function listBackups() {
  console.log('\n========== 备份列表 ==========');
  const files = fs.readdirSync(config.backupDir);
  const backupFiles = files
    .filter(f => f.startsWith('backup_') && f.endsWith('.db'))
    .map(f => {
      const stats = fs.statSync(path.join(config.backupDir, f));
      return {
        name: f,
        size: (stats.size / 1024).toFixed(2) + ' KB',
        time: stats.mtime.toLocaleString('zh-CN')
      };
    })
    .sort((a, b) => new Date(b.time) - new Date(a.time));
  
  if (backupFiles.length === 0) {
    console.log('暂无备份文件');
  } else {
    backupFiles.forEach((file, index) => {
      const type = file.name.includes('manual') ? '手动' : '自动';
      console.log(`${index + 1}. [${type}] ${file.name}`);
      console.log(`   大小: ${file.size}, 时间: ${file.time}`);
    });
  }
  console.log('==============================\n');
}

// 如果作为主程序运行
if (require.main === module) {
  const args = process.argv.slice(2);
  
  if (args.includes('--list')) {
    listBackups();
  } else if (args.includes('--manual')) {
    console.log('\n🔄 执行手动备份...');
    createBackup(true);
  } else if (args.includes('--auto')) {
    console.log('\n🤖 启动自动备份服务...');
    console.log(`⏰ 备份间隔: ${config.autoBackupInterval / 1000 / 60} 分钟`);
    
    // 立即执行一次备份
    createBackup(false);
    
    // 设置定时备份
    setInterval(() => {
      console.log('\n🔄 执行自动备份...');
      createBackup(false);
    }, config.autoBackupInterval);
    
    console.log('✅ 自动备份服务已启动，按 Ctrl+C 停止');
  } else {
    console.log('\n使用方法:');
    console.log('  node auto-backup.js --manual  : 执行手动备份');
    console.log('  node auto-backup.js --auto    : 启动自动备份服务');
    console.log('  node auto-backup.js --list    : 列出所有备份');
  }
}

module.exports = { createBackup, listBackups, verifyBackup };