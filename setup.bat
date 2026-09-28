@echo off
setlocal
cd /d "%~dp0"

echo ============================================
echo  Kotoba Lens - first time setup
echo ============================================

where node >nul 2>nul
if errorlevel 1 (
  echo [ERROR] Node.js was not found. Install it from https://nodejs.org/ and try again.
  pause
  exit /b 1
)

where pnpm >nul 2>nul
if errorlevel 1 (
  echo pnpm not found. Installing pnpm with npm...
  call npm install -g pnpm
  if errorlevel 1 (
    echo [ERROR] Failed to install pnpm.
    pause
    exit /b 1
  )
)

echo.
echo [1/2] Installing packages...
call pnpm install --config.strict-dep-builds=false
if errorlevel 1 (
  echo [ERROR] pnpm install failed.
  pause
  exit /b 1
)

echo.
echo [2/2] Building the app...
call pnpm build
if errorlevel 1 (
  echo [ERROR] Build failed.
  pause
  exit /b 1
)

echo.
echo Setup finished. Double-click start.bat to launch the app.
pause
endlocal
