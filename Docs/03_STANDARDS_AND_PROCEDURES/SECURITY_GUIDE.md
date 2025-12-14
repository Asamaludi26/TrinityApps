
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

### 3.1. Manajemen Password
-   Password **tidak boleh** disimpan dalam plain text.
-   Gunakan **bcrypt** dengan salt rounds minimal 10.

### 3.2. JWT (JSON Web Token)
-   Token disimpan di sisi klien (biasanya `localStorage` atau `httpOnly` cookie).
-   Gunakan `expiration` waktu pendek (misal: 1 hari) untuk token akses.
-   Secret key (`JWT_SECRET`) harus panjang, acak, dan disimpan di `.env`, jangan pernah di-commit ke Git.

## 4. Keamanan Database

-   **SQL Injection**: Penggunaan **Prisma ORM** secara otomatis memitigasi risiko SQL Injection karena penggunaan *parameterized queries* di level engine. Hindari penggunaan `$queryRaw` dengan string concatenation manual.
-   **Akses Minimal**: User database yang digunakan aplikasi sebaiknya hanya memiliki hak akses `CRUD`, bukan `SUPERUSER`.
