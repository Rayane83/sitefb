#!/bin/bash

# Script de déploiement pour Flashback Enterprise Portal
# MySQL + npm + nginx

set -e

echo "🚀 Début du déploiement Flashback Enterprise Portal"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

print_status() {
    echo -e "${GREEN}✅ $1${NC}"
}

print_warning() {
    echo -e "${YELLOW}⚠️  $1${NC}"
}

print_error() {
    echo -e "${RED}❌ $1${NC}"
}

print_info() {
    echo -e "${BLUE}ℹ️  $1${NC}"
}

# Check if running as root
if [[ $EUID -eq 0 ]]; then
   print_warning "Ce script ne doit pas être exécuté en tant que root pour des raisons de sécurité"
fi

# Create necessary directories
print_info "Création des répertoires nécessaires..."
mkdir -p /var/log/flashback-enterprise
mkdir -p /var/lib/flashback-enterprise
mkdir -p /etc/flashback-enterprise

# 1. Install system dependencies
print_info "Installation des dépendances système..."

# Check OS and install packages accordingly
if command -v apt-get &> /dev/null; then
    # Ubuntu/Debian
    sudo apt-get update
    sudo apt-get install -y mysql-server nginx nodejs npm python3 python3-pip python3-venv supervisor
elif command -v yum &> /dev/null; then
    # CentOS/RHEL
    sudo yum update -y
    sudo yum install -y mysql-server nginx nodejs npm python3 python3-pip supervisor
elif command -v dnf &> /dev/null; then
    # Fedora
    sudo dnf update -y
    sudo dnf install -y mysql-server nginx nodejs npm python3 python3-pip supervisor
else
    print_error "OS non supporté. Veuillez installer manuellement: mysql-server, nginx, nodejs, npm, python3"
    exit 1
fi

print_status "Dépendances système installées"

# 2. Configure MySQL
print_info "Configuration de MySQL..."

# Start MySQL service
sudo systemctl start mysql
sudo systemctl enable mysql

# Create database and user
DB_NAME="flashback_enterprise_db"
DB_USER="flashback_user"
DB_PASS="$(openssl rand -base64 32)"

print_info "Création de la base de données MySQL..."

sudo mysql -e "CREATE DATABASE IF NOT EXISTS ${DB_NAME};"
sudo mysql -e "CREATE USER IF NOT EXISTS '${DB_USER}'@'localhost' IDENTIFIED BY '${DB_PASS}';"
sudo mysql -e "GRANT ALL PRIVILEGES ON ${DB_NAME}.* TO '${DB_USER}'@'localhost';"
sudo mysql -e "FLUSH PRIVILEGES;"

# Update .env file with database credentials
print_info "Mise à jour du fichier .env avec les identifiants MySQL..."
cat > /app/backend/.env << EOF
MYSQL_URL="mysql://${DB_USER}:${DB_PASS}@localhost:3306/${DB_NAME}"
DB_NAME="${DB_NAME}"
CORS_ORIGINS="*"
DISCORD_CLIENT_ID="1402231031804723210"
DISCORD_CLIENT_SECRET="AMekCLqNZjziBB8s9mdqR1iixVzITVM6"
EOF

print_status "MySQL configuré et base de données créée"

# 3. Setup Python backend
print_info "Configuration du backend Python..."

cd /app/backend

# Create virtual environment
python3 -m venv venv
source venv/bin/activate

# Install Python dependencies
pip install -r requirements.txt

print_status "Backend Python configuré"

# 4. Setup Node.js frontend
print_info "Configuration du frontend Node.js..."

cd /app/frontend

# Install dependencies with npm
npm install

# Build the frontend
npm run build

print_status "Frontend Node.js configuré et construit"

# 5. Configure nginx
print_info "Configuration de nginx..."

# Backup original nginx config
sudo cp /etc/nginx/nginx.conf /etc/nginx/nginx.conf.backup

# Copy our nginx configuration
sudo cp /app/nginx.conf /etc/nginx/nginx.conf

# Test nginx configuration
sudo nginx -t

# Start and enable nginx
sudo systemctl start nginx
sudo systemctl enable nginx

print_status "nginx configuré et démarré"

# 6. Configure supervisor for process management
print_info "Configuration de supervisor..."

# Create supervisor configuration for backend
sudo tee /etc/supervisor/conf.d/flashback-backend.conf > /dev/null << EOF
[program:flashback-backend]
command=/app/backend/venv/bin/python /app/backend/server.py
directory=/app/backend
user=www-data
autostart=true
autorestart=true
stderr_logfile=/var/log/flashback-enterprise/backend.err.log
stdout_logfile=/var/log/flashback-enterprise/backend.out.log
environment=PATH="/app/backend/venv/bin"
EOF

