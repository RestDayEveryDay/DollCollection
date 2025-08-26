# 🔒 数据库安全指南

## 概述
本系统实现了多层次的数据库安全保护，包括备份、输入验证、SQL注入防护、文件权限管理等功能。

## 安全功能

### 1. 自动备份系统
- **自动备份**：每24小时自动创建数据库备份
- **手动备份**：随时创建数据库快照
- **备份管理**：自动清理旧备份，保留最新的10个
- **备份恢复**：快速恢复到任意备份点

### 2. SQL注入防护
- 所有用户输入都经过严格验证和清理
- 使用参数化查询防止SQL注入
- 危险SQL关键字自动过滤
- 特殊字符转义处理

### 3. 输入验证
- **数据类型验证**：确保数据类型正确（数字、日期、枚举等）
- **长度限制**：防止过长输入导致的问题
- **格式验证**：日期、价格等特定格式验证
- **必填项检查**：确保关键数据不为空

### 4. 访问控制
- 请求速率限制（每分钟最多100个请求）
- 访问日志记录
- 文件权限设置（仅限所有者访问）

### 5. 数据加密（可选）
- AES-256加密算法
- 可选择性加密敏感数据
- 密钥安全存储

## 使用方法

### 安全启动服务器
```bash
# 使用安全模式启动（推荐）
node start-secure.js

# 或者普通启动
node index.js
```

### 备份管理
```bash
# 创建备份
node backup.js create

# 查看所有备份
node backup.js list

# 恢复备份
node backup.js restore backup_2024-01-15T10-30-00.db

# 启动自动备份（独立进程）
node backup.js auto 12  # 每12小时备份一次

# 导出备份到其他位置
node backup.js export backup_2024-01-15T10-30-00.db D:\MyBackups\backup.db
```

### 安全设置
```bash
# 初始化安全设置
node secure-db.js setup

# 生成安全报告
node secure-db.js report

# 启用数据加密
node secure-db.js enable-encryption

# 禁用数据加密
node secure-db.js disable-encryption
```

## 最佳实践

### 日常维护
1. **定期备份**：虽然有自动备份，建议在重要操作前手动备份
2. **检查备份**：定期使用 `node backup.js list` 确认备份正常
3. **安全报告**：每周运行 `node secure-db.js report` 检查安全状态

### 数据恢复
如果数据出现问题：
1. 立即停止服务器
2. 使用 `node backup.js list` 查看可用备份
3. 选择合适的备份进行恢复
4. 重新启动服务器

### Windows系统特别说明
在Windows系统上，文件权限需要手动设置：
1. 右键点击 `database.db` 文件
2. 选择"属性" → "安全"
3. 点击"编辑"，移除不必要的用户权限
4. 只保留当前用户的完全控制权限

### 紧急情况处理

#### 数据库损坏
```bash
# 1. 查看最近的备份
node backup.js list

# 2. 恢复到最近的正常备份
node backup.js restore backup_xxx.db

# 3. 重启服务器
node start-secure.js
```

#### 疑似攻击
```bash
# 1. 立即创建备份
node backup.js create

# 2. 查看安全报告
node secure-db.js report

# 3. 检查访问日志（在 db-config.json 中）

# 4. 如需要，可以临时提高安全级别
node secure-db.js enable-encryption
```

## 文件说明

- `backup.js` - 备份管理工具
- `security.js` - 输入验证和SQL注入防护
- `secure-db.js` - 数据库安全配置
- `start-secure.js` - 安全启动脚本
- `database.db` - 主数据库文件
- `backups/` - 备份文件目录
- `db-config.json` - 安全配置文件（自动生成）

## 注意事项

1. **不要删除备份目录**：`backups/` 目录包含重要的历史备份
2. **保护配置文件**：`db-config.json` 包含加密密钥，请妥善保管
3. **定期更新**：保持系统和依赖包更新到最新版本
4. **监控日志**：定期检查访问日志，发现异常及时处理

## 故障排除

### 问题：无法创建备份
- 检查磁盘空间是否充足
- 确认 `backups/` 目录有写入权限
- 查看控制台错误信息

### 问题：恢复备份失败
- 确认备份文件完整性
- 检查文件权限
- 尝试使用其他备份

### 问题：服务器启动失败
- 检查端口5000是否被占用
- 验证数据库文件是否损坏
- 查看错误日志

## 联系支持
如遇到安全相关问题，请：
1. 立即创建备份
2. 记录错误信息
3. 不要随意修改安全配置文件

---
*最后更新：2024年*