# Dokumentasi Skema Database

Dokumen ini menjelaskan struktur logis dan relasi antar tabel dalam database PostgreSQL untuk Aplikasi Inventori Aset. Skema ini dirancang berdasarkan definisi tipe di `src/types/index.ts` dan berfungsi sebagai cetak biru untuk implementasi menggunakan Prisma ORM.

## 1. Entity-Relationship Diagram (ERD)

Diagram berikut memvisualisasikan entitas utama dan hubungannya.

```mermaid
erDiagram
    User {
        Int id PK
        String name
        String email UK
        String password
        String role
        Int divisionId FK
    }

    Division {
        Int id PK
        String name UK
    }

    Asset {
        String id PK
        String name
        String serialNumber UK
        String status
        String condition
        String location
        String currentUser "Nullable (nama user atau ID customer)"
        DateTime purchaseDate
        Decimal purchasePrice
        String vendor
        String poNumber
        String invoiceNumber
        DateTime warrantyEndDate
        Boolean isDismantled
    }
    
    Customer {
        String id PK
        String name
        String address
        String phone
        String email
        String status
        DateTime installationDate
        String servicePackage
    }

    Request {
        String id PK
        String status
        DateTime requestDate
        Json items
        Json orderDetails
        Decimal totalValue
        Int requesterId FK
    }
    
    Handover {
        String id PK
        DateTime handoverDate
        String menyerahkan
        String penerima
        Json items
    }
    
    Dismantle {
        String id PK
        DateTime dismantleDate
        String assetId FK
        String customerId FK
        String technician
        String retrievedCondition
    }
    
    ActivityLog {
        String id PK
        String action
        String details
        DateTime timestamp
        String user
        String assetId FK
    }

    User ||--o{ Division : "belongs to"
    Request ||--o{ User : "requested by"
    Asset }o--o| User : "assigned to"
    Asset }o--o| Customer : "installed at"
    Dismantle ||--o{ Asset : "of"
    Dismantle ||--o{ Customer : "from"
    ActivityLog ||--o{ Asset : "logs for"
```
_Catatan: Diagram ini disederhanakan untuk menunjukkan relasi utama. Beberapa kolom tidak ditampilkan untuk kejelasan._

## 2. Data Dictionary

Berikut adalah penjelasan untuk tabel-tabel utama dalam database.

### Tabel: `User`
Menyimpan informasi akun pengguna yang dapat login ke sistem.

| Nama Kolom   | Tipe Data         | Keterangan                                       |
|--------------|-------------------|--------------------------------------------------|
| `id`         | SERIAL `(PK)`     | ID unik untuk setiap pengguna.                   |
| `name`       | VARCHAR(255)      | Nama lengkap pengguna.                           |
| `email`      | VARCHAR(255) `(UK)`| Alamat email unik untuk login.                   |
| `password`   | VARCHAR(255)      | Hash kata sandi pengguna (menggunakan bcrypt).   |
| `role`       | VARCHAR(50)       | Peran pengguna: `Staff`, `Leader`, `Admin Logistik`, `Admin Purchase`, `Super Admin`. |
| `divisionId` | INTEGER `(FK)`    | ID divisi tempat pengguna bernaung. Relasi ke tabel `Division`. |

### Tabel: `Asset`
Tabel inti yang menyimpan data setiap unit aset yang dimiliki perusahaan.

