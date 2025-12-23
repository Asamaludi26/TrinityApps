# Cetak Biru Teknis (Technical Blueprint)

Dokumen ini menjelaskan detail implementasi teknis untuk arsitektur *Client-Server* antara Frontend React dan Backend NestJS.

---

## 1. Data Flow Diagram (DFD) Level 2

Diagram ini menggambarkan bagaimana data mengalir dari interaksi pengguna hingga ke persistensi database.

```mermaid
graph TD
    User((Pengguna))
    
    subgraph "Frontend Layer (Client)"
        UI[React Components]
        Store[Zustand Store]
        ApiClient[Axios Interceptor]
    end
    
    subgraph "Network & Security Layer"
        Nginx[Nginx Reverse Proxy]
        AuthGuard[JWT Auth Guard]
        Validator[Class Validator Pipe]
    end
    
    subgraph "Backend Layer (Server)"
        Controller[NestJS Controller]
        Service[Business Logic Service]
        Prisma[Prisma ORM Client]
    end
    
    subgraph "Data Layer"
        DB[(PostgreSQL)]
    end

    User -->|Klik Aksi| UI
    UI -->|Dispatch Action| Store
    Store -->|Async Request| ApiClient
    ApiClient -->|HTTPS Request (Bearer Token)| Nginx
    
    Nginx -->|Forward| AuthGuard
    AuthGuard -- Valid --> Validator
    Validator -- Valid DTO --> Controller
    
    Controller -->|Call Method| Service
    Service -->|Transaction| Prisma
    Prisma -->|SQL Query| DB
    
    DB -->|Result| Prisma
    Prisma -->|Entity| Service
    Service -->|Response DTO| Controller
    Controller -->|JSON| UI
```

---

## 2. Peta Dependensi Layanan (Service Dependency Map)

Menjelaskan ketergantungan antar modul dalam Monolith NestJS untuk menghindari *Circular Dependency* dan memahami dampak perubahan.

*   **AuthModule**:
    *   Bergantung pada: `UsersModule` (untuk validasi user).
    *   Digunakan oleh: Hampir semua modul (via `JwtAuthGuard`).
*   **TransactionsModule** (Handover, Installation, dll):
    *   Bergantung pada: `AssetsModule` (update status aset), `UsersModule`, `CustomersModule`.
    *   *Critical*: Menggunakan `PrismaService` secara langsung untuk transaksi lintas-tabel.
*   **RequestsModule**:
    *   Bergantung pada: `AssetsModule` (cek stok), `WhatsappModule` (notifikasi).
*   **StockModule** (Ledger):
    *   *Observer Pattern*: Mendengarkan event dari `AssetsModule` dan `TransactionsModule` untuk mencatat mutasi stok (`StockMovement`).

---

## 3. API Deep-Dive & Standar

Semua endpoint API harus mematuhi standar berikut untuk konsistensi dan keamanan.

### 3.1. Standar Request & Response

**Format Response Sukses (JSON):**
```json
{
  "statusCode": 200,
  "message": "Operation successful",
  "data": { ...object atau array... },
  "meta": { ...pagination info jika perlu... }
}
```

**Format Response Error:**
```json
{
  "statusCode": 400,
  "message": ["email must be an email", "password is too short"],
  "error": "Bad Request"
}
```

### 3.2. Data Transfer Objects (DTO) & Validasi

Backend **wajib** menggunakan `class-validator` untuk memvalidasi payload sebelum masuk ke logika bisnis.

**Contoh: `CreateAssetDto`**
```typescript
export class CreateAssetDto {
  @IsString()
  @IsNotEmpty()
  name: string;

  @IsEnum(AssetCondition)
  condition: AssetCondition;

  // Validasi bersyarat: Jika kategori 'Device', SN wajib. Jika 'Material', optional.
  @ValidateIf(o => o.trackingMethod === 'individual')
  @IsNotEmpty()
  serialNumber: string;
}
```

### 3.3. Mekanisme Otorisasi (RBAC)

Menggunakan custom decorator `@Roles()` di atas controller atau handler.

```typescript
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('assets')
export class AssetsController {
    
    @Get()
    @Roles('Staff', 'Leader', 'Admin Logistik') // Siapa saja bisa lihat
    findAll() { ... }

    @Post()
    @Roles('Admin Logistik', 'Super Admin') // Hanya admin yang bisa buat
    create(@Body() dto: CreateAssetDto) { ... }
}
```

---

## 4. Rencana Migrasi Data (Mock to Real)

Strategi untuk memindahkan data dari `localStorage` (fase prototipe) ke Database PostgreSQL (fase produksi).

1.  **Fitur Ekspor JSON di Frontend**:
    *   Tambahkan tombol tersembunyi di halaman Settings untuk "Export Local Data".
    *   Script akan membaca semua key `app_*` di localStorage dan mengunduh sebagai satu file `backup_prototype.json`.
2.  **Script Seeding Backend**:
    *   Buat script Node.js (`scripts/migrate-mock-data.ts`) di backend.
    *   Script membaca `backup_prototype.json`.
    *   Melakukan *mapping* ID (karena ID mock mungkin string acak, sedangkan DB mungkin perlu format UUID standar atau Auto Increment yang konsisten).
    *   Menginsert data ke PostgreSQL menggunakan Prisma `createMany`.
3.  **Validasi Integritas**:
    *   Cek apakah semua `assetId` di tabel `Transaction` benar-benar ada di tabel `Asset`.

---

## 5. Keamanan Data (Data Security Policy)

1.  **Enkripsi At-Rest**:
    *   Password di-hash menggunakan **bcrypt** (salt rounds >= 10).
    *   Backup database dienkripsi sebelum di-upload ke cloud storage.
2.  **Enkripsi In-Transit**:
    *   Wajib HTTPS untuk semua komunikasi API.
    *   Database connection string menggunakan mode SSL (`sslmode=require`).
3.  **Audit Trail (Immutability)**:
    *   Tabel `ActivityLog` bersifat *Append-Only*. Tidak boleh ada API `DELETE` atau `UPDATE` untuk tabel ini.