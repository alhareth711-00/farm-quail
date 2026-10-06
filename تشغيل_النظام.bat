@echo off
chcp 65001 > nul
title نظام إدارة مزارع السمان ERP
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

:: Open default browser after 2 seconds
start "" cmd /c "timeout /t 2 /nobreak >nul & start http://localhost:5173"

:: Start the Vite development server
call npm run dev

if %errorlevel% neq 0 (
    echo.
    echo [تنبيه] توقف الخادم أو حدث خطأ أثناء التشغيل.
    pause
)
