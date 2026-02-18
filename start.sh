#!/bin/bash
echo "============================================"
echo "  GestionStore - Démarrage"
echo "============================================"
echo ""

# Vérifier que les dépendances sont installées
if [ ! -d "frontend/node_modules" ]; then
    echo "[!] Les dépendances ne sont pas installées."
    echo "    Lancez d'abord : ./install.sh"
    exit 1
fi

echo "Démarrage de l'application..."
echo ""
echo "  L'application sera accessible sur :"
echo "  http://localhost:5173"
echo ""
echo "  Pour l'ouvrir depuis d'autres PC du même réseau :"
echo "  http://$(hostname -I | awk '{print $1}'):5173"
echo ""
echo "  Comptes par défaut :"
echo "  Gérant  : admin@store.com / admin123"
echo "  Vendeur : vendeur@store.com / vendeur123"
echo ""
echo "  Appuyez sur Ctrl+C pour arrêter."
echo "============================================"
echo ""

cd frontend && npm run dev -- --host 0.0.0.0
