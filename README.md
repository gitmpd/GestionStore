# GestionStore — Application de Gestion de Boutique

Application web progressive (PWA) pour la gestion d'une boutique, fonctionnant **en ligne et hors ligne**.

> &copy; Djamatigui 2026

---

## Fonctionnalités

- **Gestion des produits** : catalogue, catégories, codes-barres, prix achat/vente
- **Gestion du stock** : mouvements (entrées/sorties/ajustements), alertes stock bas
- **Point de vente** : ventes rapides, panier, paiement (espèces/crédit/mobile money)
- **Gestion des clients** : fiche client, système de crédit, historique des transactions
- **Gestion des fournisseurs** : fiches, commandes, réception de marchandise
- **Rapports** : ventes par jour, bénéfices, graphiques
- **Rôles** : Gérant (accès complet) et Vendeur (accès limité)
- **Journal d'activité** : audit de toutes les actions (qui a fait quoi et quand)
- **Mode hors ligne** : données stockées localement (IndexedDB), synchronisation automatique

---

## Installation sur un nouveau PC

### Prérequis

Vous avez besoin de **Node.js** (version 18 ou plus récente).

**Pour installer Node.js :**
- **Linux (Ubuntu/Debian)** :
  ```bash
  curl -fsSL https://deb.nodesource.com/setup_22.x | sudo -E bash -
  sudo apt-get install -y nodejs
  ```
- **Windows** : Télécharger depuis [nodejs.org](https://nodejs.org/fr/download) et suivre l'installateur
- **Mac** :
  ```bash
  brew install node
  ```

Pour vérifier que Node.js est bien installé :
```bash
node -v    # doit afficher v18.x.x ou plus
npm -v     # doit afficher un numéro de version
```

### Étape 1 : Copier le projet

Copiez le dossier `GestionStore` sur le nouvel ordinateur (clé USB, zip, transfert réseau...).

### Étape 2 : Installer les dépendances

**Linux / Mac :**
```bash
cd GestionStore
./install.sh
```

**Windows :**
Double-cliquez sur `install.bat` ou dans l'invite de commandes :
```cmd
cd GestionStore
install.bat
```

**Manuellement (si les scripts ne marchent pas) :**
```bash
cd GestionStore/frontend
npm install

cd ../backend
npm install
```

### Étape 3 : Démarrer l'application

**Linux / Mac :**
```bash
./start.sh
```

**Windows :**
Double-cliquez sur `start.bat`

**Manuellement :**
```bash
cd frontend
npm run dev -- --host 0.0.0.0
```

### Étape 4 : Ouvrir dans le navigateur

Ouvrez votre navigateur (Chrome, Edge, Firefox) et allez sur :
```
http://localhost:5173
```

**Comptes par défaut (mode hors-ligne) :**

| Rôle    | Email              | Mot de passe |
|---------|-------------------|-------------|
| Gérant  | admin@store.com    | admin123    |
| Vendeur | vendeur@store.com  | vendeur123  |

> Après connexion, allez dans **Paramètres > Données** et cliquez **"Charger les données de test"** pour remplir l'application avec des exemples.

---

## Accès depuis d'autres ordinateurs du réseau

Si plusieurs PC sont sur le **même réseau Wi-Fi/LAN**, les autres machines peuvent accéder à l'application sans installation :

1. Le script `start.sh` affiche l'adresse IP locale (ex: `http://192.168.1.50:5173`)
2. Sur les autres PC, ouvrir cette adresse dans un navigateur
3. Le navigateur Chrome/Edge proposera d'**installer l'application** comme une app (icône dans la barre d'adresse)

---

## Avec le backend (synchronisation entre PC) — Optionnel

Le backend est nécessaire uniquement si vous voulez **synchroniser les données entre plusieurs appareils**.

### Prérequis supplémentaires

- PostgreSQL installé et lancé

### Configuration

```bash
cd backend

# Copier le fichier de configuration
cp .env.example .env

# Modifier .env si nécessaire (URL de la base de données)

# Créer les tables dans la base
npx prisma db push

# Créer l'utilisateur admin
npm run db:seed

# Lancer le serveur backend
npm run dev
```

Le backend tourne sur `http://localhost:3001`.

Dans l'application, allez dans **Paramètres > Synchronisation** et entrez l'URL du serveur :
```
http://localhost:3001
```

---

## Structure du projet

```
GestionStore/
├── frontend/           # Application React PWA
│   ├── src/
│   │   ├── components/ # Composants réutilisables (UI, Layout)
│   │   ├── db/         # Base de données IndexedDB (Dexie)
│   │   ├── pages/      # Pages de l'application
│   │   ├── services/   # Services (sync, audit)
│   │   ├── stores/     # État global (Zustand)
│   │   └── types/      # Types TypeScript
│   └── package.json
├── backend/            # API REST Express + Prisma
│   ├── prisma/         # Schéma de la base de données
│   ├── src/
│   │   ├── routes/     # Routes API
│   │   └── middleware/  # Auth, erreurs
│   └── package.json
├── install.sh          # Script d'installation (Linux/Mac)
├── install.bat         # Script d'installation (Windows)
├── start.sh            # Script de démarrage (Linux/Mac)
├── start.bat           # Script de démarrage (Windows)
└── README.md           # Ce fichier
```

## Stack technique

- **Frontend** : React 19, TypeScript, Vite, Tailwind CSS 4, Dexie.js (IndexedDB), Zustand, Recharts
- **Backend** : Node.js, Express 5, TypeScript, Prisma 6, PostgreSQL
- **PWA** : vite-plugin-pwa (Workbox)
