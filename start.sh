#!/bin/bash
echo "============================================"
echo "  GestionStore - Démarrage (Frontend)"
echo "============================================"
echo ""

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
cd "$SCRIPT_DIR"

if [ ! -d "frontend/node_modules" ]; then
    echo "[!] Les dépendances ne sont pas installées."
    echo "    Lancez d'abord : ./install.sh"
    exit 1
fi

LOCAL_IP=$(hostname -I 2>/dev/null | awk '{print $1}' || echo "non disponible")

echo "Démarrage du frontend..."
echo ""
echo "  L'application sera accessible sur :"
echo "  ➜ Local  : http://localhost:5173"
echo "  ➜ Réseau : http://${LOCAL_IP}:5173"
echo ""
echo "  Appuyez sur Ctrl+C pour arrêter."
echo "============================================"
echo ""

cd "$SCRIPT_DIR/frontend" && npm run dev -- --host 0.0.0.0

# Optionnel : si backend/.env contient DATABASE_URL, proposer d'exécuter migrations/seeds
if [ -f "$SCRIPT_DIR/backend/.env" ] && grep -q "DATABASE_URL" "$SCRIPT_DIR/backend/.env" 2>/dev/null; then
    read -p "backend/.env contient DATABASE_URL — exécuter migrations et seed avant de lancer le frontend ? (y/N) " ans
    if [[ "$ans" == "y" || "$ans" == "Y" ]]; then
        echo "Exécution des migrations et seeds..."
        cd "$SCRIPT_DIR/backend"
        npx prisma migrate deploy || echo "[WARN] prisma migrate deploy a échoué"
        npm run db:seed 2>/dev/null || echo "[INFO] db:seed non trouvé ou a échoué"
        npx tsx prisma/seed-saas.ts 2>/dev/null || echo "[INFO] seed-saas non exécuté (optionnel)"
        echo "Retour au frontend..."
        cd "$SCRIPT_DIR/frontend"
    fi
fi
