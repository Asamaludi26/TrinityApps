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
        ApiClient[Api Service Layer]
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
    Store -->|Call API| ApiClient
    
    ApiClient -.->|Dev Mode| LocalStorage[(Mock Data)]
    ApiClient -->|Prod Mode (HTTPS)| Nginx
    
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

## 2. Strategi Migrasi: Mock API ke Real API

Transisi dari prototipe ke produksi membutuhkan penggantian lapisan data tanpa merusak UI.

### 2.1. Abstraksi Layanan API
Saat ini, `src/services/api.ts` menangani logika mock.

**Langkah 1: Interface Pattern**
Buat interface standar untuk semua panggilan API.
```typescript
// src/services/interfaces.ts
export interface IAssetService {
    getAssets(): Promise<Asset[]>;
    createAsset(data: CreateAssetDto): Promise<Asset>;
    // ...
}
```

**Langkah 2: Implementasi Real API**
Buat `src/services/api.real.ts` yang menggunakan `axios` atau `fetch`.
```typescript
import axios from 'axios';
const client = axios.create({ baseURL: import.meta.env.VITE_API_URL });

export const RealAssetService = {
    getAssets: async () => {
        const { data } = await client.get('/assets');
        return data.data; // Unrap response standar
    }
}
```

**Langkah 3: Switching Mechanism (Feature Flag)**
Di `src/services/api.ts`, gunakan environment variable untuk menentukan sumber data.

```typescript
const USE_MOCK = import.meta.env.VITE_USE_MOCK === 'true';

export const fetchAllData = USE_MOCK ? MockService.fetchAllData : RealService.fetchAllData;
```

### 2.2. Sinkronisasi Data Awal
Data yang sudah diinput user di prototipe (LocalStorage) harus bisa dimigrasikan ke PostgreSQL.

1.  **Export Tool**: Tambahkan fitur tersembunyi di Frontend untuk men-dump `localStorage` menjadi `migration_dump.json`.
2.  **Seeding Script (Backend)**:
    *   Buat script `backend/scripts/import-mock.ts`.
    *   Baca `migration_dump.json`.
    *   Lakukan mapping ID (karena ID mock mungkin string acak, sedangkan DB mungkin UUID/Int).
    *   Insert ke DB menggunakan `prisma.createMany`.

---

## 3. Prisma Production Lifecycle

Mengelola skema database di lingkungan produksi sangat berbeda dengan development.

### 3.1. Alur Migrasi (CI/CD)
Jangan pernah gunakan `prisma migrate dev` di produksi. Itu akan mencoba mereset database jika ada konflik.

**Perintah Produksi:**
```bash
# 1. Generate Client (Pastikan Type Definition terbaru)
npx prisma generate

# 2. Deploy Migration (Hanya terapkan perubahan yang pending)
npx prisma migrate deploy
```

### 3.2. Data Seeding (Master Data)
Data master (Divisi, Kategori Aset, Admin User) wajib ada saat aplikasi pertama kali deploy.

1.  Pastikan file `backend/prisma/seed.ts` sudah dikonfigurasi.
2.  Jalankan di server: `npx prisma db seed`.

### 3.3. Penanganan Shadow Database
Prisma memerlukan "Shadow Database" sementara saat menjalankan `migrate dev` untuk mendeteksi perubahan schema.
*   **Di Lokal**: Docker compose membuat DB utama. Prisma otomatis membuat DB shadow.
*   **Di Cloud (RDS/CloudSQL)**: User DB mungkin tidak punya hak `CREATE DATABASE`.
    *   *Solusi*: Buat manual database `triniti_shadow`.
    *   Set env: `SHADOW_DATABASE_URL=postgresql://...?db=triniti_shadow`.

---

## 4. Standar API & Keamanan Data

### 4.1. Standar Response (JSend-like)
Semua endpoint harus mengembalikan format yang konsisten:

```json
// Sukses
{
  "statusCode": 200,
  "message": "Data retrieved successfully",
  "data": { ... },
  "meta": { "page": 1, "total": 100 } // Opsional
}

// Error
{
  "statusCode": 400,
  "error": "Bad Request",
  "message": ["email must be an email"]
}
```

### 4.2. Kebijakan Keamanan Data
1.  **Enkripsi At-Rest**:
    *   Password wajib di-hash (bcrypt).
    *   Backup database dienkripsi (GPG/AES) sebelum upload ke cloud storage.
2.  **Enkripsi In-Transit**:
    *   Wajib HTTPS/TLS 1.2+ untuk semua komunikasi API.
3.  **Audit Trail (Immutability)**:
    *   Tabel `ActivityLog` bersifat *Append-Only*.
    *   Tidak boleh ada endpoint API `DELETE` atau `UPDATE` untuk tabel ini.
    *   Hanya Database Admin level root yang bisa menghapus log (untuk maintenance/archiving).