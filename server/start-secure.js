#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const { spawn } = require('child_process');
const backup = require('./backup');
const dbSecurity = require('./secure-db');

console.log(`
╔══════════════════════════════════════════╗
║     🔒 安全模式启动 - 娃娃收藏系统       ║
╚══════════════════════════════════════════╝
`);

// 步骤1：检查数据库文件
console.log('📋 步骤 1/5: 检查数据库文件...');
const DB_PATH = path.join(__dirname, 'database.db');
if (!fs.existsSync(DB_PATH)) {
  console.log('⚠️ 数据库文件不存在，将在首次运行时创建');
} else {
  const stats = fs.statSync(DB_PATH);
  console.log(`✅ 数据库文件存在 (大小: ${(stats.size / 1024).toFixed(2)} KB)`);
}

// 步骤2：创建备份
console.log('\n📋 步骤 2/5: 创建启动备份...');
if (fs.existsSync(DB_PATH)) {
  const backupPath = backup.createBackup();
  if (backupPath) {
    console.log(`✅ 备份创建成功`);
  } else {
    console.log('⚠️ 备份创建失败，继续启动...');
  }
} else {
  console.log('⏭️ 跳过备份（数据库尚未创建）');
}

// 步骤3：设置文件权限
console.log('\n📋 步骤 3/5: 设置安全权限...');
dbSecurity.setDatabasePermissions();

// 步骤4：启动自动备份
console.log('\n📋 步骤 4/5: 配置自动备份...');
const AUTO_BACKUP_HOURS = 24; // 每24小时自动备份
console.log(`📅 自动备份将每 ${AUTO_BACKUP_HOURS} 小时执行一次`);

// 设置定时备份
setInterval(() => {
  console.log('\n⏰ 执行自动备份...');
  const backupPath = backup.createBackup();
  if (backupPath) {
    dbSecurity.logAccess('AUTO_BACKUP', { path: backupPath });
  }
}, AUTO_BACKUP_HOURS * 60 * 60 * 1000);

// 步骤5：启动主服务器
console.log('\n📋 步骤 5/5: 启动主服务器...');
console.log('═'.repeat(50));

// 启动主服务器进程
const serverProcess = spawn('node', ['index.js'], {
  cwd: __dirname,
  stdio: 'inherit',
  env: {
    ...process.env,
    SECURE_MODE: 'true'
  }
});

// 处理服务器错误
serverProcess.on('error', (err) => {
  console.error('❌ 服务器启动失败:', err.message);
  process.exit(1);
});

// 处理服务器退出
serverProcess.on('exit', (code) => {
  if (code !== 0) {
    console.error(`❌ 服务器异常退出 (代码: ${code})`);
  } else {
    console.log('✅ 服务器正常关闭');
  }
  
  // 创建关闭备份
  console.log('\n📦 创建关闭备份...');
  backup.createBackup();
  
  process.exit(code);
});

// 处理进程信号
process.on('SIGINT', () => {
  console.log('\n⚠️ 收到中断信号，正在安全关闭...');
  
  // 创建关闭前备份
  console.log('📦 创建关闭前备份...');
  backup.createBackup();
  
  // 关闭服务器进程
  serverProcess.kill('SIGINT');
});

process.on('SIGTERM', () => {
  console.log('\n⚠️ 收到终止信号，正在安全关闭...');
  backup.createBackup();
  serverProcess.kill('SIGTERM');
});

// 显示安全提示
setTimeout(() => {
  console.log(`
╔══════════════════════════════════════════╗
║            🛡️ 安全提示                   ║
╠══════════════════════════════════════════╣
║ 1. 定期检查备份: node backup.js list    ║
║ 2. 恢复备份: node backup.js restore xxx ║
║ 3. 安全报告: node secure-db.js report   ║
║ 4. 手动备份: node backup.js create      ║
╚══════════════════════════════════════════╝
`);
}, 2000);