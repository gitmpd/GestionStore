#!/bin/bash
echo "============================================"
echo "  GestionStore - Installation"
echo "  Application de gestion de boutique"
echo "============================================"
echo ""

# Vérifier Node.js
if ! command -v node &> /dev/null; then
    echo "[ERREUR] Node.js n'est pas installé."
    echo ""
    echo "Installez Node.js (version 18 ou plus) :"
    echo "  - Linux/Mac : curl -fsSL https://fnm.vercel.app/install | bash && fnm install 22"
    echo "  - Windows   : https://nodejs.org/fr/download"
    echo ""
    exit 1
fi

NODE_VERSION=$(node -v)
echo "[OK] Node.js détecté : $NODE_VERSION"
echo ""

echo "[1/2] Installation du frontend..."
cd frontend && npm install --silent
if [ $? -ne 0 ]; then
    echo "[ERREUR] L'installation du frontend a échoué."
    exit 1
fi
echo "[OK] Frontend installé."
cd ..

echo ""
echo "[2/2] Installation du backend..."
cd backend && npm install --silent
if [ $? -ne 0 ]; then
    echo "[ERREUR] L'installation du backend a échoué."
    exit 1
fi
echo "[OK] Backend installé."
cd ..

echo ""
echo "============================================"
echo "  Installation terminée avec succès !"
echo "============================================"
echo ""
echo "Pour démarrer l'application :"
echo "  ./start.sh"
echo ""
echo "Comptes par défaut (mode hors-ligne) :"
echo "  Gérant  : admin@store.com / admin123"
echo "  Vendeur : vendeur@store.com / vendeur123"
echo ""
