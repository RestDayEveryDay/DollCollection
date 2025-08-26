const fs = require('fs');
const path = require('path');
const sqlite3 = require('sqlite3').verbose();

// 备份配置
const BACKUP_DIR = path.join(__dirname, 'backups');
const DB_PATH = path.join(__dirname, 'database.db');
const MAX_BACKUPS = 10; // 最多保留10个备份

// 确保备份目录存在
if (!fs.existsSync(BACKUP_DIR)) {
  fs.mkdirSync(BACKUP_DIR, { recursive: true });
}

// 创建备份
function createBackup() {
  const timestamp = new Date().toISOString().replace(/:/g, '-').split('.')[0];
  const backupFileName = `backup_${timestamp}.db`;
  const backupPath = path.join(BACKUP_DIR, backupFileName);

  try {
    // 复制数据库文件
    fs.copyFileSync(DB_PATH, backupPath);
    console.log(`✅ 备份成功: ${backupFileName}`);
    
    // 清理旧备份
    cleanOldBackups();
    
    return backupPath;
  } catch (error) {
    console.error('❌ 备份失败:', error.message);
    return null;
  }
}

// 清理旧备份（只保留最新的N个）
function cleanOldBackups() {
  try {
    const files = fs.readdirSync(BACKUP_DIR)
      .filter(file => file.startsWith('backup_') && file.endsWith('.db'))
      .map(file => ({
        name: file,
        path: path.join(BACKUP_DIR, file),
        time: fs.statSync(path.join(BACKUP_DIR, file)).mtime
      }))
      .sort((a, b) => b.time - a.time); // 按时间降序排序

    // 删除超出限制的旧备份
    if (files.length > MAX_BACKUPS) {
      const filesToDelete = files.slice(MAX_BACKUPS);
      filesToDelete.forEach(file => {
        fs.unlinkSync(file.path);
        console.log(`🗑️ 删除旧备份: ${file.name}`);
      });
    }
  } catch (error) {
    console.error('清理旧备份时出错:', error.message);
  }
}

// 恢复备份
function restoreBackup(backupFileName) {
  const backupPath = path.join(BACKUP_DIR, backupFileName);
  
  if (!fs.existsSync(backupPath)) {
    console.error(`❌ 备份文件不存在: ${backupFileName}`);
    return false;
  }

  try {
    // 先创建当前数据库的备份
    const tempBackup = `${DB_PATH}.temp`;
    fs.copyFileSync(DB_PATH, tempBackup);
    
    // 恢复备份
    fs.copyFileSync(backupPath, DB_PATH);
    
    // 删除临时备份
    fs.unlinkSync(tempBackup);
    
    console.log(`✅ 成功恢复备份: ${backupFileName}`);
    return true;
  } catch (error) {
    console.error('❌ 恢复备份失败:', error.message);
    return false;
  }
}

// 列出所有备份
function listBackups() {
  try {
    const files = fs.readdirSync(BACKUP_DIR)
      .filter(file => file.startsWith('backup_') && file.endsWith('.db'))
      .map(file => {
        const stats = fs.statSync(path.join(BACKUP_DIR, file));
        return {
          name: file,
          size: (stats.size / 1024 / 1024).toFixed(2) + ' MB',
          created: stats.mtime.toLocaleString('zh-CN')
        };
      })
      .sort((a, b) => new Date(b.created) - new Date(a.created));

    if (files.length === 0) {
      console.log('📭 没有找到备份文件');
    } else {
      console.log('\n📦 备份列表:');
      console.log('═'.repeat(60));
      files.forEach((file, index) => {
        console.log(`${index + 1}. ${file.name}`);
        console.log(`   大小: ${file.size} | 创建时间: ${file.created}`);
      });
      console.log('═'.repeat(60));
    }
    
    return files;
  } catch (error) {
    console.error('列出备份时出错:', error.message);
    return [];
  }
}

// 自动备份（可以设置定时任务）
function scheduleAutoBackup(intervalHours = 24) {
  // 立即创建一个备份
  createBackup();
  
  // 设置定时备份
  setInterval(() => {
    console.log('\n⏰ 执行自动备份...');
    createBackup();
  }, intervalHours * 60 * 60 * 1000);
  
  console.log(`📅 已设置自动备份，每 ${intervalHours} 小时执行一次`);
}

// 导出备份到指定位置
function exportBackup(backupFileName, exportPath) {
  const backupPath = path.join(BACKUP_DIR, backupFileName);
  
  if (!fs.existsSync(backupPath)) {
    console.error(`❌ 备份文件不存在: ${backupFileName}`);
    return false;
  }

  try {
    fs.copyFileSync(backupPath, exportPath);
    console.log(`✅ 备份已导出到: ${exportPath}`);
    return true;
  } catch (error) {
    console.error('❌ 导出备份失败:', error.message);
    return false;
  }
}

// 命令行界面
if (require.main === module) {
  const args = process.argv.slice(2);
  const command = args[0];

  switch (command) {
    case 'create':
      createBackup();
      break;
    
    case 'list':
      listBackups();
      break;
    
    case 'restore':
      const backupName = args[1];
      if (!backupName) {
        console.error('请指定要恢复的备份文件名');
        console.log('使用方法: node backup.js restore <backup_filename>');
      } else {
        restoreBackup(backupName);
      }
      break;
    
    case 'auto':
      const hours = parseInt(args[1]) || 24;
      scheduleAutoBackup(hours);
      // 保持进程运行
      process.stdin.resume();
      break;
    
    case 'export':
      const fileName = args[1];
      const exportPath = args[2];
      if (!fileName || !exportPath) {
        console.error('请指定备份文件名和导出路径');
        console.log('使用方法: node backup.js export <backup_filename> <export_path>');
      } else {
        exportBackup(fileName, exportPath);
      }
      break;
    
    default:
      console.log(`
📚 数据库备份工具使用说明:
═══════════════════════════════════════════

命令:
  node backup.js create              - 创建新备份
  node backup.js list                - 列出所有备份
  node backup.js restore <filename>  - 恢复指定备份
  node backup.js auto [hours]        - 启动自动备份（默认24小时）
  node backup.js export <filename> <path> - 导出备份到指定位置

示例:
  node backup.js create
  node backup.js restore backup_2024-01-15T10-30-00.db
  node backup.js auto 12             - 每12小时自动备份
  node backup.js export backup_2024-01-15T10-30-00.db C:\\MyBackups\\backup.db
      `);
  }
}

module.exports = {
  createBackup,
  restoreBackup,
  listBackups,
  scheduleAutoBackup,
  exportBackup
};