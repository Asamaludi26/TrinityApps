# Infrastruktur & Deployment (Proxmox & Docker)

Dokumen ini adalah panduan operasional lengkap untuk menyiapkan lingkungan produksi Aplikasi Inventori Aset pada infrastruktur **On-Premise (Proxmox)** menggunakan containerisasi **Docker**.

---

## 1. Topologi Jaringan & Keamanan

Diagram ini menjelaskan bagaimana traffic mengalir dari internet publik masuk ke dalam server virtual (VM) yang terisolasi.

```mermaid
graph TD
    UserClient[User Browser / Mobile]
    
    subgraph "Jaringan Publik (Internet)"
        DNS[Cloudflare / DNS Provider]
    end
    
    subgraph "Infrastruktur Fisik (Proxmox Host)"
        Firewall[Proxmox Firewall / Mikrotik]
        
        subgraph "Virtual Machine: AssetServer (192.168.x.x)"
            Nginx[Nginx Reverse Proxy :80/:443]
            
            subgraph "Docker Network (Internal Bridge: 172.18.x.x)"
                Backend[NestJS Container :3001]
                DB[PostgreSQL Container :5432]
            end
            
            Static[Frontend Static Files]
        end
    end
    
    UserClient -->|HTTPS Request| DNS
    DNS -->|Public IP| Firewall
    Firewall -->|Port Forwarding 80/443| Nginx
    
    Nginx -->|Route /api/*| Backend
    Nginx -->|Route /*| Static
    Backend -->|TCP Connection| DB
```

**Poin Keamanan Kritis:**
*   Database (`:5432`) dan Backend API (`:3001`) **TIDAK** diekspos ke jaringan host atau publik. Mereka hanya bisa saling bicara di dalam Docker Network yang terisolasi.
*   Hanya Nginx yang membuka port 80/443 ke dunia luar.
*   Akses SSH menggunakan port custom (misal 9022) dan wajib menggunakan SSH Key (Disable Password Auth).

---

## 2. Operations Runbook (Panduan Operasional)

Panduan langkah demi langkah untuk tugas maintenance rutin.

### 2.1. Integrasi QEMU Guest Agent (Wajib untuk Proxmox)
Agar Proxmox bisa memonitor penggunaan RAM/CPU VM secara akurat dan melakukan *graceful shutdown* (misal saat mati lampu dan UPS memicu shutdown), QEMU Agent harus aktif.

1.  **Di dalam VM Ubuntu**:
    ```bash
    sudo apt update
    sudo apt install qemu-guest-agent
    sudo systemctl start qemu-guest-agent
    sudo systemctl enable qemu-guest-agent
    ```
2.  **Di Panel Proxmox**:
    *   Klik VM > Options > QEMU Guest Agent > Ubah ke "Enabled".
    *   Reboot VM.
    *   Verifikasi: IP Address VM akan muncul di halaman Summary Proxmox.

### 2.2. Membersihkan Disk (Disk Cleanup)
Docker sering meninggalkan image dan volume yang tidak terpakai ("dangling"), yang bisa memenuhi disk VM.

**Prosedur Rutin (Bulanan):**
```bash
# 1. Hapus container yang berhenti, network yang tidak dipakai, dan build cache
docker system prune -f

# 2. Hapus image lama yang tidak digunakan oleh container aktif
docker image prune -a -f --filter "until=24h"

# 3. Cek penggunaan disk
df -h
```

### 2.3. Pemulihan Database (Database Restore)
Jika terjadi korupsi data dan perlu restore dari file backup `.sql.gz`.

**Langkah Restore:**
1.  Stop aplikasi backend agar tidak ada data baru masuk.
    ```bash
    docker compose stop api
    ```
2.  Copy file backup ke dalam container database.
    ```bash
    gunzip backup_file.sql.gz
    docker cp backup_file.sql triniti_asset_db:/tmp/restore.sql
    ```
3.  Eksekusi restore di dalam container.
    ```bash
    docker exec -it triniti_asset_db psql -U triniti_admin -d triniti_asset -f /tmp/restore.sql
    ```
4.  Start kembali aplikasi.
    ```bash
    docker compose start api
    ```

---

## 3. Cetak Biru Variabel Lingkungan (.env)

Ini adalah daftar lengkap variabel yang **WAJIB** dikonfigurasi di server produksi (`/opt/triniti-app/.env`).

### Database Configuration
```env
# Format: postgresql://USER:PASSWORD@HOST:PORT/DATABASE?schema=SCHEMA
# Host 'db' merujuk pada nama service di docker-compose.yml
DATABASE_URL="postgresql://triniti_admin:SuperS3cretP@ss!@db:5432/triniti_asset?schema=public"

# Digunakan oleh container postgres untuk inisialisasi awal
POSTGRES_USER=triniti_admin
POSTGRES_PASSWORD=SuperS3cretP@ss!
POSTGRES_DB=triniti_asset
```

### Application Security
```env
# Generate string acak panjang (misal: openssl rand -base64 64)
JWT_SECRET="ganti_dengan_string_sangat_panjang_dan_acak_min_64_karakter"

# Durasi token akses (pendek untuk keamanan)
JWT_EXPIRATION="12h"

# Durasi refresh token (jika diimplementasikan)
JWT_REFRESH_EXPIRATION="7d"

# API Port (Internal Docker)
PORT=3001
```

### Third-Party Integrations
```env
# WhatsApp Gateway
WA_API_URL="https://api.watzap.id/v1"
WA_API_KEY="api_key_provider_wa"

# ID Grup WhatsApp (Target Notifikasi)
WA_GROUP_LOGISTIC_ID="1203630239482@g.us"
WA_GROUP_PURCHASE_ID="1203630291823@g.us"
WA_GROUP_MANAGEMENT_ID="1203630239123@g.us"
```

---

## 4. Monitoring Kesehatan (Health Check)

Untuk memastikan sistem berjalan normal tanpa harus login ke dashboard aplikasi.

1.  **Cek Status Docker**:
    ```bash
    docker compose ps
    # Semua state harus "Up"
    ```

2.  **Cek Log Realtime (Debugging Error 500)**:
    ```bash
    docker compose logs -f api --tail=100
    ```

3.  **Endpoint Health Check (API)**:
    Backend harus menyediakan endpoint `/api/health` yang mengembalikan status 200 OK jika koneksi DB aman.
    ```bash
    curl http://localhost:3001/api/health
    ```