# Reload supervisor configuration
sudo supervisorctl reread
sudo supervisorctl update

# Start the backend service
sudo supervisorctl start flashback-backend

print_status "Supervisor configuré et backend démarré"

# 7. Setup systemd services
print_info "Configuration des services systemd..."

# Create systemd service for the application
sudo tee /etc/systemd/system/flashback-enterprise.service > /dev/null << EOF
[Unit]
Description=Flashback Enterprise Portal
After=network.target mysql.service
Requires=mysql.service

[Service]
Type=forking
User=www-data
Group=www-data
WorkingDirectory=/app
Environment=NODE_ENV=production
ExecStart=/usr/bin/supervisorctl start flashback-backend
ExecStop=/usr/bin/supervisorctl stop flashback-backend
Restart=always
RestartSec=10

[Install]
WantedBy=multi-user.target
EOF

sudo systemctl daemon-reload
sudo systemctl enable flashback-enterprise

print_status "Services systemd configurés"

# 8. Setup firewall (optional)
print_info "Configuration du pare-feu..."

if command -v ufw &> /dev/null; then
    sudo ufw allow 80/tcp
    sudo ufw allow 443/tcp
    sudo ufw allow 22/tcp
    print_info "Ports 80, 443, et 22 ouverts avec ufw"
elif command -v firewall-cmd &> /dev/null; then
    sudo firewall-cmd --permanent --add-service=http
    sudo firewall-cmd --permanent --add-service=https
    sudo firewall-cmd --permanent --add-service=ssh
    sudo firewall-cmd --reload
    print_info "Services HTTP, HTTPS, et SSH autorisés avec firewalld"
fi

# 9. Create startup script
print_info "Création du script de démarrage..."

cat > /app/start.sh << 'EOF'
#!/bin/bash

# Script de démarrage pour Flashback Enterprise Portal

echo "🚀 Démarrage de Flashback Enterprise Portal"

# Start MySQL
sudo systemctl start mysql

# Start backend
cd /app/backend
source venv/bin/activate
sudo supervisorctl start flashback-backend

# Start nginx
sudo systemctl start nginx

echo "✅ Flashback Enterprise Portal démarré avec succès"
echo "🌐 Application disponible sur: http://localhost"
echo "📊 API disponible sur: http://localhost/api"

# Show status
echo "📈 Statut des services:"
sudo systemctl status mysql nginx --no-pager -l
sudo supervisorctl status flashback-backend
EOF

chmod +x /app/start.sh

# 10. Create stop script
cat > /app/stop.sh << 'EOF'
#!/bin/bash

echo "🛑 Arrêt de Flashback Enterprise Portal"

# Stop services
sudo supervisorctl stop flashback-backend
sudo systemctl stop nginx

echo "✅ Services arrêtés"
EOF

chmod +x /app/stop.sh

# 11. Final status check
print_info "Vérification finale des services..."

# Check MySQL
if sudo systemctl is-active --quiet mysql; then
    print_status "MySQL: Actif"
else
    print_error "MySQL: Inactif"
fi

# Check nginx
if sudo systemctl is-active --quiet nginx; then
    print_status "nginx: Actif"
else
    print_error "nginx: Inactif"
fi

# Check backend
if sudo supervisorctl status flashback-backend | grep -q RUNNING; then
    print_status "Backend: Actif"
else
    print_error "Backend: Inactif"
fi

# 12. Display final information
echo
echo "🎉 ${GREEN}Déploiement terminé avec succès !${NC}"
echo
echo "📋 ${BLUE}Informations de déploiement:${NC}"
echo "   🌐 Application web: http://localhost"
echo "   📊 API backend: http://localhost/api"
echo "   🗄️  Base de données: MySQL (${DB_NAME})"
echo "   📁 Répertoire: /app"
echo
echo "🔧 ${BLUE}Commandes utiles:${NC}"
echo "   Démarrer: ./start.sh"
echo "   Arrêter: ./stop.sh"
echo "   Statut backend: sudo supervisorctl status flashback-backend"
echo "   Logs backend: sudo tail -f /var/log/flashback-enterprise/backend.out.log"
echo "   Statut nginx: sudo systemctl status nginx"
echo "   Test nginx: sudo nginx -t"
echo
echo "🔐 ${YELLOW}Identifiants MySQL (sauvegardez-les):${NC}"
echo "   Utilisateur: ${DB_USER}"
echo "   Mot de passe: ${DB_PASS}"
echo "   Base de données: ${DB_NAME}"
echo

print_status "Installation complète ! L'application est prête à être utilisée."