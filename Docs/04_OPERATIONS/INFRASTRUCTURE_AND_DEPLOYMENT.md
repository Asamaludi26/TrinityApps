# Infrastruktur & Deployment (Proxmox & Docker)

Dokumen ini adalah panduan operasional lengkap untuk menyiapkan lingkungan produksi Aplikasi Inventori Aset pada infrastruktur **On-Premise (Proxmox)** menggunakan containerisasi **Docker**.

---

## 1. Topologi Infrastruktur

```mermaid
graph TD
    Internet((Internet))
    
    subgraph "Proxmox Host (Physical Server)"
        Firewall[Proxmox Firewall / Router]
        
        subgraph "VM: AssetServer (Ubuntu LTS)"
            Nginx[Nginx Reverse Proxy]
            
            subgraph "Docker Network (triniti_net)"
                App[NestJS Backend API]
                DB[(PostgreSQL 15)]
            end
            
            Static[Frontend React Files]
        end
    end
    
    Internet -->|HTTPS : 443| Firewall
    Internet -->|SSH : 9022| Firewall
    
    Firewall -->|Port Fwd| Nginx
    
    Nginx -->|/api/*| App
    Nginx -->|/*| Static
    App -->|TCP : 5432| DB
```

## 2. Pemetaan Port & Jaringan

Untuk keamanan, layanan internal (Database & API) tidak diekspos langsung ke internet. Semua akses melalui **Nginx Reverse Proxy**.

| Layanan | Port Internal (Docker) | Port Host (VM) | Port Publik (Internet) | Keterangan |
| :--- | :--- | :--- | :--- | :--- |
| **Nginx (Web)** | - | 80, 443 | 80, 443 | Entry point utama (HTTP/HTTPS). |
| **SSH (Remote)** | - | 22 | 9022 | Akses terminal admin (Custom Port untuk keamanan). |
| **Backend API** | 3001 | 3001 (Localhost only) | - | Diakses via Nginx proxy pass. |
| **PostgreSQL** | 5432 | 5432 (Localhost only) | - | Hanya diakses oleh Backend API. |

---

## 3. Cetak Biru Variabel Lingkungan (.env)

Ini adalah daftar lengkap variabel yang **WAJIB** dikonfigurasi di server produksi (`/opt/triniti-app/.env`).

### Database Configuration
```env
# Format: postgresql://USER:PASSWORD@HOST:PORT/DATABASE?schema=SCHEMA
DATABASE_URL="postgresql://triniti_admin:SecureP@ssw0rd!@db:5432/triniti_asset?schema=public"

# Digunakan oleh container postgres untuk inisialisasi awal
POSTGRES_USER=triniti_admin
POSTGRES_PASSWORD=SecureP@ssw0rd!
POSTGRES_DB=triniti_asset
```

### Application Security
```env
# Secret key untuk generate JWT Token. Generate string acak panjang (misal: openssl rand -base64 32)
JWT_SECRET="ganti_dengan_string_sangat_panjang_dan_acak_min_32_karakter"

# Durasi token (1d, 12h, 30m)
JWT_EXPIRATION="1d"

# API Port (Internal Docker)
PORT=3001
```

### Third-Party Integrations
```env
# WhatsApp Gateway (Watzap.id / Lainnya)
WA_API_URL="https://api.provider-wa.com/v1"
WA_API_KEY="api_key_provider_wa"

# ID Grup WhatsApp (Dapatkan dari logs provider WA)
WA_GROUP_LOGISTIC_ID="1203630239482@g.us"
WA_GROUP_PURCHASE_ID="1203630291823@g.us"
WA_GROUP_MANAGEMENT_ID="1203630239123@g.us"
```

---

## 4. Konfigurasi Nginx (Reverse Proxy)

File konfigurasi Nginx (`/etc/nginx/sites-available/triniti-asset`) untuk menangani routing Frontend dan Backend dalam satu domain.

```nginx
server {
    listen 80;
    server_name aset.trinitimedia.com;

    # Redirect HTTP to HTTPS (Aktifkan setelah SSL terpasang)
    # return 301 https://$host$request_uri;
    
    # 1. FRONTEND: Sajikan file statis React
    location / {
        root /opt/triniti-app/frontend/dist;
        index index.html;
        try_files $uri $uri/ /index.html; # Penting untuk React Router (SPA)
    }

    # 2. BACKEND: Proxy ke container NestJS
    location /api/ {
        proxy_pass http://localhost:3001/api/;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
        
        # Security Headers
        add_header X-Frame-Options "SAMEORIGIN";
        add_header X-XSS-Protection "1; mode=block";
    }
}
```

---

## 5. Prosedur Maintenance & Operasional

### 5.1. Migrasi Database (Schema Update)
Jika ada perubahan struktur tabel di `schema.prisma`, lakukan langkah ini di server:

```bash
cd /opt/triniti-app
# Masuk ke container API untuk menjalankan migrasi
docker compose exec api npx prisma migrate deploy
```
*Catatan: `migrate deploy` aman untuk produksi, tidak akan mereset data (beda dengan `migrate dev`).*

### 5.2. Auto-Healing (Restart Policy)
Docker Compose dikonfigurasi dengan `restart: always`.
*   Jika backend crash karena error koding, Docker akan otomatis me-restart container dalam hitungan detik.
*   Jika server VM reboot (misal mati lampu), aplikasi akan otomatis menyala saat server up.

### 5.3. Monitoring Kesehatan (Health Check)
Untuk memeriksa apakah semua layanan berjalan:

```bash
# Cek status container
docker compose ps

# Cek logs realtime backend (berguna untuk debug error 500)
docker compose logs -f api
```