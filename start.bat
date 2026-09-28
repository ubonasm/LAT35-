@echo off
setlocal
cd /d "%~dp0"

where pnpm >nul 2>nul
if errorlevel 1 (
  echo pnpm was not found. Run setup.bat first.
  pause
  exit /b 1
)

if not exist "node_modules" (
  echo Packages are missing. Running setup...
  call setup.bat
)

if not exist ".next\BUILD_ID" (
  echo Building the app...
  call pnpm build
  if errorlevel 1 (
    echo [ERROR] Build failed.
    pause
    exit /b 1
  )
)

echo ============================================
echo  Kotoba Lens is starting: http://localhost:3000
echo  Close this window (or press Ctrl+C) to stop.
echo ============================================

start "" cmd /c "timeout /t 4 /nobreak >nul & start "" http://localhost:3000"
call pnpm start
endlocal
