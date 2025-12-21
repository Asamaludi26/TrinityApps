# Diagram Sistem

Dokumen ini berisi diagram teknis mendalam untuk membantu pemahaman alur kerja sistem.

## 1. Siklus Hidup Aset (State Diagram)

Diagram ini sangat penting untuk backend developer memahami transisi status aset yang valid.

```mermaid
stateDiagram-v2
    [*] --> IN_STORAGE: Registrasi Baru / Barang Tiba
    
    IN_STORAGE --> IN_USE: Handover / Instalasi
    IN_STORAGE --> DECOMMISSIONED: Penghapusan Aset
    
    IN_USE --> IN_STORAGE: Pengembalian (Return)
    IN_USE --> DAMAGED: Laporan Kerusakan
    IN_USE --> IN_STORAGE: Dismantle (Tarik dari Pelanggan)

    DAMAGED --> UNDER_REPAIR: Mulai Perbaikan Internal
    DAMAGED --> OUT_FOR_REPAIR: Kirim ke Vendor

    UNDER_REPAIR --> IN_STORAGE: Selesai (Stok)
    UNDER_REPAIR --> IN_USE: Selesai (Kembali ke User)
    UNDER_REPAIR --> DECOMMISSIONED: Gagal Perbaiki (Scrap)

    OUT_FOR_REPAIR --> IN_STORAGE: Terima dari Vendor
    
    DECOMMISSIONED --> [*]
```

## 2. Alur Peminjaman Aset (Loan Request Sequence)

Menjelaskan interaksi kompleks antara User, Admin, dan Sistem.

```mermaid
sequenceDiagram
    participant User as Staff (Pemohon)
    participant FE as Frontend
    participant BE as Backend API
    participant DB as Database
    participant Admin as Admin Logistik

    User->>FE: Buat Request Pinjam
    FE->>BE: POST /api/loans (items[])
    BE->>DB: Simpan LoanRequest (Status: PENDING)
    BE-->>FE: OK
    
    Note right of Admin: Admin menerima notifikasi

    Admin->>FE: Buka Detail Request
    FE->>BE: GET /api/loans/:id
    BE-->>FE: Data Request
    
    Admin->>FE: Setujui & Pilih Aset (Assign Asset ID)
    FE->>BE: PATCH /api/loans/:id/approve
    
    activate BE
    BE->>DB: Update Status Loan -> APPROVED
    BE->>DB: Create Handover Document (Draft)
    BE-->>FE: OK
    deactivate BE

    User->>FE: Terima Barang & Konfirmasi
    FE->>BE: POST /api/handovers/confirm
    BE->>DB: Update Asset Status -> IN_USE (Loaned)
    BE->>DB: Update Loan Status -> ON_LOAN
```

## 3. Alur Pencatatan Aset Massal (Bulk Registration)

```mermaid
sequenceDiagram
    participant Admin
    participant Frontend
    participant Backend
    participant DB

    Admin->>Frontend: Upload CSV / Input Form Massal (100 items)
    Frontend->>Backend: POST /api/assets/bulk
    
    activate Backend
    loop For each item
        Backend->>Backend: Generate Unique ID (AST-YYYY-XXXX)
        Backend->>Backend: Validate Data
    end
    
    Backend->>DB: Prisma.asset.createMany(...)
    DB-->>Backend: Success Count
    
    Backend->>DB: Create ActivityLog (Bulk Action)
    
    Backend-->>Frontend: 201 Created (Count: 100)
    deactivate Backend
```
