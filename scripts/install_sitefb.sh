#!/usr/bin/env bash
set -euo pipefail

# SiteFB one-shot installer for Ubuntu/Debian VPS
# - Installs Docker, Nginx, Certbot
# - Clones repo and checks out desired branch
# - Writes backend .env from prompts or env vars
# - Builds backend (Docker) + frontend (Node in Docker) and deploys
# - Configures Nginx reverse proxy + HTTPS (Let's Encrypt)
# Usage:
#   sudo bash install_sitefb.sh \
#     --domain flashbackfa-entreprise.fr \
#     --repo git@github.com:Rayane83/sitefb.git \
#     --branch feature/ui-shadcn \
#     --db-url "mysql+pymysql://Staff:Fbentreprise83@@51.75.200.221:3306/Sitefb"
# Optional (env or flags): DISCORD_CLIENT_ID, DISCORD_CLIENT_SECRET, DISCORD_BOT_TOKEN

DOMAIN=""
REPO="git@github.com:Rayane83/sitefb.git"
BRANCH="feature/ui-shadcn"
DB_URL="mysql+pymysql://Staff:Fbentreprise83@@51.75.200.221:3306/Sitefb"
APP_DIR="/opt/sitefb"
WWW_DIR="/var/www/sitefb"
EMAIL_LETSENCRYPT=""

# Parse args
while [[ $# -gt 0 ]]; do
  case "$1" in
    --domain) DOMAIN="$2"; shift 2 ;;
    --repo) REPO="$2"; shift 2 ;;
    --branch) BRANCH="$2"; shift 2 ;;
    --db-url) DB_URL="$2"; shift 2 ;;
    --email) EMAIL_LETSENCRYPT="$2"; shift 2 ;;
    *) echo "Unknown arg: $1"; exit 1 ;;
  esac
done

if [[ -z "$DOMAIN" ]]; then
  read -rp "Nom de domaine (ex: flashbackfa-entreprise.fr): " DOMAIN
fi
if [[ -z "$EMAIL_LETSENCRYPT" ]]; then
  read -rp "Email pour Let's Encrypt (recommandé): " EMAIL_LETSENCRYPT || true
fi

# Secrets via env or prompt
DISCORD_CLIENT_ID="${DISCORD_CLIENT_ID:-}"
DISCORD_CLIENT_SECRET="${DISCORD_CLIENT_SECRET:-}"
DISCORD_BOT_TOKEN="${DISCORD_BOT_TOKEN:-}"
if [[ -z "$DISCORD_CLIENT_ID" ]]; then read -rp "DISCORD_CLIENT_ID: " DISCORD_CLIENT_ID; fi
if [[ -z "$DISCORD_CLIENT_SECRET" ]]; then read -rp "DISCORD_CLIENT_SECRET: " DISCORD_CLIENT_SECRET; fi
if [[ -z "$DISCORD_BOT_TOKEN" ]]; then read -rp "DISCORD_BOT_TOKEN: " DISCORD_BOT_TOKEN; fi

PRINCIPAL_GUILD_ID="1404608015230832742"
STAFF_ROLE_ID="1404608105723068547"

# Generate secrets if not provided
JWT_SECRET="${JWT_SECRET:-}"
if [[ -z "$JWT_SECRET" ]]; then JWT_SECRET=$(openssl rand -hex 64); fi
ENCRYPTION_KEY="${ENCRYPTION_KEY:-}"
if [[ -z "$ENCRYPTION_KEY" ]]; then ENCRYPTION_KEY=$(python3 - <<'PY'
from cryptography.fernet import Fernet
print(Fernet.generate_key().decode())
PY
); fi

# 1) System deps
export DEBIAN_FRONTEND=noninteractive
apt-get update -y
apt-get install -y ca-certificates curl gnupg lsb-release git nginx software-properties-common
install -m 0755 -d /etc/apt/keyrings || true
if [[ ! -f /etc/apt/keyrings/docker.gpg ]]; then
  curl -fsSL https://download.docker.com/linux/$(. /etc/os-release; echo "$ID")/gpg | gpg --dearmor -o /etc/apt/keyrings/docker.gpg
  chmod a+r /etc/apt/keyrings/docker.gpg
