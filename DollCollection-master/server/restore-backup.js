const fs = require('fs');
const path = require('path');
const sqlite3 = require('sqlite3').verbose();
const readline = require('readline');

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

const config = {
  currentDb: './doll_collection.db',
  backupDir: './backups'
};

// 列出所有可用的备份
function listAvailableBackups() {
  const files = fs.readdirSync(config.backupDir);
  const backupFiles = files
    .filter(f => f.startsWith('backup_') && f.endsWith('.db'))
    .map(f => {
      const stats = fs.statSync(path.join(config.backupDir, f));
      return {
        name: f,
        path: path.join(config.backupDir, f),
        size: (stats.size / 1024).toFixed(2) + ' KB',
        time: stats.mtime
      };
    })
    .sort((a, b) => b.time - a.time);
  
  return backupFiles;
}

// 验证备份文件
function verifyBackup(backupPath) {
  return new Promise((resolve, reject) => {
    const db = new sqlite3.Database(backupPath, sqlite3.OPEN_READONLY, (err) => {
      if (err) {
        reject(err);
        return;
      }
      
      const stats = {};
      
      // 检查各个表的数据
      db.get('SELECT COUNT(*) as count FROM doll_heads', (err, row) => {
        if (err) {
          reject(err);
          return;
        }
        stats.dollHeads = row.count;
        
        db.get('SELECT COUNT(*) as count FROM doll_bodies', (err, row) => {
          if (err) {
            reject(err);
            return;
          }
          stats.dollBodies = row.count;
          
          db.get('SELECT COUNT(*) as count FROM wardrobe_items', (err, row) => {
            if (err) {
              reject(err);
              return;
            }
            stats.wardrobeItems = row.count;
            
            db.close();
            resolve(stats);
          });
        });
      });
    });
  });
}

// 恢复备份
async function restoreBackup(backupPath) {
  try {
    // 验证备份文件
    console.log('\n📊 验证备份文件...');
    const stats = await verifyBackup(backupPath);
    console.log('✅ 备份验证成功！');
    console.log(`   娃头: ${stats.dollHeads} 个`);
    console.log(`   娃体: ${stats.dollBodies} 个`);
    console.log(`   衣柜: ${stats.wardrobeItems} 件`);
    
    // 备份当前数据库
    console.log('\n🔄 备份当前数据库...');
    const timestamp = new Date().toISOString().replace(/:/g, '-').replace(/\./g, '-');
    const currentBackupPath = path.join(config.backupDir, `before_restore_${timestamp}.db`);
    fs.copyFileSync(config.currentDb, currentBackupPath);
    console.log('✅ 当前数据库已备份至:', currentBackupPath);
    
    // 恢复数据库
    console.log('\n🔄 恢复数据库...');
    fs.copyFileSync(backupPath, config.currentDb);
    
    // 验证恢复后的数据库
    console.log('\n📊 验证恢复后的数据库...');
    const restoredStats = await verifyBackup(config.currentDb);
    
    if (JSON.stringify(stats) === JSON.stringify(restoredStats)) {
      console.log('✅ 数据库恢复成功！');
      console.log('\n=====================================');
      console.log('🎉 恢复完成！');
      console.log('📁 恢复来源:', path.basename(backupPath));
      console.log('🔒 原数据库备份:', path.basename(currentBackupPath));
      console.log('=====================================');
      return true;
    } else {
      throw new Error('恢复后的数据验证失败');
    }
  } catch (error) {
    console.error('❌ 恢复失败:', error.message);
    return false;
  }
}

// 交互式恢复流程
async function interactiveRestore() {
  console.log('\n========== 数据库恢复工具 ==========');
  console.log('⚠️  警告：恢复操作将覆盖当前数据库！');
  console.log('=====================================\n');
  
  const backups = listAvailableBackups();
  
  if (backups.length === 0) {
    console.log('❌ 没有找到可用的备份文件');
    rl.close();
    return;
  }
  
  console.log('可用的备份文件：\n');
  backups.forEach((backup, index) => {
    const type = backup.name.includes('manual') ? '手动' : '自动';
    console.log(`${index + 1}. [${type}] ${backup.name}`);
    console.log(`   大小: ${backup.size}`);
    console.log(`   时间: ${backup.time.toLocaleString('zh-CN')}\n`);
  });
  
  rl.question('请选择要恢复的备份 (输入编号，或输入 0 取消): ', async (answer) => {
    const choice = parseInt(answer);
    
    if (choice === 0) {
      console.log('已取消恢复操作');
      rl.close();
      return;
    }
    
    if (choice < 1 || choice > backups.length) {
      console.log('❌ 无效的选择');
      rl.close();
      return;
    }
    
    const selectedBackup = backups[choice - 1];
    console.log(`\n选择的备份: ${selectedBackup.name}`);
    
    try {
      const stats = await verifyBackup(selectedBackup.path);
      console.log('\n备份内容:');
      console.log(`  娃头: ${stats.dollHeads} 个`);
      console.log(`  娃体: ${stats.dollBodies} 个`);
      console.log(`  衣柜: ${stats.wardrobeItems} 件`);
      
      rl.question('\n确认要恢复这个备份吗? (输入 yes 确认): ', async (confirm) => {
        if (confirm.toLowerCase() === 'yes') {
          const success = await restoreBackup(selectedBackup.path);
          if (success) {
            console.log('\n✅ 请重启服务器以应用恢复的数据');
          }
        } else {
          console.log('已取消恢复操作');
        }
        rl.close();
      });
    } catch (error) {
      console.error('❌ 备份文件验证失败:', error.message);
      rl.close();
    }
  });
}

// 主程序
if (require.main === module) {
  interactiveRestore();
}

module.exports = { restoreBackup, verifyBackup };