# Panduan Troubleshooting Teknis

Dokumen ini berisi solusi untuk masalah teknis yang mungkin dihadapi oleh pengembang atau sysadmin saat mengelola Aplikasi Inventori Aset.

---

## 1. Database & Prisma ORM

### Masalah: `PrismaClientInitializationError: Can't reach database server`
*   **Gejala**: Backend gagal start atau crash dengan error koneksi database.
*   **Penyebab Umum**:
    1.  Container database belum siap menerima koneksi saat backend start.
    2.  Kredensial di `.env` salah.
    3.  Host database salah (gunakan nama service docker `db`, bukan `localhost` jika di dalam container).
*   **Solusi**:
    *   Pastikan di `docker-compose.yml`, service `api` memiliki `depends_on: - db`.
    *   Cek koneksi manual: `docker compose exec api npx prisma db pull`.

### Masalah: "Foreign Key Constraint Failed" saat Hapus Data
*   **Gejala**: Error saat menghapus User, Division, atau Asset.
*   **Penyebab**: Data yang dihapus masih direferensikan oleh tabel lain (misal: Menghapus User yang pernah membuat Request).
*   **Solusi**:
    *   **Pencegahan**: Aplikasi dirancang menggunakan **Soft Delete** (menandai status `deleted` atau `inactive`), bukan menghapus fisik row di database.
    *   **Penanganan**: Jangan hapus data master yang sudah memiliki transaksi. Non-aktifkan saja.

---

## 2. Docker & Environment

### Masalah: Perubahan Kode Tidak Terrefleksi di Server
*   **Gejala**: Sudah git pull, tapi fitur baru tidak muncul.
*   **Penyebab**: Docker image belum di-rebuild ulang dengan kode baru.
*   **Solusi**:
    ```bash
    # Perintah wajib setelah git pull
    docker compose up -d --build
    ```

### Masalah: Kehabisan Ruang Disk (Disk Space Full)
*   **Gejala**: Server lambat, docker gagal start, log error "No space left on device".
*   **Penyebab**: Log docker atau artifact build menumpuk.
*   **Solusi**:
    ```bash
    # Hapus container, network, dan image yang tidak terpakai
    docker system prune -a -f
    ```

---

## 3. Data Integrity & Edge Cases

### Masalah: Aset "Gantung" (Orphan Status)
*   **Skenario**: Aset statusnya `IN_USE` tapi tidak ada di tangan User manapun, atau User dihapus.
*   **Penyebab**: Kegagalan transaksi database (sebelum implementasi Transactional Atomic) atau penghapusan manual via SQL.
*   **Solusi**:
    *   Jalankan script audit (perlu dibuat) untuk mendeteksi aset dengan `currentUser != null` tapi user ID-nya invalid.
    *   Reset status aset tersebut ke `IN_STORAGE` via Database Admin Tool.

### Masalah: Stok Minus
*   **Skenario**: Stok material tercatat negatif (misal: -5 meter).
*   **Penyebab**: Race condition saat dua admin menginput pengeluaran barang bersamaan.
*   **Solusi**:
    *   Pastikan backend menggunakan `prisma.$transaction` dengan teknik *row locking* atau validasi stok ulang sesaat sebelum `update`.
    *   Lakukan *Stock Opname* (penyesuaian manual) untuk mengoreksi angka di sistem sesuai fisik.

---

## 4. Isu Nginx & Jaringan

### Masalah: "413 Request Entity Too Large"
*   **Gejala**: Gagal upload foto aset atau lampiran BAST.
*   **Penyebab**: Batas upload default Nginx (biasanya 1MB).
*   **Solusi**:
    *   Edit konfigurasi nginx (`/etc/nginx/sites-available/triniti-asset`).
    *   Tambahkan `client_max_body_size 10M;` di dalam blok `server` atau `location`.
    *   Restart Nginx: `sudo systemctl restart nginx`.