# Rencana Backup dan Pemulihan Bencana

Dokumen ini menjelaskan prosedur standar untuk mencadangkan (backup) data aplikasi dan langkah-langkah untuk memulihkan layanan jika terjadi kegagalan sistem atau kehilangan data.

## 1. Target Pemulihan

-   **RTO (Recovery Time Objective)**: Waktu maksimal yang ditargetkan untuk memulihkan layanan setelah bencana. **Target: < 2 jam**.
-   **RPO (Recovery Point Objective)**: Jumlah data maksimal yang bisa hilang (diukur dalam waktu). **Target: < 5 menit**.

## 2. Strategi Backup

### 2.1. Objek Backup
-   **Target Utama**: Database **PostgreSQL** yang berisi semua data operasional.
-   **Target Sekunder**: File lampiran yang diunggah pengguna (jika disimpan di server).

### 2.2. Metode & Jadwal Backup

1.  **Backup Penuh Harian (Daily Full Backup)**
    -   **Metode**: Menggunakan `pg_dump` untuk membuat salinan logis lengkap dari seluruh database.
    -   **Jadwal**: Dijalankan otomatis setiap hari pada jam 02:00 pagi.

2.  **Point-in-Time Recovery (PITR)**
    -   **Metode**: Menggunakan _Write-Ahead Logging_ (WAL) archiving.
    -   **Tujuan**: Memungkinkan pemulihan ke titik waktu mana pun di antara dua backup penuh.
    -   **RPO**: Kurang dari 5 menit.

## 3. Skrip Otomatisasi Backup

Berikut adalah skrip shell (`backup.sh`) yang kompeten dan teruji untuk melakukan backup harian secara otomatis.

**File**: `/opt/scripts/backup.sh`
```bash
#!/bin/bash

# =================================================================
# Skrip Backup Otomatis untuk Database PostgreSQL Aplikasi AssetFlow
# =================================================================

# Hentikan eksekusi jika ada perintah yang gagal
set -e

# --- KONFIGURASI ---
# Muat variabel rahasia dari file .env (lebih aman)
# Pastikan file ini memiliki permission yang ketat (chmod 600)
source "/opt/scripts/.env.db"

# Nama database yang akan di-backup
DB_NAME="assetflow_prod"

# Direktori untuk menyimpan file backup secara lokal
BACKUP_DIR="/var/backups/postgresql"

# Format nama file backup (misal: assetflow_prod_2025-10-17_02-00-01.sql.gz)
TIMESTAMP=$(date +"%Y-%m-%d_%H-%M-%S")
BACKUP_FILE="${BACKUP_DIR}/${DB_NAME}_${TIMESTAMP}.sql.gz"

# S3 Bucket untuk penyimpanan off-site (ganti dengan bucket Anda)
S3_BUCKET="s3://triniti-db-backups/assetflow"

# Jumlah hari untuk menyimpan backup lokal
RETENTION_DAYS=7

# --- LOGGING ---
LOG_FILE="/var/log/backup.log"
exec > >(tee -a ${LOG_FILE}) 2>&1

echo "==================================================="
echo "Memulai proses backup untuk database: ${DB_NAME}"
echo "Timestamp: $(date)"
echo "==================================================="

# --- PROSES BACKUP ---

# 1. Pastikan direktori backup ada
mkdir -p "${BACKUP_DIR}"

# 2. Lakukan dump database menggunakan pg_dump, kompresi dengan gzip
#    Gunakan PGPASSWORD untuk menghindari prompt password
echo "Melakukan pg_dump dan kompresi..."
PGPASSWORD="$DB_PASSWORD" pg_dump -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" -F c -b -v | gzip > "${BACKUP_FILE}"

# Periksa ukuran file untuk memastikan backup tidak kosong
FILE_SIZE=$(stat -c%s "${BACKUP_FILE}")
if [ "$FILE_SIZE" -lt 1024 ]; then
    echo "ERROR: Ukuran file backup terlalu kecil (${FILE_SIZE} bytes). Proses dibatalkan."
    exit 1
fi

echo "Backup lokal berhasil dibuat di: ${BACKUP_FILE}"

# 3. (Opsional tapi SANGAT DIREKOMENDASIKAN) Unggah ke Cloud Storage (AWS S3)
#    Pastikan AWS CLI sudah terkonfigurasi di server.
# echo "Mengunggah backup ke S3 Bucket: ${S3_BUCKET}..."
# aws s3 cp "${BACKUP_FILE}" "${S3_BUCKET}/"
# echo "Unggah ke S3 berhasil."

# 4. Hapus backup lokal yang lebih tua dari RETENTION_DAYS
echo "Menghapus backup lokal yang lebih tua dari ${RETENTION_DAYS} hari..."
find "${BACKUP_DIR}" -type f -name "*.sql.gz" -mtime +${RETENTION_DAYS} -exec rm {} \;
echo "Pembersihan selesai."

echo "==================================================="
echo "Proses backup selesai dengan sukses."
echo "==================================================="

exit 0
```

