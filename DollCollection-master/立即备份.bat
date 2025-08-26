@echo off
chcp 65001 >nul
title 数据库备份工具

echo =====================================
echo        娃柜数据库备份工具
echo =====================================
echo.

cd server
echo 正在备份数据库...
echo.

node auto-backup.js --manual

echo.
echo =====================================
echo 备份完成！数据已安全保存
echo =====================================
echo.
echo 按任意键查看所有备份...
pause >nul

cls
node auto-backup.js --list

echo.
echo 按任意键退出...
pause >nul