@echo off
setlocal

cd /d "%~dp0"

echo.
echo ============================================================
echo   Building tavrostechinfo variant  ^(base=/progym/^)
echo   Output: webapp\dist\
echo ============================================================
call npm run build
if errorlevel 1 (
    echo.
    echo [ERROR] tavrostechinfo build failed.
    exit /b 1
)

echo.
echo ============================================================
echo   Building progym.co.in variant  ^(base=/^)
echo   Output: webapp\dist-root\
echo ============================================================
call npm run build:root
if errorlevel 1 (
    echo.
    echo [ERROR] progym.co.in build failed.
    exit /b 1
)

echo.
echo ============================================================
echo   Both builds completed successfully.
echo ------------------------------------------------------------
echo   Upload dist\        -^> /public_html/PROGYM/ggs/webapp/dist/
echo   Upload dist-root\   -^> progym.co.in document root
echo   ^(keep existing wc2026/ folder in place^)
echo ============================================================
echo.

endlocal