| Nama Kolom       | Tipe Data         | Keterangan                                                                     |
|------------------|-------------------|--------------------------------------------------------------------------------|
| `id`             | VARCHAR(20) `(PK)`| ID unik aset, biasanya dengan format `AST-XXXX`.                               |
| `name`           | VARCHAR(255)      | Nama aset (misal: "Router WiFi Archer C6").                                    |
| `category`       | VARCHAR(255)      | Kategori aset (misal: "Perangkat Pelanggan (CPE)").                             |
| `type`           | VARCHAR(255)      | Tipe aset dalam kategori (misal: "Router WiFi").                                |
| `brand`          | VARCHAR(100)      | Merek aset.                                                                    |
| `serialNumber`   | VARCHAR(100) `(UK)`| Nomor seri unik dari pabrikan.                                                 |
| `macAddress`     | VARCHAR(17)       | MAC Address, jika ada.                                                         |
| `registrationDate`| DATE             | Tanggal aset dicatat di sistem.                                                |
| `recordedBy`     | VARCHAR(255)      | Nama pengguna yang mencatat aset.                                              |
| `purchaseDate`   | DATE              | Tanggal pembelian aset.                                                        |
| `purchasePrice`  | DECIMAL(12, 2)    | Harga beli aset.                                                               |
| `vendor`         | VARCHAR(255)      | Nama vendor atau toko tempat pembelian.                                        |
| `poNumber`       | VARCHAR(50)       | Nomor Purchase Order terkait.                                                  |
| `invoiceNumber`  | VARCHAR(100)      | Nomor faktur pembelian.                                                        |
| `warrantyEndDate`| DATE              | Tanggal berakhirnya masa garansi.                                              |
| `location`       | VARCHAR(255)      | Lokasi fisik aset (misal: "Gudang Inventori", "Terpasang di Pelanggan X").      |
| `locationDetail` | VARCHAR(255)      | Detail lokasi (misal: "Rak C-05").                                             |
| `currentUser`    | VARCHAR(255)      | Nama staf atau ID pelanggan yang sedang menggunakan/bertanggung jawab atas aset. |
| `status`         | VARCHAR(50)       | Status aset: `IN_STORAGE`, `IN_USE`, `DAMAGED`, `UNDER_REPAIR`, `DECOMMISSIONED`. |
| `condition`      | VARCHAR(50)       | Kondisi fisik aset: `BRAND_NEW`, `GOOD`, `USED_OKAY`, `MINOR_DAMAGE`, dll.     |
| `notes`          | TEXT              | Catatan tambahan.                                                              |
| `isDismantled`   | BOOLEAN           | Menandakan apakah aset pernah ditarik dari pelanggan.                          |

### Tabel: `Request`
Mencatat setiap permintaan pengadaan barang/aset dari pengguna.

| Nama Kolom      | Tipe Data           | Keterangan                                                                                |
|-----------------|---------------------|-------------------------------------------------------------------------------------------|
| `id`            | VARCHAR(20) `(PK)`  | ID unik permintaan, biasanya dengan format `REQ-XXX`.                                     |
| `status`        | VARCHAR(50)         | Status alur kerja: `PENDING`, `APPROVED`, `REJECTED`, `COMPLETED`, dll.        |
| `requestDate`   | TIMESTAMP           | Tanggal dan waktu permintaan dibuat.                                                      |
| `requesterId`   | INTEGER `(FK)`      | ID pengguna yang membuat permintaan. Relasi ke tabel `User`.                              |
| `finalApproverId`| INTEGER `(FK)`    | ID pengguna (Admin/Super Admin) yang memberikan persetujuan final.                        |
| `items`         | JSONB               | Array JSON yang berisi detail item yang diminta (nama, jumlah, keterangan).             |
| `order`         | JSONB               | Objek JSON yang berisi tipe order (`Regular`, `Urgent`, `Project Based`) dan detailnya.   |
| `totalValue`    | DECIMAL(12, 2)      | Estimasi total nilai permintaan.                                                          |
| `rejectionReason`| TEXT             | Alasan jika permintaan ditolak.                                                           |

### Tabel: `Customer`
Menyimpan data pelanggan PT. Triniti Media Indonesia.

| Nama Kolom | Tipe Data        | Keterangan                                       |
|------------|------------------|--------------------------------------------------|
| `id`       | VARCHAR(20) `(PK)`| ID unik pelanggan, biasanya `TMI-XXXXX`.         |
| `name`     | VARCHAR(255)     | Nama lengkap pelanggan atau nama perusahaan.     |
| `address`  | TEXT             | Alamat lengkap pelanggan.                        |
| `phone`    | VARCHAR(20)      | Nomor telepon pelanggan.                         |
| `email`    | VARCHAR(255)     | Alamat email pelanggan.                          |
| `status`   | VARCHAR(50)      | Status pelanggan: `Aktif`, `Tidak Aktif`, `Suspend`. |
| `installationDate`| DATE     | Tanggal instalasi layanan pertama kali.          |
| `servicePackage`| VARCHAR(100)| Nama paket layanan yang digunakan.               |

### Tabel: `ActivityLog`
Mencatat semua histori penting yang terjadi pada sebuah aset.

| Nama Kolom    | Tipe Data         | Keterangan                                         |
|---------------|-------------------|----------------------------------------------------|
| `id`          | SERIAL `(PK)`     | ID unik untuk setiap entri log.                    |
| `assetId`     | VARCHAR(20) `(FK)`| ID aset yang terkait. Relasi ke tabel `Asset`.     |
| `timestamp`   | TIMESTAMP         | Waktu kejadian.                                    |
| `user`        | VARCHAR(255)      | Nama pengguna yang melakukan aksi.                 |
| `action`      | VARCHAR(100)      | Jenis aksi (misal: 'Aset Dicatat', 'Serah Terima').|
| `details`     | TEXT              | Deskripsi detail dari aksi yang dilakukan.         |
| `referenceId` | VARCHAR(50)       | ID dokumen terkait (misal: ID Handover, Request).  |

