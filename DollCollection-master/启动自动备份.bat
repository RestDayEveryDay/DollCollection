@echo off
chcp 65001 >nul
title 自动备份服务

echo =====================================
echo      娃柜数据库自动备份服务
echo =====================================
echo.
echo 📌 备份间隔：每小时一次
echo 📁 备份位置：server\backups
echo 📊 保留数量：最近30个备份
echo.
echo ⚠️  保持此窗口开启以维持自动备份
echo     关闭窗口将停止自动备份服务
echo.
echo =====================================
echo.

cd server
node auto-backup.js --auto