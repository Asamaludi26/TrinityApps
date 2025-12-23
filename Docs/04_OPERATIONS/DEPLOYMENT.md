
# Panduan Deployment: Docker & Proxmox

Dokumen ini diperbarui untuk merekomendasikan penggunaan **Docker** sebagai metode deployment utama. Ini adalah cara termudah dan paling stabil untuk menjalankan aplikasi Full-Stack di server Linux (termasuk VM di Proxmox).

## 1. Konsep Deployment
Kita akan menjalankan 3 container (layanan) yang saling terhubung:
1.  **PostgreSQL**: Database.
2.  **Backend (NestJS)**: API Server.
3.  **Frontend (Nginx)**: Web Server untuk menyajikan file React statis.

## 2. Persiapan VM (Proxmox) & Hardware Requirement
Minta tim infrastruktur untuk menyiapkan VM dengan spesifikasi minimal:
*   OS: Ubuntu 22.04 LTS / Debian 11+
*   CPU: 2 Core
*   RAM: 4 GB
*   Disk: 20 GB

### QEMU Guest Agent (Wajib)
Fitur ini memastikan Proxmox dapat memantau IP dan melakukan shutdown VM dengan aman.
1.  **Di Proxmox Node**: Klik VM > Options > QEMU Guest Agent > **Enabled**.
2.  **Di dalam VM (SSH)**:
    ```bash
    sudo apt update && sudo apt install qemu-guest-agent -y
    sudo systemctl start qemu-guest-agent
    ```
3.  **Reboot VM** (Cold Boot diperlukan agar setting Proxmox aktif).

**Install Docker di VM:**
```bash
# Update repo
sudo apt-get update
# Install Docker
curl -fsSL https://get.docker.com -o get-docker.sh
sudo sh get-docker.sh
# Install Docker Compose
sudo apt install docker-compose-plugin
```

## 3. Struktur File Deployment
Di server, buat folder `/opt/triniti-app` dan buat file `docker-compose.yml`.

### Persistent Database Volumes (PENTING)
AI Studio/Docker Container bersifat *ephemeral* (sementara). Agar data inventori tidak hilang saat container di-restart atau di-update, kita wajib memetakan volume ke disk fisik VM.

Pastikan konfigurasi `volumes` di bawah ini ada:

```yaml
version: '3.8'

services:
  # 1. Database
  db:
    image: postgres:15-alpine
    restart: always
    environment:
      POSTGRES_USER: ${DB_USER}
      POSTGRES_PASSWORD: ${DB_PASSWORD}
      POSTGRES_DB: triniti_inventory
    # PERSISTENT STORAGE MAPPING
    volumes:
      - ./pgdata:/var/lib/postgresql/data 
    networks:
      - app_net

  # 2. Backend API
  api:
    image: triniti/backend:latest
    restart: always
    build: ./backend
    depends_on:
      - db
    environment:
      DATABASE_URL: postgres://${DB_USER}:${DB_PASSWORD}@db:5432/triniti_inventory
      PORT: 3000
      JWT_SECRET: ${JWT_SECRET}
    ports:
      - "3000:3000"
    networks:
      - app_net

  # 3. Frontend (Web Server)
  web:
    image: triniti/frontend:latest
    restart: always
    build: ./frontend
    ports:
      - "80:80" # HTTP Port
      - "443:443" # HTTPS Port
    volumes:
      # Mapping sertifikat SSL dari Host ke Container
      - /etc/letsencrypt:/etc/letsencrypt:ro
      - ./nginx.conf:/etc/nginx/conf.d/default.conf
    depends_on:
      - api
    networks:
      - app_net

networks:
  app_net:
```

## 4. Konfigurasi HTTPS (SSL Certificate)

AI Studio tidak dapat mengonfigurasi SSL nyata. Anda harus melakukannya manual di VM menggunakan Certbot (Let's Encrypt).

### Langkah Instalasi Certbot di VM Host:
1.  Pastikan domain (misal: `aset.trinitimedia.com`) sudah diarahkan ke IP Public VM.
2.  Install Certbot:
    ```bash
    sudo apt install certbot
    ```
3.  Generate Sertifikat (Port 80 harus kosong sementara):
    ```bash
    sudo certbot certonly --standalone -d aset.trinitimedia.com
    ```
4.  Sertifikat akan tersimpan di `/etc/letsencrypt/live/aset.trinitimedia.com/`.

### Konfigurasi Nginx (nginx.conf):
Buat file `nginx.conf` di sebelah `docker-compose.yml`:
```nginx
server {
    listen 80;
    server_name aset.trinitimedia.com;
    return 301 https://$host$request_uri; # Redirect HTTP to HTTPS
}

server {
    listen 443 ssl;
    server_name aset.trinitimedia.com;

    ssl_certificate /etc/letsencrypt/live/aset.trinitimedia.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/aset.trinitimedia.com/privkey.pem;

    location / {
        root /usr/share/nginx/html;
        index index.html index.htm;
        try_files $uri $uri/ /index.html;
    }

    location /api {
        proxy_pass http://api:3000; # Forward to Backend Container
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
    }
}
```

## 5. Langkah Eksekusi (Start)

1.  **Upload Source Code**: Upload folder project ke server.
2.  **Konfigurasi Environment**: Buat file `.env`.
3.  **Jalankan Aplikasi**:
    ```bash
    docker compose up -d --build
    ```

## 6. Maintenance

*   **Backup Database**:
    ```bash
    # Backup volume ./pgdata secara berkala atau gunakan pg_dump
    docker exec -t [container_db_name] pg_dumpall -c -U [db_user] > dump_`date +%d-%m-%Y`.sql
    ```
*   **Renew SSL**:
    ```bash
    # Stop container web sebentar
    docker compose stop web
    sudo certbot renew
    docker compose start web
    ```
