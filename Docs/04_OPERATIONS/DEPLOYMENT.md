
# Panduan Deployment: Docker & Proxmox

Dokumen ini diperbarui untuk merekomendasikan penggunaan **Docker** sebagai metode deployment utama. Ini adalah cara termudah dan paling stabil untuk menjalankan aplikasi Full-Stack di server Linux (termasuk VM di Proxmox).

## 1. Konsep Deployment
Kita akan menjalankan 3 container (layanan) yang saling terhubung:
1.  **PostgreSQL**: Database.
2.  **Backend (NestJS)**: API Server.
3.  **Frontend (Nginx)**: Web Server untuk menyajikan file React statis.

## 2. Persiapan VM (Proxmox)
Minta tim infrastruktur untuk menyiapkan VM dengan spesifikasi minimal:
*   OS: Ubuntu 22.04 LTS / Debian 11+
*   CPU: 2 Core
*   RAM: 4 GB
*   Disk: 20 GB

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
Di server, buat folder `/opt/triniti-app` dan buat file `docker-compose.yml`:

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
    volumes:
      - db_data:/var/lib/postgresql/data
    networks:
      - app_net

  # 2. Backend API
  api:
    image: triniti/backend:latest
    restart: always
    build: ./backend  # Jika build di server
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
    build: ./frontend # Jika build di server
    ports:
      - "80:80"
    depends_on:
      - api
    networks:
      - app_net

volumes:
  db_data:

networks:
  app_net:
```

## 4. Langkah Deployment

1.  **Upload Source Code**: Upload folder project ke server (bisa via Git clone).
2.  **Konfigurasi Environment**: Buat file `.env` di folder yang sama dengan `docker-compose.yml`.
    ```env
    DB_USER=admin_triniti
    DB_PASSWORD=rahasia_sangat_kuat
    JWT_SECRET=kunci_rahasia_jwt_panjang
    ```
3.  **Jalankan Aplikasi**:
    ```bash
    docker compose up -d --build
    ```
    Perintah ini akan:
    *   Membangun image frontend dan backend.
    *   Membuat database.
    *   Menjalankan semua layanan di background.

4.  **Cek Status**:
    ```bash
    docker compose ps
    docker compose logs -f api  # Lihat log backend
    ```

## 5. Maintenance (Monitoring Sederhana)
Karena menggunakan Docker, Anda tidak perlu khawatir service mati sendiri (ada `restart: always`).

*   **Backup Database**:
    ```bash
    docker exec -t [container_db_name] pg_dumpall -c -U [db_user] > dump_`date +%d-%m-%Y"_"%H_%M_%S`.sql
    ```
*   **Update Aplikasi**:
    1.  `git pull` (tarik kode terbaru).
    2.  `docker compose up -d --build` (rebuild ulang container).
