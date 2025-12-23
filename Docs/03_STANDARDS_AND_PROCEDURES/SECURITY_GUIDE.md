
# Panduan Keamanan Aplikasi

Keamanan adalah aspek non-fungsional terpenting dalam aplikasi produksi. Dokumen ini merangkum standar dan implementasi keamanan teknis yang **wajib** diterapkan pada Aplikasi Inventori Aset.

## 1. Keamanan Jaringan & Transport

### 1.1. Wajib HTTPS (TLS/SSL)
Semua komunikasi data antara klien (browser) dan server **wajib** dienkripsi.
-   **Implementasi**: Nginx menangani terminasi SSL.
-   **Force Redirect**: HTTP (port 80) harus selalu di-redirect ke HTTPS (port 443).
-   **HSTS**: Aktifkan HTTP Strict Transport Security header di Nginx.

### 1.2. HTTP Security Headers (Helmet)
Backend menggunakan pustaka `helmet` untuk mengatur header HTTP standar guna mencegah serangan umum seperti XSS, Clickjacking, dan Sniffing.

**Implementasi (`main.ts`):**
```typescript
import helmet from 'helmet';
app.use(helmet());
```

## 2. Proteksi API (Backend)

### 2.1. Rate Limiting (Anti Brute-Force & DDoS)
Mencegah penyalahgunaan API dengan membatasi jumlah request dari satu IP dalam periode waktu tertentu.

**Implementasi (`app.module.ts`):**
Menggunakan `@nestjs/throttler`.
```typescript
ThrottlerModule.forRoot([{
  ttl: 60000, // 1 menit
  limit: 100, // Maksimal 100 request per menit per IP
}])
```

### 2.2. Cross-Origin Resource Sharing (CORS) Ketat
Di produksi, jangan pernah menggunakan `origin: *`. Hanya izinkan domain frontend yang sah.

**Implementasi (`main.ts`):**
```typescript
app.enableCors({
  origin: ['https://aset.trinitimedia.com'], // Domain Produksi
  methods: 'GET,HEAD,PUT,PATCH,POST,DELETE',
  credentials: true,
});
```

### 2.3. Validasi Input (Sanitasi Data)
Jangan pernah mempercayai input dari pengguna. Semua payload request harus divalidasi menggunakan DTO dan `class-validator`.

**Implementasi Global:**
```typescript
app.useGlobalPipes(new ValidationPipe({
  whitelist: true, // Membuang properti JSON yang tidak ada di DTO (mencegah pollution)
  forbidNonWhitelisted: true, // Throw error jika ada properti ilegal
  transform: true,
}));
```

## 3. Autentikasi & Otorisasi

### 3.1. Mekanisme JWT (JSON Web Token)
-   **Stateless**: Server tidak menyimpan session state.
-   **Short-Lived Access Token**: Token akses hanya berlaku singkat (misal 12 jam).
-   **Penyimpanan Klien**: Disarankan menggunakan `httpOnly` cookie untuk mencegah pencurian token via XSS (Cross-Site Scripting), atau `localStorage` dengan sanitasi XSS yang ketat.
-   **Refresh Token Pattern** (Rekomendasi Lanjutan): Gunakan refresh token berumur panjang (7 hari) yang disimpan di database dan `httpOnly` cookie untuk memperbarui access token tanpa login ulang.

### 3.2. RBAC & Policy
-   Gunakan decorator `@Roles()` di setiap endpoint kritis.
-   **Least Privilege Principle**: Berikan hak akses seminimal mungkin. Contoh: Teknisi hanya boleh `READ` data aset, tidak boleh `DELETE`.

## 4. Keamanan Data & Integritas

### 4.1. Audit Trail (Append-Only Log)
Untuk memenuhi standar kepatuhan audit, tabel `ActivityLog` harus diperlakukan sebagai catatan sejarah yang sakral.

*   **Immutability**: Backend **TIDAK BOLEH** mengekspos endpoint untuk `UPDATE` atau `DELETE` pada tabel `ActivityLog`.
*   **Kelengkapan**: Setiap aksi "Mutasi" (Create, Update, Delete) pada entitas bisnis (Asset, Request) wajib memicu pembuatan record baru di `ActivityLog` dalam satu transaksi database (`prisma.$transaction`).
*   **Traceability**: Log harus mencatat `WHO` (User ID), `WHAT` (Action), `WHEN` (Timestamp), dan `DETAILS` (Snapshot data atau diff).

### 4.2. Database Security
*   **SQL Injection**: Penggunaan **Prisma ORM** secara otomatis memitigasi risiko SQL Injection karena penggunaan *parameterized queries* di level engine. Hindari penggunaan `$queryRaw` dengan string concatenation manual.
*   **Database User Isolation**: User database yang digunakan aplikasi (`triniti_admin`) sebaiknya hanya memiliki hak akses `CRUD` pada tabel aplikasi, bukan `SUPERUSER`.
*   **Backup Encryption**: File backup `.sql.gz` harus dienkripsi (misal menggunakan GPG) sebelum ditransfer keluar server (ke Cloud Storage) untuk mencegah kebocoran data jika backup dicuri.