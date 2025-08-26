@echo off
chcp 65001 >nul
title 娃柜系统 - 安全启动

echo =====================================
echo        娃柜系统安全启动
echo =====================================
echo.

echo [1/4] 创建启动前备份...
cd server
call node auto-backup.js --manual
cd ..

echo.
echo [2/4] 启动自动备份服务...
start "自动备份服务" cmd /k "cd server && node auto-backup.js --auto"

echo.
echo [3/4] 启动后端服务器...
timeout /t 2 /nobreak >nul
start "后端服务器" cmd /k "cd server && node index.js"

echo.
echo [4/4] 启动前端应用...
timeout /t 3 /nobreak >nul
start "前端应用" cmd /k "cd client && npm start"

echo.
echo =====================================
echo ✅ 系统启动完成！
echo =====================================
echo.
echo 📌 服务状态：
echo   - 自动备份: 运行中（每小时备份）
echo   - 后端服务: http://localhost:5000
echo   - 前端应用: http://localhost:3000
echo.
echo ⚠️  注意事项：
echo   - 保持所有窗口开启
echo   - 关闭窗口将停止对应服务
echo   - 重要操作前运行"立即备份.bat"
echo =====================================
echo.
echo 等待浏览器自动打开...
timeout /t 10 /nobreak >nul
start http://localhost:3000

echo.
echo 按任意键关闭此窗口（服务将继续运行）...
pause >nul