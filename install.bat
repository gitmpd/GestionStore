@echo off
chcp 65001 >nul
echo ============================================
echo   GestionStore - Installation
echo   Application de gestion de boutique
echo ============================================
echo.

where node >nul 2>nul
if %errorlevel% neq 0 (
    echo [ERREUR] Node.js n'est pas installe.
    echo.
    echo Installez Node.js depuis : https://nodejs.org/fr/download
    echo.
    pause
    exit /b 1
)

for /f "tokens=*" %%i in ('node -v') do set NODE_VERSION=%%i
echo [OK] Node.js detecte : %NODE_VERSION%
echo.

echo [1/2] Installation du frontend...
cd frontend
call npm install --silent
if %errorlevel% neq 0 (
    echo [ERREUR] L'installation du frontend a echoue.
    pause
    exit /b 1
)
echo [OK] Frontend installe.
cd ..

echo.
echo [2/2] Installation du backend...
cd backend
call npm install --silent
if %errorlevel% neq 0 (
    echo [ERREUR] L'installation du backend a echoue.
    pause
    exit /b 1
)
echo [OK] Backend installe.
cd ..

echo.
echo ============================================
echo   Installation terminee avec succes !
echo ============================================
echo.
echo Pour demarrer l'application :
echo   start.bat
echo.
echo Comptes par defaut (mode hors-ligne) :
echo   Gerant  : admin@store.com / admin123
echo   Vendeur : vendeur@store.com / vendeur123
echo.
pause
