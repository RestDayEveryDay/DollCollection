const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const DB_PATH = path.join(__dirname, 'database.db');
const CONFIG_PATH = path.join(__dirname, 'db-config.json');

// 数据库安全配置
class DatabaseSecurity {
  constructor() {
    this.config = this.loadConfig();
  }

  // 加载或创建配置
  loadConfig() {
    if (fs.existsSync(CONFIG_PATH)) {
      return JSON.parse(fs.readFileSync(CONFIG_PATH, 'utf8'));
    } else {
      const config = {
        created: new Date().toISOString(),
        encryptionKey: this.generateKey(),
        accessLog: [],
        settings: {
          maxBackups: 10,
          autoBackupHours: 24,
          enableEncryption: false,
          enableAccessLog: true
        }
      };
      this.saveConfig(config);
      return config;
    }
  }

  // 保存配置
  saveConfig(config) {
    fs.writeFileSync(CONFIG_PATH, JSON.stringify(config, null, 2));
  }

  // 生成加密密钥
  generateKey() {
    return crypto.randomBytes(32).toString('hex');
  }

  // 设置数据库文件权限（仅限Unix/Linux系统）
  setDatabasePermissions() {
    if (process.platform !== 'win32') {
      try {
        // 设置为只有所有者可读写（600）
        fs.chmodSync(DB_PATH, 0o600);
        console.log('✅ 数据库文件权限已设置为 600（仅所有者可读写）');
        
        // 备份目录权限
        const backupDir = path.join(__dirname, 'backups');
        if (fs.existsSync(backupDir)) {
          fs.chmodSync(backupDir, 0o700);
          console.log('✅ 备份目录权限已设置为 700（仅所有者可访问）');
        }
      } catch (error) {
        console.error('❌ 设置文件权限失败:', error.message);
      }
    } else {
      console.log('⚠️ Windows系统，请手动设置文件权限：');
      console.log('   1. 右键点击 database.db 文件');
      console.log('   2. 选择"属性" -> "安全"');
      console.log('   3. 点击"编辑"，移除不必要的用户权限');
      console.log('   4. 只保留当前用户的完全控制权限');
    }
  }

  // 加密敏感数据
  encrypt(text) {
    if (!this.config.settings.enableEncryption) return text;
    
    const algorithm = 'aes-256-cbc';
    const key = Buffer.from(this.config.encryptionKey, 'hex');
    const iv = crypto.randomBytes(16);
    
    const cipher = crypto.createCipheriv(algorithm, key, iv);
    let encrypted = cipher.update(text, 'utf8', 'hex');
    encrypted += cipher.final('hex');
    
    return iv.toString('hex') + ':' + encrypted;
  }

  // 解密敏感数据
  decrypt(text) {
    if (!this.config.settings.enableEncryption) return text;
    
    const algorithm = 'aes-256-cbc';
    const key = Buffer.from(this.config.encryptionKey, 'hex');
    
    const parts = text.split(':');
    const iv = Buffer.from(parts[0], 'hex');
    const encrypted = parts[1];
    
    const decipher = crypto.createDecipheriv(algorithm, key, iv);
    let decrypted = decipher.update(encrypted, 'hex', 'utf8');
    decrypted += decipher.final('utf8');
    
    return decrypted;
  }

  // 记录数据库访问日志
  logAccess(operation, details = {}) {
    if (!this.config.settings.enableAccessLog) return;
    
    const logEntry = {
      timestamp: new Date().toISOString(),
      operation,
      details,
      pid: process.pid
    };
    
    this.config.accessLog.push(logEntry);
    
    // 只保留最近1000条记录
    if (this.config.accessLog.length > 1000) {
      this.config.accessLog = this.config.accessLog.slice(-1000);
    }
    
    this.saveConfig(this.config);
  }

  // 检查数据库完整性
  async checkIntegrity(db) {
    return new Promise((resolve, reject) => {
      db.get("PRAGMA integrity_check", (err, row) => {
        if (err) {
          reject(err);
        } else {
          const result = row.integrity_check;
          if (result === 'ok') {
            console.log('✅ 数据库完整性检查通过');
            resolve(true);
          } else {
            console.error('❌ 数据库完整性检查失败:', result);
            resolve(false);
          }
        }
      });
    });
  }

