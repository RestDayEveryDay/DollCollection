@echo off
chcp 65001 >nul
title 数据安全检查

echo =====================================
echo        数据安全状态检查
echo =====================================
echo.

cd server

echo 📊 当前数据库状态：
echo =====================================
sqlite3 doll_collection.db "SELECT '娃头数量: ' || COUNT(*) FROM doll_heads;"
sqlite3 doll_collection.db "SELECT '娃体数量: ' || COUNT(*) FROM doll_bodies;"
sqlite3 doll_collection.db "SELECT '衣柜物品: ' || COUNT(*) FROM wardrobe_items;"
sqlite3 doll_collection.db "SELECT '妆师数量: ' || COUNT(*) FROM makeup_artists;"

echo.
echo 📁 备份文件列表：
echo =====================================
node auto-backup.js --list

echo.
echo 💡 数据保护建议：
echo =====================================
echo 1. 定期运行"立即备份.bat"进行手动备份
echo 2. 运行"启动自动备份.bat"开启自动备份服务
echo 3. 遇到问题时使用"恢复数据库.bat"恢复数据
echo =====================================
echo.
echo 按任意键退出...
pause >nul