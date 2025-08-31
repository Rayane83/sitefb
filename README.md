# Portail Entreprise Flashback Fa (Custom Env)

Stack: FastAPI + MySQL (SQLAlchemy + Alembic) + Vite React TypeScript (à venir)

## Démarrage rapide (Docker)

1. Créez un fichier backend/.env basé sur backend/.env.example (renseignez DISCORD_* et secrets):

```
cp backend/.env.example backend/.env
```

2. Lancez Docker:

```
docker compose up --build
```

- API: http://localhost:8001
- Santé: GET http://localhost:8001/api/health

3. MySQL (conteneur db)
- Host: localhost
- Port: 3306
- Database: Sitefb
- User: Staff
- Password: Fbentreprise83@

## Endpoints déjà présents
- Auth Discord:
  - GET /api/auth/discord/login -> renvoie l'URL d'autorisation (Authorization Code + PKCE)
  - GET /api/auth/discord/callback -> échange code contre tokens, crée/maj utilisateur, met cookie de session, redirige FRONTEND_URL
  - GET /api/auth/discord/me -> renvoie le profil utilisateur connecté
  - POST /api/auth/discord/logout -> supprime le cookie de session

- Dotations:
  - GET /api/dotation/{guild_id}?entreprise=XYZ -> récupère dotation et lignes
  - POST /api/dotation/{guild_id} -> sauvegarde dotation + calcule salaire/prime par paliers

- Dashboard:
  - GET /api/dashboard/summary/{guild_id}?entreprise=XYZ
  - GET /api/dashboard/employee-count/{guild_id}?entreprise=XYZ

## Variables d'environnement backend (.env)

Voir `backend/.env.example`. Champs clés:
- DATABASE_URL=mysql+pymysql://Staff:...@51.75.200.221:3306/Sitefb
- DISCORD_CLIENT_ID, DISCORD_CLIENT_SECRET, DISCORD_BOT_TOKEN
- JWT_SECRET, ENCRYPTION_KEY (générez des valeurs fortes)
- FRONTEND_URL, REDIRECT_URI_DEV, REDIRECT_URI_PROD
- CORS_ORIGINS

## Migrations Alembic

Au démarrage, `alembic upgrade head` est exécuté. Pour lancer manuellement:

```
cd backend
alembic upgrade head
```

## Frontend

Le frontend Vite + React + TypeScript + Tailwind + shadcn/ui arrive dans le prochain commit (Login réel Discord, Dashboard cartes, Dotations tableau éditable).