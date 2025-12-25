#!/bin/bash

# OneFunders VPS Setup Script
# Run this on your Ubuntu server (185.8.173.37) as root

set -e

echo ">>> Updating System..."
apt-get update && apt-get upgrade -y

echo ">>> Installing Dependencies..."
apt-get install -y curl git build-essential ufw

echo ">>> Installing Node.js 18..."
curl -fsSL https://deb.nodesource.com/setup_18.x | bash -
apt-get install -y nodejs
npm install -g pm2 typescript

echo ">>> Installing Docker & Docker Compose..."
apt-get install -y ca-certificates gnupg
install -m 0755 -d /etc/apt/keyrings
curl -fsSL https://download.docker.com/linux/ubuntu/gpg | gpg --dearmor -o /etc/apt/keyrings/docker.gpg
chmod a+r /etc/apt/keyrings/docker.gpg
echo \
  "deb [arch="$(dpkg --print-architecture)" signed-by=/etc/apt/keyrings/docker.gpg] https://download.docker.com/linux/ubuntu \
  "$(. /etc/os-release && echo "$VERSION_CODENAME")" stable" | \
  tee /etc/apt/sources.list.d/docker.list > /dev/null
apt-get update
apt-get install -y docker-ce docker-ce-cli containerd.io docker-buildx-plugin docker-compose-plugin

echo ">>> Installing PostgreSQL 14..."
sh -c 'echo "deb http://apt.postgresql.org/pub/repos/apt $(lsb_release -cs)-pgdg main" > /etc/apt/sources.list.d/pgdg.list'
wget --quiet -O - https://www.postgresql.org/media/keys/ACCC4CF8.asc | apt-key add -
apt-get update
apt-get install -y postgresql-14 postgresql-contrib

echo ">>> Configuring PostgreSQL..."
# Switch to postgres user and create DB/User
# Note: Change 'secure_password' to a real password!
sudo -u postgres psql -c "CREATE USER onefunders WITH ENCRYPTED PASSWORD 'secure_password';" || true
sudo -u postgres psql -c "CREATE DATABASE onefunders OWNER onefunders;" || true
sudo -u postgres psql -c "GRANT ALL PRIVILEGES ON DATABASE onefunders TO onefunders;" || true

echo ">>> Installing Redis..."
apt-get install -y redis-server
systemctl enable redis-server
systemctl start redis-server

echo ">>> Installing Nginx..."
apt-get install -y nginx

echo ">>> Configuring Firewall..."
ufw allow OpenSSH
ufw allow 'Nginx Full'
# MT5 REST API (Optional, better to proxy via Nginx/Node)
# ufw allow 5000/tcp 
ufw --force enable

echo ">>> Starting MT5 Docker Container..."
# Replace with your actual MT5 setup if different
docker run -d \
  --name mt5-api \
  --restart always \
  -p 5000:8000 \
  -e SWAGGER_HOST=185.8.173.37:5000 \
  timurila/mt5rest:latest

echo ">>> Setup Complete!"
echo "Next steps:"
echo "1. Clone your repo to /var/www/onefunders"
echo "2. Create .env file with DATABASE_URL, JWT_SECRET, HMAC_SECRET, MT5_API_URL"
echo "3. Run 'npm install' and 'npm run build'"
echo "4. Copy nginx.conf to /etc/nginx/sites-available/onefunders"
echo "5. Start backend: 'pm2 start api/server.ts --interpreter ./node_modules/.bin/ts-node --name api'"
echo "6. Start worker: 'pm2 start api/worker.ts --interpreter ./node_modules/.bin/ts-node --name worker'"