  // 优化数据库
  async optimizeDatabase(db) {
    return new Promise((resolve, reject) => {
      db.run("VACUUM", (err) => {
        if (err) {
          console.error('❌ 数据库优化失败:', err.message);
          reject(err);
        } else {
          console.log('✅ 数据库已优化');
          resolve();
        }
      });
    });
  }

  // 创建安全索引
  async createSecureIndexes(db) {
    const indexes = [
      "CREATE INDEX IF NOT EXISTS idx_doll_heads_ownership ON doll_heads(ownership_status)",
      "CREATE INDEX IF NOT EXISTS idx_doll_bodies_ownership ON doll_bodies(ownership_status)",
      "CREATE INDEX IF NOT EXISTS idx_wardrobe_category ON wardrobe_items(category)",
      "CREATE INDEX IF NOT EXISTS idx_wardrobe_ownership ON wardrobe_items(ownership_status)",
      "CREATE INDEX IF NOT EXISTS idx_makeup_head_id ON head_makeup_history(head_id)",
      "CREATE INDEX IF NOT EXISTS idx_appointments_status ON head_makeup_appointments(appointment_status)"
    ];

    for (const index of indexes) {
      await new Promise((resolve, reject) => {
        db.run(index, (err) => {
          if (err) {
            console.error('创建索引失败:', err.message);
            reject(err);
          } else {
            resolve();
          }
        });
      });
    }
    
    console.log('✅ 安全索引已创建');
  }

  // 生成安全报告
  generateSecurityReport() {
    const report = {
      timestamp: new Date().toISOString(),
      database: {
        path: DB_PATH,
        exists: fs.existsSync(DB_PATH),
        size: fs.existsSync(DB_PATH) ? fs.statSync(DB_PATH).size : 0
      },
      security: {
        encryptionEnabled: this.config.settings.enableEncryption,
        accessLogEnabled: this.config.settings.enableAccessLog,
        recentAccess: this.config.accessLog.slice(-10)
      },
      backups: {
        directory: path.join(__dirname, 'backups'),
        autoBackupEnabled: this.config.settings.autoBackupHours > 0,
        maxBackups: this.config.settings.maxBackups
      }
    };

    console.log('\n📊 安全报告');
    console.log('═'.repeat(60));
    console.log(`生成时间: ${report.timestamp}`);
    console.log(`\n数据库信息:`);
    console.log(`  路径: ${report.database.path}`);
    console.log(`  大小: ${(report.database.size / 1024).toFixed(2)} KB`);
    console.log(`\n安全设置:`);
    console.log(`  加密: ${report.security.encryptionEnabled ? '✅ 已启用' : '❌ 未启用'}`);
    console.log(`  访问日志: ${report.security.accessLogEnabled ? '✅ 已启用' : '❌ 未启用'}`);
    console.log(`\n备份设置:`);
    console.log(`  自动备份: ${report.backups.autoBackupEnabled ? '✅ 已启用' : '❌ 未启用'}`);
    console.log(`  最大备份数: ${report.backups.maxBackups}`);
    console.log('═'.repeat(60));

    return report;
  }
}

// 创建实例
const dbSecurity = new DatabaseSecurity();

// 命令行界面
if (require.main === module) {
  const args = process.argv.slice(2);
  const command = args[0];

  switch (command) {
    case 'setup':
      dbSecurity.setDatabasePermissions();
      dbSecurity.generateSecurityReport();
      break;
    
    case 'report':
      dbSecurity.generateSecurityReport();
      break;
    
    case 'enable-encryption':
      dbSecurity.config.settings.enableEncryption = true;
      dbSecurity.saveConfig(dbSecurity.config);
      console.log('✅ 加密已启用');
      break;
    
    case 'disable-encryption':
      dbSecurity.config.settings.enableEncryption = false;
      dbSecurity.saveConfig(dbSecurity.config);
      console.log('✅ 加密已禁用');
      break;
    
    default:
      console.log(`
🔒 数据库安全工具
═══════════════════════════════════════════

命令:
  node secure-db.js setup              - 初始化安全设置
  node secure-db.js report             - 生成安全报告
  node secure-db.js enable-encryption  - 启用数据加密
  node secure-db.js disable-encryption - 禁用数据加密

注意:
  - 定期运行 setup 确保权限正确
  - 使用 report 检查安全状态
  - 加密会影响性能，谨慎使用
      `);
  }
}

module.exports = dbSecurity;