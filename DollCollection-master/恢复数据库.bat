@echo off
chcp 65001 >nul
title 数据库恢复工具

echo =====================================
echo        数据库恢复工具
echo =====================================
echo.
echo ⚠️  警告：恢复操作将覆盖当前数据库！
echo.
echo 建议：恢复前请先停止服务器
echo.
echo =====================================
echo.

cd server
node restore-backup.js

echo.
echo 按任意键退出...
pause >nul