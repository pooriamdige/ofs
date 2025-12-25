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
# If you need external DB access (not recommended without VPN):
# ufw allow 5432/tcp
ufw --force enable

echo ">>> Setup Complete!"
echo "Next steps:"
echo "1. Clone your repo to /var/www/onefunders"
echo "2. Create .env file with DATABASE_URL=postgres://onefunders:secure_password@localhost:5432/onefunders"
echo "3. Build and start with PM2"