## 3. Implementasi Skema Prisma (schema.prisma)

Berikut adalah implementasi **lengkap dan siap pakai** dari skema database menggunakan sintaks Prisma. File ini akan menjadi sumber kebenaran tunggal untuk model data dan relasi di backend.

```prisma
// This is your Prisma schema file,
// learn more about it in the docs: https://pris.ly/d/prisma-schema

generator client {
  provider = "prisma-client-js"
}

datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}

// =================================
//        MODELS & ENUMS
// =================================

model User {
  id         Int       @id @default(autoincrement())
  name       String
  email      String    @unique
  password   String // Stored as a hash
  role       UserRole
  divisionId Int?
  division   Division? @relation(fields: [divisionId], references: [id])
  requests   Request[]
}

model Division {
  id    Int    @id @default(autoincrement())
  name  String @unique
  users User[]
}

model Customer {
  id               String      @id
  name             String
  address          String
  phone            String
  email            String      @unique
  status           CustomerStatus
  installationDate DateTime
  servicePackage   String
  dismantles       Dismantle[]
}

model Asset {
  id               String       @id
  name             String
  category         String
  type             String
  brand            String
  serialNumber     String?      @unique
  macAddress       String?
  registrationDate DateTime
  recordedBy       String
  purchaseDate     DateTime?
  purchasePrice    Decimal?
  vendor           String?
  poNumber         String? // Can be related to a Request ID
  invoiceNumber    String?
  warrantyEndDate  DateTime?
  location         String?
  locationDetail   String?
  currentUser      String? // Can be a User's name or a Customer's ID
  status           AssetStatus
  condition        AssetCondition
  notes            String?
  isDismantled     Boolean      @default(false)
  
  dismantle        Dismantle[]
  activityLog      ActivityLog[]
}

model Request {
  id                     String       @id
  requesterId            Int
  requestDate            DateTime
  status                 ItemStatus
  order                  Json // Stores OrderDetails
  items                  Json // Stores RequestItem[]
  totalValue             Decimal?
  logisticApprover       String?
  logisticApprovalDate   DateTime?
  finalApprover          String?
  finalApprovalDate      DateTime?
  rejectionReason        String?
  rejectedBy             String?
  rejectionDate          DateTime?
  isRegistered           Boolean      @default(false)
  
  requester              User         @relation(fields: [requesterId], references: [id])
}

model Handover {
  id           String   @id
  handoverDate DateTime
  menyerahkan  String
  penerima     String
  mengetahui   String
  woRoIntNumber String?
  items        Json // Stores HandoverItem[]
  status       ItemStatus
}

model Dismantle {
  id                 String         @id
  dismantleDate      DateTime
  technician         String
  retrievedCondition AssetCondition
  notes              String?
  acknowledger       String?
  status             ItemStatus
  
  assetId            String
  asset              Asset          @relation(fields: [assetId], references: [id])
  
  customerId         String
  customer           Customer       @relation(fields: [customerId], references: [id])
}

model ActivityLog {
  id          Int      @id @default(autoincrement())
  timestamp   DateTime @default(now())
  user        String
  action      String
  details     String
  referenceId String?
  
  assetId     String
  asset       Asset    @relation(fields: [assetId], references: [id])
}

// ENUMS

enum UserRole {
  Staff
  Leader
  AdminLogistik
  AdminPurchase
  SuperAdmin
}

enum CustomerStatus {
  Aktif
  Tidak_Aktif
  Suspend
}

enum AssetStatus {
  IN_USE
  IN_STORAGE
  UNDER_REPAIR
  OUT_FOR_REPAIR
  DAMAGED
  DECOMMISSIONED
}

enum AssetCondition {
  BRAND_NEW
  GOOD
  USED_OKAY
  MINOR_DAMAGE
  MAJOR_DAMAGE
  FOR_PARTS
}

enum ItemStatus {
  PENDING
  LOGISTIC_APPROVED
  AWAITING_CEO_APPROVAL
  APPROVED
  PURCHASING
  IN_DELIVERY
  ARRIVED
  REJECTED
  CANCELLED
  COMPLETED
  IN_PROGRESS
  AWAITING_HANDOVER
}
```