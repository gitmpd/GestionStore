#!/bin/bash
set -e

echo "============================================"
echo "  GestionStore - Installation"
echo "  Application de gestion de boutique"
echo "============================================"
echo ""

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
cd "$SCRIPT_DIR"

if ! command -v node &> /dev/null; then
    echo "[ERREUR] Node.js n'est pas installé."
    echo ""
    echo "Installez Node.js (version 18 ou plus) :"
    echo "  - Linux : curl -fsSL https://deb.nodesource.com/setup_22.x | sudo -E bash - && sudo apt-get install -y nodejs"
    echo "  - Mac   : brew install node"
    echo "  - Windows : https://nodejs.org/fr/download"
    echo ""
    exit 1
fi

NODE_VERSION=$(node -v)
NODE_MAJOR=$(echo "$NODE_VERSION" | sed 's/v//' | cut -d. -f1)

if [ "$NODE_MAJOR" -lt 18 ]; then
    echo "[ERREUR] Node.js $NODE_VERSION détecté, mais la version 18+ est requise."
    echo "         Mettez à jour Node.js : https://nodejs.org/fr/download"
    exit 1
fi

echo "[OK] Node.js détecté : $NODE_VERSION"
echo ""

echo "[1/3] Installation du frontend..."
cd "$SCRIPT_DIR/frontend"
npm install
if [ $? -ne 0 ]; then
    echo "[ERREUR] L'installation du frontend a échoué."
    echo "         Essayez : rm -rf node_modules && npm install"
    exit 1
fi
echo "[OK] Frontend installé."

echo ""
echo "[2/3] Installation du backend..."
cd "$SCRIPT_DIR/backend"
npm install
if [ $? -ne 0 ]; then
    echo "[ERREUR] L'installation du backend a échoué."
    echo "         Essayez : rm -rf node_modules && npm install"
    exit 1
fi
echo "[OK] Backend installé."

echo ""
echo "[3/3] Génération du client Prisma..."
cd "$SCRIPT_DIR/backend"
npx prisma generate 2>/dev/null || echo "[!] Prisma generate ignoré (normal si pas de base de données configurée)"
echo "[OK] Client Prisma prêt."

# Si le fichier .env du backend est absent, copier l'exemple et demander à l'utilisateur de le vérifier
if [ ! -f "$SCRIPT_DIR/backend/.env" ] && [ -f "$SCRIPT_DIR/backend/.env.example" ]; then
    echo ""
    echo "[INFO] backend/.env absent — copie de .env.example -> backend/.env"
    cp "$SCRIPT_DIR/backend/.env.example" "$SCRIPT_DIR/backend/.env"
    echo "Veuillez éditer backend/.env pour ajuster DATABASE_URL et secrets si nécessaire."
fi

# Si DATABASE_URL est présent dans backend/.env, tenter d'appliquer les migrations et d'exécuter le seed
if grep -q "DATABASE_URL" "$SCRIPT_DIR/backend/.env" 2>/dev/null; then
    echo ""
    echo "[INFO] DATABASE_URL détectée dans backend/.env — exécution des migrations et seed (si possible)"
    cd "$SCRIPT_DIR/backend"
    if command -v npx >/dev/null 2>&1; then
        echo "-> Exécution : npx prisma migrate deploy"
        npx prisma migrate deploy || echo "[WARN] prisma migrate deploy a échoué — vérifiez backend/.env et la connexion à la base de données"
        echo "-> Exécution : npm run db:seed (si disponible)"
        npm run db:seed 2>/dev/null || echo "[INFO] script db:seed non trouvé ou a échoué (continuation)"
        echo "-> Exécution : npx tsx prisma/seed-saas.ts (optionnel)"
        npx tsx prisma/seed-saas.ts 2>/dev/null || echo "[INFO] seed-saas non exécuté (optionnel)"
    else
        echo "[WARN] npx non trouvé — impossible d'exécuter les migrations/seed depuis ce script."
    fi
fi

cd "$SCRIPT_DIR"

echo ""
echo "============================================"
echo "  Installation terminée avec succès !"
echo "============================================"
echo ""
echo "Pour démarrer l'application (frontend seul) :"
echo "  ./start.sh"
echo ""
echo "Pour démarrer frontend + backend :"
echo "  ./start-all.sh"
echo ""
echo "Pour déployer avec Docker :"
echo "  docker compose up -d --build"
echo ""
