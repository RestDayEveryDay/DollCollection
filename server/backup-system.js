const fs = require('fs');
const path = require('path');
const sqlite3 = require('sqlite3').verbose();

class BackupSystem {
  constructor(dbPath, backupPath) {
    this.dbPath = dbPath;
    this.backupPath = backupPath || path.join(__dirname, 'backups');
    
    // 确保备份目录存在
    if (!fs.existsSync(this.backupPath)) {
      fs.mkdirSync(this.backupPath, { recursive: true });
    }
  }

  // 创建备份
  async createBackup() {
    return new Promise((resolve, reject) => {
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
      const backupFile = path.join(this.backupPath, `backup-${timestamp}.db`);
      
      // 复制数据库文件
      fs.copyFile(this.dbPath, backupFile, (err) => {
        if (err) {
          console.error('备份失败:', err);
          reject(err);
        } else {
          console.log(`✅ 数据库备份成功: ${backupFile}`);
          
          // 清理旧备份（保留最近30个）
          this.cleanOldBackups();
          resolve(backupFile);
        }
      });
    });
  }

  // 清理旧备份
  cleanOldBackups(keepCount = 30) {
    fs.readdir(this.backupPath, (err, files) => {
      if (err) return;
      
      const backupFiles = files
        .filter(f => f.startsWith('backup-') && f.endsWith('.db'))
        .sort()
        .reverse();
      
      // 删除超过保留数量的备份
      if (backupFiles.length > keepCount) {
        backupFiles.slice(keepCount).forEach(file => {
          fs.unlink(path.join(this.backupPath, file), (err) => {
            if (!err) console.log(`删除旧备份: ${file}`);
          });
        });
      }
    });
  }

  // 恢复备份
  async restoreBackup(backupFile) {
    return new Promise((resolve, reject) => {
      const backupPath = path.join(this.backupPath, backupFile);
      
      if (!fs.existsSync(backupPath)) {
        reject(new Error('备份文件不存在'));
        return;
      }
      
      // 先备份当前数据库
      const tempBackup = this.dbPath + '.temp';
      fs.copyFileSync(this.dbPath, tempBackup);
      
      // 恢复备份
      fs.copyFile(backupPath, this.dbPath, (err) => {
        if (err) {
          // 恢复失败，还原
          fs.copyFileSync(tempBackup, this.dbPath);
          fs.unlinkSync(tempBackup);
          reject(err);
        } else {
          fs.unlinkSync(tempBackup);
          console.log(`✅ 数据库恢复成功: ${backupFile}`);
          resolve();
        }
      });
    });
  }

  // 获取备份列表
  getBackupList() {
    const files = fs.readdirSync(this.backupPath);
    return files
      .filter(f => f.startsWith('backup-') && f.endsWith('.db'))
      .sort()
      .reverse()
      .map(file => {
        const stats = fs.statSync(path.join(this.backupPath, file));
        return {
          filename: file,
          size: stats.size,
          created: stats.mtime
        };
      });
  }

  // 自动备份
  startAutoBackup(interval = 24 * 60 * 60 * 1000) { // 默认24小时
    console.log(`⏰ 自动备份已启动，间隔: ${interval / 1000 / 60 / 60} 小时`);
    
    // 立即备份一次
    this.createBackup();
    
    // 定时备份
    setInterval(() => {
      this.createBackup();
    }, interval);
  }
}

module.exports = BackupSystem;