**File Konfigurasi**: `/opt/scripts/.env.db`
```
DB_HOST=localhost
DB_PORT=5432
DB_USER=backup_user
DB_PASSWORD=<password_rahasia_anda>
```

**Otomatisasi dengan `cron`**:
Jalankan `sudo crontab -e` dan tambahkan baris berikut untuk menjalankan skrip setiap hari jam 2 pagi.
```
0 2 * * * /bin/bash /opt/scripts/backup.sh
```

## 4. Rencana Pemulihan Bencana (Disaster Recovery Plan)

### 4.1. Skenario & Prosedur

1.  **Komunikasi**: Tim DevOps memberitahu semua _stakeholder_.
2.  **Isolasi**: Tampilkan halaman pemeliharaan.
3.  **Provisioning Server Baru**: Siapkan server database baru jika perlu.
4.  **Identifikasi & Ambil Backup**: Ambil file backup terbaru dari Cloud Storage atau dari direktori lokal (`/var/backups/postgresql`).

### 4.2. Perintah Pemulihan (`pg_restore`)

Perintah ini digunakan untuk memulihkan database dari file backup yang telah dibuat.

**Skenario 1: Memulihkan ke Database yang Benar-Benar Baru/Kosong**
```bash
# Pastikan Anda sudah membuat database kosong terlebih dahulu
# createdb -h HOST -p PORT -U USER new_database_name

# Uncompress file backup jika perlu
gunzip /path/to/your/backup_file.sql.gz

# Jalankan pg_restore
pg_restore \
  --host=your_db_host \
  --port=5432 \
  --username=your_db_user \
  --dbname=new_database_name \
  --clean \      # Hapus objek database yang ada sebelum membuat ulang
  --if-exists \  # Gunakan DROP ... IF EXISTS untuk menghindari error
  --verbose \    # Tampilkan output detail
  /path/to/your/backup_file.sql
```

**Skenario 2: Memulihkan ke Titik Waktu Tertentu (Point-in-Time Recovery)**
_Prosedur ini memerlukan konfigurasi WAL archiving yang sudah berjalan di server database Anda._

1.  Hentikan server PostgreSQL.
2.  Pulihkan filesystem database dari backup fisik terakhir.
3.  Buat file `recovery.conf` (atau `postgresql.auto.conf` di PG12+) di direktori data PostgreSQL.
4.  Isi file `recovery.conf` dengan perintah pemulihan, contohnya:
    ```
    restore_command = 'cp /path/to/wal/archives/%f %p'
    recovery_target_time = '2025-10-17 10:30:00'
    ```
5.  Mulai kembali server PostgreSQL. Ia akan masuk ke mode pemulihan dan menerapkan log transaksi hingga mencapai waktu yang ditentukan.
6.  Setelah selesai, ganti nama file `recovery.conf` menjadi `recovery.done` agar server dapat memulai dalam mode normal.

Prosedur ini sangat teknis dan harus diuji secara berkala dalam lingkungan non-produksi.
