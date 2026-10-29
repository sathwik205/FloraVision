@echo off
cd /d "%~dp0"
where node >nul 2>nul
if errorlevel 1 (
  echo Install Node.js 22 or newer from https://nodejs.org/en/download then reopen this file.
  pause
  exit /b 1
)
if not exist package.json (
  echo Open this launcher from the extracted project folder containing package.json.
  pause
  exit /b 1
)
if not exist node_modules (
  call npm.cmd ci
  if errorlevel 1 (
    pause
    exit /b 1
  )
)
echo Open http://localhost:3000 after the server is ready. Press Ctrl+C to stop.
call npm.cmd run dev
pause
