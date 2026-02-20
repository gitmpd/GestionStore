@echo off
chcp 65001 >nul
echo ============================================
echo   GestionStore - Demarrage (Frontend)
echo ============================================
echo.

if not exist "frontend\node_modules" (
    echo [!] Les dependances ne sont pas installees.
    echo     Lancez d'abord : install.bat
    pause
    exit /b 1
)

echo Demarrage du frontend...
echo.
echo   L'application sera accessible sur :
echo   http://localhost:5173
echo.
echo   Fermez cette fenetre pour arreter.
echo ============================================
echo.

cd frontend
call npm run dev -- --host 0.0.0.0

rem Optionnel : si backend\.env contient DATABASE_URL, proposer d'executer migrations/seeds
if exist backend\.env (
    findstr /R /C:"DATABASE_URL" backend\.env >nul 2>&1
    if %errorlevel%==0 (
        set /p ans=backend\.env contient DATABASE_URL - exécuter migrations et seed avant de lancer le frontend ? (y/N) : 
        if /I "%ans%"=="y" (
            echo Execution des migrations et seeds...
            cd ..\backend
            call npx prisma migrate deploy 2>nul || echo [WARN] prisma migrate deploy a echoue
            call npm run db:seed 2>nul || echo [INFO] db:seed non trouve ou a echoue
            call npx tsx prisma/seed-saas.ts 2>nul || echo [INFO] seed-saas non execute (optionnel)
            cd ..\frontend
        )
    )
)
