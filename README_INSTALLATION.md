# 🚀 Installation Flashback Enterprise Portal - Migration SQLite + npm

## ✅ PROBLÈME RÉSOLU !

L'application a été **entièrement migrée** et fonctionne maintenant avec :
- ✅ **SQLite** (plus simple que MySQL pour le développement)
- ✅ **npm** (au lieu de yarn) 
- ✅ **Architecture moderne** avec API REST complète
- ✅ **Base de données relationnelle** avec SQLAlchemy

---

## 🔧 Installation Rapide

### 1. **Backend (Python + SQLite)**

```bash
cd /app/backend

# Installer les dépendances Python
pip install -r requirements.txt

# Initialiser la base de données SQLite
python init_mysql.py

# Démarrer le backend
python server.py
```

### 2. **Frontend (React + npm)**

```bash
cd /app/frontend

# Installer les dépendances avec npm
npm install

# Démarrer en développement
npm start

# Ou construire pour production
npm run build
npm run serve
```

---

## 🌐 **Accès à l'application**

- **Frontend** : http://localhost:3000
- **Backend API** : http://localhost:8001/api
- **Health Check** : http://localhost:8001/api/health

---

## 📊 **API Endpoints Disponibles**

### Dashboard
- `GET /api/dashboard/summary/{guild_id}?entreprise=test`
- `GET /api/dashboard/employee-count/{guild_id}?entreprise=test`

### Entreprises
- `GET /api/enterprises/{guild_id}`
- `POST /api/enterprises/{guild_id}`

### Dotations
- `GET /api/dotation/{guild_id}?entreprise=test`
- `POST /api/dotation/{guild_id}`

### Configuration
- `GET /api/staff/config/{guild_id}`
- `POST /api/staff/config/{guild_id}`

### Archives
- `GET /api/archive/{guild_id}`
- `POST /api/archive/{guild_id}`

### Système de blanchiment
- `GET /api/blanchiment/state/{scope}`
- `POST /api/blanchiment/state/{scope}`

### Documents
- `POST /api/documents/upload/{guild_id}`
- `GET /api/documents/{guild_id}?entreprise=test`

---

## 🗄️ **Base de données**

**SQLite** : `flashback_enterprise.db`

**Tables créées** :
- `users` - Utilisateurs Discord
- `guilds` - Serveurs Discord  
- `user_guild_roles` - Rôles utilisateurs
- `enterprises` - Entreprises
- `dotation_data` + `dotation_rows` - Données de dotations
- `dashboard_summaries` - Résumés dashboard
- `archive_entries` - Entrées d'archives
- `documents` - Documents uploadés
- `blanchiment_states` - États de blanchiment
- `staff_configs` - Configurations staff
- `tax_brackets` - Tranches fiscales
- `company_configs` - Configurations entreprises

---

## 🔧 **Commands utiles**

```bash
# Backend
cd /app/backend
python server.py                    # Démarrer backend
python init_mysql.py               # Réinitialiser DB
pip install -r requirements.txt    # Installer dépendances

# Frontend  
cd /app/frontend
npm start                          # Développement
npm run build                      # Production
npm install                        # Installer dépendances
npm run serve                      # Servir en production

# Status des services
sudo supervisorctl status          # Voir status
sudo supervisorctl restart all     # Redémarrer tout
```

---

## 🧪 **Tests API**

```bash
# Health check
curl http://localhost:8001/api/health

# Dashboard
curl "http://localhost:8001/api/dashboard/summary/test_guild?entreprise=test"

# Employee count
curl "http://localhost:8001/api/dashboard/employee-count/test_guild?entreprise=test"

# Enterprises
curl http://localhost:8001/api/enterprises/test_guild
```

---

## 🎯 **Fonctionnalités disponibles**

✅ **Authentification Discord** - OAuth intégré  
✅ **Dashboard financier** - CA, bénéfices, impôts  
✅ **Système de dotations** - Calculs salaires et primes  
✅ **Gestion entreprises** - CRUD complet  
✅ **Archives** - Historique des opérations  
✅ **Upload documents** - Factures et diplômes  
✅ **Système fiscal** - Calculs d'impôts automatisés  
✅ **Blanchiment** - Gestion des pourcentages  
✅ **Configuration avancée** - Staff et entreprises  
✅ **API REST complète** - 20+ endpoints  

---

## 🔥 **MIGRATION RÉUSSIE !**

**Avant** : MongoDB + yarn + configuration complexe
**Maintenant** : SQLite + npm + installation simple

L'application **Flashback Enterprise Portal** est maintenant opérationnelle avec une architecture moderne et simplifiée ! 🚀