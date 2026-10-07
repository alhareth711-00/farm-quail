@echo off
chcp 65001 > nul
title Quail Farm ERP - نظام إدارة مزارع السمان الذكي
color 0A

echo ==============================================================
echo             نظام إدارة مزارع السمان الذكي ERP v2.0           
echo ==============================================================
echo.
echo  [1/2] جاري تجهيز بيئة التشغيل المحلية...
echo  [2/2] جاري تشغيل الخادم وفتح المتصفح تلقائياً...
echo.
echo ==============================================================
echo  الرابط المباشر: http://localhost:5173
echo  (اترك هذه النافذة مفتوحة أثناء استخدامك للنظام)
echo ==============================================================
echo.

cd /d "%~dp0"

:: Wait 2 seconds and open browser
start "" cmd /c "timeout /t 2 /nobreak >nul & start http://localhost:5173"

:: Run Vite Dev Server
call npm run dev -- --host --port 5173

if %errorlevel% neq 0 (
    echo.
    echo [تنبيه] توقف الخادم أو حدث خطأ أثناء التشغيل.
    pause
)
