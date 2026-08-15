@echo off
REM ===============================================================
REM  Auto-push this project to GitHub.
REM  Double-click to add-commit-push all changes in one go.
REM ===============================================================
cd /d "%~dp0"

echo ================================================================
echo  Pushing: %CD%
echo ================================================================
echo.

REM Build a timestamp like 2026-08-15_14-30 (locale-safe via PowerShell)
for /f "delims=" %%T in ('powershell -NoProfile -Command "Get-Date -Format 'yyyy-MM-dd_HH-mm'"') do set TS=%%T

echo [1/3] Staging all changes...
git add -A
if errorlevel 1 goto :fail

REM Check if there is anything to commit
git diff --cached --quiet
if %errorlevel%==0 (
    echo.
    echo No local changes to commit. Pushing anything unpushed anyway...
    goto :push
)

echo [2/3] Committing as "auto update %TS%"...
git commit -m "auto update %TS%"
if errorlevel 1 goto :fail

:push
echo [3/3] Pushing to GitHub...
git push
if errorlevel 1 goto :fail

echo.
echo ================================================================
echo  DONE. Changes uploaded to GitHub.
echo ================================================================
echo.
timeout /t 5 >nul
exit /b 0

:fail
echo.
echo ================================================================
echo  FAILED. See errors above.
echo ================================================================
pause
exit /b 1
