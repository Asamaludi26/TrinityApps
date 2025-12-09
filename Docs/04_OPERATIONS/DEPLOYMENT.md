# Panduan Deployment Produksi (Debian 12)

Dokumen ini menjelaskan prosedur teknis lengkap untuk men-deploy aplikasi **full-stack** (frontend dan backend) ke server **Debian 12 (Bookworm)**.

## 1. Arsitektur Deployment

Kita akan menggunakan **Nginx** sebagai **Reverse Proxy** dan **PM2** sebagai manajer proses untuk backend.
-   **Aplikasi Frontend (React)**: Hasil build-nya adalah **file statis** yang akan disajikan langsung oleh Nginx.
-   **Aplikasi Backend (NestJS)**: Hasil build-nya adalah aplikasi **Node.js** yang akan berjalan sebagai layanan di latar belakang pada port internal (`3001`) dan dikelola oleh PM2.
-   **Nginx**: Bertindak sebagai pintu gerbang utama. Request ke `/api/*` akan diteruskan ke backend, sisanya akan dilayani oleh file statis frontend.

---

## 2. Langkah 1: Persiapan Awal Server

Langkah ini hanya perlu dilakukan sekali saat pertama kali menyiapkan server.

1.  **Update Sistem & Instal Nginx**:
    ```bash
    # Perbarui daftar paket dan upgrade sistem
    sudo apt update && sudo apt upgrade -y

    # Instal Nginx
    sudo apt install nginx -y

    # Jalankan dan aktifkan Nginx agar otomatis berjalan saat boot
    sudo systemctl start nginx
    sudo systemctl enable nginx
    ```

2.  **Instal Node.js v18, pnpm, dan PM2**:
    Gunakan repositori dari NodeSource untuk versi Node.js yang lebih modern.
    ```bash
    # Unduh dan jalankan skrip setup NodeSource untuk Node.js v18
    curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -

    # Instal Node.js (yang juga akan menyertakan npm)
    sudo apt install -y nodejs

    # Instal pnpm dan PM2 secara global menggunakan npm
    sudo npm install -g pnpm pm2
    ```

## 3. Langkah 2: Menyiapkan Struktur Direktori dan Izin

1.  **Buat Struktur Direktori di `/var/www`**:
    ```bash
    sudo mkdir -p /var/www/assetflow/frontend
    sudo mkdir -p /var/www/assetflow/backend
    ```

2.  **Atur Kepemilikan Direktori (PENTING!)**:
    Ganti `[user]` dengan nama pengguna non-root Anda untuk menghindari masalah izin.
    ```bash
    sudo chown -R [user]:[user] /var/www/assetflow
    ```

## 4. Langkah 3: Deployment Frontend (React)

Proses ini dilakukan dari **komputer lokal Anda**.

1.  **Build Aplikasi Frontend**:
    ```bash
    # Dari direktori root proyek Anda, masuk ke folder frontend
    cd frontend

    # Buat folder 'dist' yang berisi file produksi
    pnpm run build
    ```

2.  **Salin Hasil Build ke Server**:
    Gunakan `rsync` untuk efisiensi. Ganti `[user]@[ip_server]`.
    ```bash
    # Jalankan dari folder 'frontend' di komputer lokal
    rsync -avz ./dist/ [user]@[ip_server]:/var/www/assetflow/frontend/
    ```

## 5. Langkah 4: Deployment Backend (NestJS)

1.  **Salin Kode Sumber ke Server**:
    Dari **folder root proyek** di komputer lokal Anda, salin seluruh folder `backend/`.
    ```bash
    rsync -avz --exclude 'node_modules' --exclude 'dist' ./backend/ [user]@[ip_server]:/var/www/assetflow/backend/
    ```

2.  **Setup di Server (via SSH)**:
    Login ke server Anda: `ssh [user]@[ip_server]`.

3.  **Instal, Build, dan Jalankan Backend**:
    ```bash
    # Pindah ke direktori backend
    cd /var/www/assetflow/backend

    # Instal dependensi produksi saja
    pnpm install --production

    # Buat file .env untuk variabel lingkungan (SANGAT PENTING!)
    nano .env
    ```
    Isi file `.env` dengan konfigurasi Anda:
    ```env
    DATABASE_URL="postgresql://USER:PASSWORD@HOST:PORT/DATABASE?schema=public"
    JWT_SECRET="KUNCI_RAHASIA_YANG_SANGAT_PANJANG_DAN_SULIT_DITEBAK"
    ```
    Simpan file (`Ctrl+X`, lalu `Y`, lalu `Enter`).

    ```bash
    # Build aplikasi dari TypeScript ke JavaScript
    pnpm run build

    # Jalankan aplikasi menggunakan PM2
    pm2 start dist/main.js --name assetflow-backend

    # Atur PM2 agar otomatis berjalan saat server reboot
    pm2 startup
    # (Salin dan jalankan perintah yang ditampilkan oleh PM2)
    pm2 save
    ```

## 6. Langkah 5: Konfigurasi Nginx & Firewall

1.  **Buat File Konfigurasi Nginx**:
    ```bash
    sudo nano /etc/nginx/sites-available/assetflow
    ```
    Salin konten di bawah ini. Ganti `aset.trinitimedia.com` dengan domain Anda.
    ```nginx
    server {
        listen 80;
        server_name aset.trinitimedia.com;
        root /var/www/assetflow/frontend;

        index index.html;

        location / {
            try_files $uri /index.html;
        }

        location /api/ {
            proxy_pass http://localhost:3001;
            proxy_http_version 1.1;
            proxy_set_header Upgrade $http_upgrade;
            proxy_set_header Connection 'upgrade';
            proxy_set_header Host $host;
            proxy_cache_bypass $http_upgrade;
        }
    }
    ```

2.  **Aktifkan Konfigurasi**:
    ```bash
    sudo ln -s /etc/nginx/sites-available/assetflow /etc/nginx/sites-enabled/
    sudo nginx -t
    sudo systemctl restart nginx
    ```

3.  **Konfigurasi Firewall (UFW - Uncomplicated Firewall)**:
    ```bash
    # Izinkan koneksi SSH (SANGAT PENTING!)
    sudo ufw allow OpenSSH

    # Izinkan koneksi HTTP dan HTTPS melalui Nginx
    sudo ufw allow 'Nginx Full'

    # Aktifkan firewall
    sudo ufw enable
    # (Ketik 'y' dan Enter untuk melanjutkan)

    # Periksa status firewall
    sudo ufw status
    ```

## 7. Skrip Otomatisasi (Opsional)

Untuk mempercepat deployment di masa mendatang, gunakan skrip `deploy.sh` yang telah disediakan. Pastikan variabel di dalam skrip sudah disesuaikan dengan lingkungan server Anda.

**Cara Penggunaan Skrip di Server**:
```bash
# Deploy frontend saja
./deploy.sh frontend

# Deploy backend saja
./deploy.sh backend

# Deploy keduanya
./deploy.sh all
```
