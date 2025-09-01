# Installation en 1 commande (VPS Ubuntu/Debian)

1) Se connecter en root ou sudoer, puis cloner le repo et lancer le script:

```
sudo su -
cd /opt
git clone git@github.com:Rayane83/sitefb.git
cd sitefb/scripts
bash install_sitefb.sh --domain flashbackfa-entreprise.fr --branch feature/ui-shadcn --db-url "mysql+pymysql://Staff:Fbentreprise83@@51.75.200.221:3306/Sitefb" --email votre_email@domaine.fr
```

2) Le script vous demandera les secrets Discord (Client ID/Secret/Bot Token). Il générera automatiquement JWT_SECRET et ENCRYPTION_KEY.

3) Une fois terminé:
- Frontend: https://flashbackfa-entreprise.fr
- Backend (interne): http://127.0.0.1:8001/api/health

En cas de besoin:
- Relancer backend: `docker compose -f /opt/sitefb/docker-compose.yml up -d`
- Logs backend: `docker compose -f /opt/sitefb/docker-compose.yml logs -f backend`
- Certbot manuel: `certbot --nginx -d flashbackfa-entreprise.fr -m votre_email@domaine.fr --agree-tos --redirect`