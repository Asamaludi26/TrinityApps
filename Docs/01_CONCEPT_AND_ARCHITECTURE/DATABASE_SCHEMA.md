
# Dokumentasi Skema Database (Updated)

Dokumen ini merefleksikan struktur database PostgreSQL yang digunakan dalam implementasi produksi menggunakan Prisma ORM.

## 1. Entity-Relationship Diagram (ERD)

Relasi utama dalam sistem:
-   **User** memiliki Role dan Division.
-   **Asset** adalah entitas sentral yang terhubung ke ActivityLog, Dismantle, dan Maintenance.
-   **Request** menyimpan item dalam format JSONB untuk fleksibilitas, dan memiliki relasi ke User (Requester).
-   **LoanRequest** terhubung ke AssetReturn.

## 2. Struktur Tabel Utama (Prisma Models)

### User
Menyimpan data otentikasi dan otorisasi.
-   `role`: Enum (Staff, Leader, Admin Logistik, Admin Purchase, Super Admin).
-   `divisionId`: FK ke tabel Division.

### Asset
Menyimpan inventori fisik.
-   `id`: String (Custom ID, e.g., 'AST-001').
-   `status`: Enum (IN_STORAGE, IN_USE, etc).
-   `details`: JSONB (Menyimpan atribut spesifik yang mungkin berubah).

### Request
Menyimpan alur permintaan barang.
-   `items`: JSONB (Array of objects: `{ itemName, quantity, ... }`).
-   `status`: Enum (PENDING, APPROVED, etc).
-   `purchaseDetails`: JSONB (Detail harga dan vendor setelah disetujui).

### Transactions (Handover, Dismantle, Maintenance)
Setiap tipe transaksi memiliki tabelnya sendiri untuk menyimpan detail spesifik dokumen berita acara.

## 3. Catatan Implementasi
-   **JSONB**: Digunakan secara ekstensif untuk `items` dalam Request dan `purchaseDetails` untuk menghindari *over-normalization* yang dapat memperlambat query pada data yang jarang di-query secara terpisah.
-   **Enums**: Digunakan untuk Status dan Role untuk menjamin integritas data di level database.
