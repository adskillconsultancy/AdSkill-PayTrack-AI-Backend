@echo off
title AdSkill PayTrack AI Backend
echo ========================================================
echo   Starting AdSkill PayTrack AI Backend Environment
echo ========================================================
echo.

:: 1. Verify .env file
if not exist ".env" (
    echo [INFO] .env not found. Copying from .env.example...
    copy ".env.example" ".env"
    echo [OK] Created .env
)

:: 2. Verify node_modules
if not exist "node_modules\" (
    echo [INFO] node_modules not found. Installing dependencies...
    call npm install
)

:: 3. Run Prisma client generation
echo [INFO] Generating Prisma Client...
call npm run db:generate

:: 4. Start both Dev Server & Prisma Studio concurrently
echo.
echo ========================================================
echo   Running Backend Server (Port 5000) & Prisma Studio
echo   Backend URL:   http://localhost:5000/api/v1
echo   Swagger Docs:  http://localhost:5000/api/v1/docs
echo   Prisma Studio: http://localhost:5555
echo ========================================================
echo.

call npm run dev:all
pause
