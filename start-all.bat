@echo off
chcp 65001 >nul
echo ============================================
echo   GestionStore - Demarrage complet
echo   Frontend + Backend
echo ============================================
echo.

if not exist "frontend\node_modules" (
    echo [!] Les dependances ne sont pas installees.
    echo     Lancez d'abord : install.bat
    pause
    exit /b 1
)

if not exist "backend\.env" (
    echo [!] Le fichier backend\.env n'existe pas.
    echo     Creation depuis .env.example...
    copy backend\.env.example backend\.env >nul
    echo [OK] backend\.env cree. Modifiez-le si necessaire.
    echo.
)

rem Si DATABASE_URL presente dans backend\.env, executer migrations et seeds
findstr /R /C:"DATABASE_URL" backend\.env >nul 2>&1
if %errorlevel%==0 (
    echo.
    echo [INFO] DATABASE_URL detectee dans backend\.env - execution des migrations et seeds (si possible)
    cd backend
    call npx prisma migrate deploy 2>nul || echo [WARN] prisma migrate deploy a echoue - verifiez la connexion a la base
    call npm run db:seed 2>nul || echo [INFO] script db:seed non trouve ou a echoue
    call npx tsx prisma/seed-saas.ts 2>nul || echo [INFO] seed-saas non execute (optionnel)
    cd ..
)

echo Demarrage du backend (port 3001)...
start "GestionStore Backend" cmd /c "cd backend && npm run dev"

timeout /t 3 /nobreak >nul

echo Demarrage du frontend (port 5173)...
echo.
echo ============================================
echo   Tout est lance !
echo.
echo   Frontend : http://localhost:5173
echo   Backend  : http://localhost:3001
echo.
echo   Fermez les fenetres pour arreter.
echo ============================================
echo.

cd frontend
call npm run dev -- --host 0.0.0.0
