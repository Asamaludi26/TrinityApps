
# Panduan Deployment Produksi (Debian/Ubuntu)

Dokumen ini adalah panduan langkah demi langkah untuk men-deploy aplikasi **Full-Stack** (Frontend React & Backend NestJS) ke server VPS berbasis Linux (Debian 12 atau Ubuntu 22.04).

## 1. Persiapan Server (VPS)

### 1.1. Akses & Update
Masuk ke server via SSH: `ssh root@ip_server_anda`
```bash
sudo apt update && sudo apt upgrade -y
sudo apt install curl git unzip ufw -y
```

### 1.2. Instalasi Node.js (v18 LTS) & PM2
```bash
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt install -y nodejs
sudo npm install -g pm2 pnpm
```

### 1.3. Instalasi Nginx (Web Server)
```bash
sudo apt install nginx -y
sudo systemctl start nginx
sudo systemctl enable nginx
```

---

## 2. Deployment Backend (NestJS)

### 2.1. Setup Code & Env
```bash
mkdir -p /var/www/assetflow
cd /var/www/assetflow
git clone <url_repo_anda> .
cd backend
pnpm install

# Buat file .env produksi
nano .env
```
Isi `.env`:
```env
DATABASE_URL="postgresql://user:pass@localhost:5432/db_prod"
PORT=3001
JWT_SECRET="rahasia_produksi_yang_sangat_kuat_dan_panjang"
FRONTEND_URL="https://aset.trinitimedia.com"
```

### 2.2. Build & Start
```bash
# Build aplikasi NestJS
pnpm run build

# Jalankan migrasi database
npx prisma migrate deploy

# Jalankan dengan PM2
pm2 start dist/main.js --name assetflow-backend
pm2 save
pm2 startup
```

---

## 3. Deployment Frontend (React)

### 3.1. Build
Masuk ke folder frontend di server (atau build di lokal dan upload folder `dist`).
```bash
cd ../frontend
nano .env
# Isi: VITE_API_URL=https://aset.trinitimedia.com/api

pnpm install
pnpm run build
# Hasil build ada di /var/www/assetflow/frontend/dist
```

---

## 4. Konfigurasi Nginx (Reverse Proxy)

Buat konfigurasi server block:
```bash
sudo nano /etc/nginx/sites-available/assetflow
```

Isi konfigurasi berikut:

```nginx
server {
    listen 80;
    server_name aset.trinitimedia.com; # Ganti dengan domain Anda

    root /var/www/assetflow/frontend/dist;
    index index.html;

    # 1. Sajikan Frontend (SPA Routing)
    location / {
        try_files $uri $uri/ /index.html;
    }

    # 2. Reverse Proxy ke Backend NestJS
    location /api/ {
        proxy_pass http://localhost:3001/api/;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }
}
```

Aktifkan konfigurasi:
```bash
sudo ln -s /etc/nginx/sites-available/assetflow /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl restart nginx
```

---

## 5. Setup SSL/HTTPS (Wajib untuk Produksi)

Gunakan Certbot untuk sertifikat SSL gratis dari Let's Encrypt.

```bash
sudo apt install certbot python3-certbot-nginx -y
sudo certbot --nginx -d aset.trinitimedia.com
```
Pilih opsi **Redirect (2)** untuk memaksa HTTPS.

---

## 6. Otomatisasi (CI/CD)

Untuk deployment otomatis via GitHub Actions, buat file `.github/workflows/deploy.yml`:

```yaml
name: Deploy Production
on:
  push:
    branches: [ "main" ]
jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: appleboy/ssh-action@v0.1.10
        with:
          host: ${{ secrets.SERVER_HOST }}
          username: ${{ secrets.SERVER_USER }}
          key: ${{ secrets.SSH_KEY }}
          script: |
            cd /var/www/assetflow
            git pull origin main
            
            # Rebuild Backend
            cd backend
            pnpm install && pnpm run build
            pm2 restart assetflow-backend
            
            # Rebuild Frontend
            cd ../frontend
            pnpm install && pnpm run build
```