fi
if [[ ! -f /etc/apt/sources.list.d/docker.list ]]; then
  echo "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.gpg] https://download.docker.com/linux/$(. /etc/os-release; echo "$ID") $(lsb_release -cs) stable" > /etc/apt/sources.list.d/docker.list
fi
apt-get update -y
apt-get install -y docker-ce docker-ce-cli containerd.io docker-buildx-plugin docker-compose-plugin
systemctl enable --now docker
apt-get install -y certbot python3-certbot-nginx

# 2) Clone repo
mkdir -p "$APP_DIR"
if [[ ! -d "$APP_DIR/.git" ]]; then
  git clone "$REPO" "$APP_DIR"
fi
cd "$APP_DIR"
 git fetch origin
 git checkout "$BRANCH"
 git pull origin "$BRANCH" || true

# 3) Backend .env
cat > "$APP_DIR/backend/.env" <<EOF
DATABASE_URL=$DB_URL
DISCORD_CLIENT_ID=$DISCORD_CLIENT_ID
DISCORD_CLIENT_SECRET=$DISCORD_CLIENT_SECRET
DISCORD_BOT_TOKEN=$DISCORD_BOT_TOKEN
PRINCIPAL_GUILD_ID=$PRINCIPAL_GUILD_ID
STAFF_ROLE_ID=$STAFF_ROLE_ID
ENV=prod
FRONTEND_URL=https://$DOMAIN
REDIRECT_URI_DEV=http://localhost:5173/api/auth/discord/callback
REDIRECT_URI_PROD=https://$DOMAIN/api/auth/discord/callback
JWT_SECRET=$JWT_SECRET
ENCRYPTION_KEY=$ENCRYPTION_KEY
CORS_ORIGINS=https://$DOMAIN
SUPERADMIN_DISCORD_ID=462716512252329996
EOF

# 4) Build & start backend
cd "$APP_DIR"
docker compose up -d --build
sleep 3
curl -fsS http://127.0.0.1:8001/api/health || true

# 5) Build frontend via Node in Docker
cd "$APP_DIR/frontend"
docker run --rm -v "$PWD":/app -w /app node:20 bash -lc "corepack enable && yarn install && yarn build"
mkdir -p "$WWW_DIR"
rsync -a "$APP_DIR/frontend/dist/" "$WWW_DIR/"

# 6) Nginx vhost
cat > /etc/nginx/sites-available/sitefb.conf <<NGX
server {
  listen 80;
  server_name $DOMAIN;

  root $WWW_DIR;
  index index.html;

  location / {
    try_files $uri /index.html;
  }

  location /api/ {
    proxy_pass http://127.0.0.1:8001/;
    proxy_set_header Host $host;
    proxy_set_header X-Real-IP $remote_addr;
    proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    proxy_set_header X-Forwarded-Proto $scheme;
  }
}
NGX
ln -sf /etc/nginx/sites-available/sitefb.conf /etc/nginx/sites-enabled/sitefb.conf
nginx -t
systemctl reload nginx

# 7) HTTPS with certbot
if [[ -n "$EMAIL_LETSENCRYPT" ]]; then
  certbot --nginx -d "$DOMAIN" -m "$EMAIL_LETSENCRYPT" --agree-tos --redirect || true
else
  echo "[INFO] Skipping certbot automatic run (no email provided). You can run: certbot --nginx -d $DOMAIN --agree-tos -m you@example.com --redirect"
fi

# 8) Output
cat <<OUT

Installation terminée.
- Frontend: https://$DOMAIN
- Backend health: http://127.0.0.1:8001/api/health (interne VPS)
- OAuth redirect (prod): https://$DOMAIN/api/auth/discord/callback

Backend env: $APP_DIR/backend/.env
Pour relancer après reboot: docker compose -f $APP_DIR/docker-compose.yml up -d
Logs backend: docker compose -f $APP_DIR/docker-compose.yml logs -f backend
OUT