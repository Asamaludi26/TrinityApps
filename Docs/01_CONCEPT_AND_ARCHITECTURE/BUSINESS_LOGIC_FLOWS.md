# Alur Logika Bisnis & Fungsional (End-to-End)

Dokumen ini memetakan alur kerja pengguna (User Flow) dan logika sistem (System Logic) untuk modul-modul kritis dalam TrinityApps. Dokumen ini berfungsi sebagai acuan utama bagi pengembang Backend untuk mengimplementasikan *Business Rules*, *State Management*, dan penanganan *Edge Cases*.

---

## 1. Modul Pengadaan (Procurement & Request)

Modul ini menangani siklus hidup permintaan barang baru, mulai dari pengajuan oleh staf hingga barang tiba dan dicatat.

### 1.1. Diagram Transisi Status (Request Lifecycle)

```mermaid
stateDiagram-v2
    [*] --> PENDING: Draft Submitted
    
    state "Validasi Stok Otomatis" as AutoCheck
    PENDING --> AutoCheck: System Check
    
    AutoCheck --> AWAITING_HANDOVER: Stok Cukup (Auto-Allocation)
    AutoCheck --> LOGISTIC_APPROVED: Stok Kurang (Butuh Beli)
    
    LOGISTIC_APPROVED --> AWAITING_CEO_APPROVAL: Nominal > Limit / Project Based
    LOGISTIC_APPROVED --> PURCHASING: Nominal < Limit (Langsung Beli)
    
    AWAITING_CEO_APPROVAL --> APPROVED: CEO Sign-off
    AWAITING_CEO_APPROVAL --> REJECTED: CEO Reject
    
    APPROVED --> PURCHASING: Proses PO
    PURCHASING --> IN_DELIVERY: Vendor Kirim
    IN_DELIVERY --> ARRIVED: Barang Tiba di Gudang
    
    ARRIVED --> COMPLETED: Registrasi Aset Selesai
    AWAITING_HANDOVER --> COMPLETED: Handover Selesai
```

### 1.2. Alur Detil & Validasi

| Tahap | Lajur Pengguna (Frontend) | Lajur Logika (Backend Service) | Edge Cases & Validasi |
| :--- | :--- | :--- | :--- |
| **1. Pengajuan** | Staf memilih item dan kuantitas. Klik "Ajukan". | 1. Terima DTO `CreateRequest`.<br>2. **Atomic Transaction**: Query tabel `Asset` (status: `IN_STORAGE`) untuk cek ketersediaan.<br>3. Jika stok >= request, set status item `STOCK_ALLOCATED`.<br>4. Jika kurang, set `PROCUREMENT_NEEDED`. | **Negative Path**: Jika User adalah 'Staff', paksa tipe order 'Regular'. Leader boleh 'Urgent'. Payload kosong atau qty <= 0 wajib ditolak (400 Bad Request). |
| **2. Review Logistik** | Admin Logistik melihat request PENDING. Mengedit qty jika perlu. Klik "Approve". | 1. Update status request -> `LOGISTIC_APPROVED`.<br>2. Trigger notifikasi WhatsApp ke grup Purchasing.<br>3. Jika ada revisi qty, catat di `ActivityLog`. | **Edge Case**: Jika semua item ditolak (qty=0), status otomatis transisi ke `REJECTED`. |
| **3. Pembelian** | Admin Purchase input data PO, Vendor, Harga. Klik "Mulai Pengadaan". | 1. Validasi kelengkapan data pembelian (Harga, Vendor).<br>2. Update status -> `PURCHASING`. | **Validation**: Harga tidak boleh negatif. Tanggal beli tidak boleh di masa depan (kecuali pre-order). |
| **4. Penerimaan (Staging)** | Admin Logistik klik "Barang Tiba". Membuka menu Staging. | 1. Update status -> `ARRIVED`.<br>2. Siapkan data *pre-fill* untuk registrasi aset. | **Handling**: Barang rusak saat diterima? (Masuk alur Return Vendor - *Future Dev*). |
| **5. Konversi Aset** | Admin input SN/Mac Address. Klik "Simpan Aset". | 1. **Db Transaction**: <br>   a. Create `Asset` baru.<br>   b. Update `Request` (isRegistered = true, status = `COMPLETED`).<br>   c. Create `ActivityLog` (Asset Created). | **Failure Scenario**: Jika insert Asset gagal (misal duplikat SN), seluruh transaksi di-rollback. Request tetap `ARRIVED`. |

---

## 2. Modul Peminjaman (Loan & Assignment)

Mengatur peminjaman aset dari gudang ke staf (sementara) atau handover permanen.

### 2.1. Logic Flow: Pencegahan Race Condition (Critical)

Masalah utama dalam sistem inventori adalah dua admin mencoba menetapkan aset fisik yang sama (misal: ID `AST-001`) kepada dua pemohon berbeda pada waktu yang hampir bersamaan.

**Skenario Kegagalan (Tanpa Locking):**
1. Admin A membuka form Assign untuk Request X. Melihat `AST-001` tersedia.
2. Admin B membuka form Assign untuk Request Y. Melihat `AST-001` tersedia.
3. Admin A submit. `AST-001` update ke `IN_USE`.
4. Admin B submit. `AST-001` di-overwrite menjadi milik Request Y.
5. **Hasil**: Data korup. Satu aset dipinjam dua orang.

**Solusi Backend (Pessimistic Locking / Atomic Update):**

```mermaid
sequenceDiagram
    participant Admin
    participant BE as Backend API
    participant DB as Database

    Admin->>BE: PATCH /loans/:id/assign (AssetID: AST-001)
    
    rect rgb(255, 230, 230)
        Note over BE, DB: Critical Transaction Section
        BE->>DB: BEGIN TRANSACTION
        BE->>DB: SELECT * FROM "Asset" WHERE id='AST-001' FOR UPDATE
        
        alt Asset Status != IN_STORAGE
            DB-->>BE: Status is IN_USE
            BE->>DB: ROLLBACK
            BE-->>Admin: 409 Conflict (Aset sudah diambil orang lain)
        else Asset Status == IN_STORAGE
            BE->>DB: UPDATE "Asset" SET status='IN_USE', currentUser=...
            BE->>DB: UPDATE "LoanRequest" SET status='ON_LOAN'
            BE->>DB: COMMIT
            BE-->>Admin: 200 OK
        end
    end
```

### 2.2. Implementasi Kode (Prisma)

Gunakan `interactiveTransactions` atau raw query untuk locking jika beban tinggi. Untuk beban menengah, validasi atomik dalam `$transaction` biasanya cukup:

```typescript
// backend/src/loans/loans.service.ts
await prisma.$transaction(async (tx) => {
    // 1. Cek ulang status aset di dalam transaksi yang sama
    const asset = await tx.asset.findUniqueOrThrow({ where: { id: assetId } });
    
    if (asset.status !== 'IN_STORAGE') {
        throw new ConflictException(`Aset ${asset.name} baru saja diambil oleh user lain.`);
    }

    // 2. Lakukan update jika aman
    await tx.asset.update({ ... });
    await tx.loanRequest.update({ ... });
});
```

---

## 3. Modul Instalasi & Dismantle (Sirkulasi Pelanggan)

Alur pergerakan aset keluar ke pelanggan dan kembali lagi ke gudang.

### 3.1. Sequence Diagram: Dismantle (Penarikan)

Proses ini melibatkan pemindahan tanggung jawab dari Pelanggan -> Teknisi -> Gudang.

```mermaid
sequenceDiagram
    participant Tech as Teknisi
    participant BE as Backend API
    participant DB as Database
    
    Tech->>BE: POST /transactions/dismantle (AssetID, Kondisi)
    activate BE
    
    BE->>DB: BEGIN TRANSACTION
    BE->>DB: Verify Asset (Must be IN_USE by Customer)
    
    alt Asset Not Found at Customer
       BE-->>Tech: 400 Bad Request
    else Valid
       BE->>DB: Create DismantleReport (Status: PENDING_WAREHOUSE)
       BE->>DB: Update Asset (Status: IN_TRANSIT / MAINTENANCE)
       BE->>DB: COMMIT
       BE-->>Tech: 201 Created (Berita Acara Draft)
    end
    deactivate BE
    
    Note over BE: Barang dibawa ke gudang...
    
    participant Admin as Admin Gudang
    Admin->>BE: PATCH /transactions/dismantle/:id/confirm
    activate BE
    BE->>DB: BEGIN TRANSACTION
    BE->>DB: Update DismantleReport (Status: COMPLETED)
    BE->>DB: Update Asset (Status: IN_STORAGE, Location: 'Gudang')
    BE->>DB: COMMIT
    BE-->>Admin: 200 OK
    deactivate BE
```

### 3.2. Penanganan Pengecualian (Exception Handling)

| Skenario Error | Respon Sistem | Tindakan Pengguna |
| :--- | :--- | :--- |
| **Koneksi DB Terputus** saat Submit | Return `503 Service Unavailable` | Frontend menampilkan pesan "Koneksi terputus, data tersimpan di draft lokal. Coba lagi." |
| **Aset Tidak Ditemukan** (QR Code salah) | Return `404 Not Found` | Frontend meminta user scan ulang atau input manual ID. |
| **Pelanggan Suspend** | Return `200 OK` (Warning) | Sistem tetap mengizinkan Dismantle (pemulihan aset prioritas), tapi memberi flag `warning` pada laporan. |
| **Stok Material Habis** saat Instalasi | Return `409 Conflict` | Teknisi tidak bisa submit BA Instalasi sampai stok material di-restock di sistem. |

---

## 4. Modul Perbaikan (Maintenance & Repair)

### 4.1. Transisi Status Perbaikan & Audit Trail

Setiap perpindahan status perbaikan harus meninggalkan jejak audit yang tidak bisa dihapus.

1.  `IN_USE` -> `DAMAGED`: User melapor. (Log: "User reported damage: [Description]")
2.  `DAMAGED` -> `UNDER_REPAIR`: Admin memulai perbaikan internal. (Log: "Started repair by [Technician]")
3.  `DAMAGED` -> `OUT_FOR_REPAIR`: Dikirim ke vendor. (Log: "Sent to Vendor [Name]")
4.  `OUT_FOR_REPAIR` -> `IN_STORAGE`: Aset kembali baik. (Log: "Received from Vendor. Cost: [Rp XXX]")
5.  `UNDER_REPAIR` -> `DECOMMISSIONED`: Aset mati total. (Log: "Written off. Reason: [Reason]")

**Aturan Data**: Field `repairCost` bersifat kumulatif atau dicatat per insiden `MaintenanceLog`. Jangan hanya update field di tabel `Asset`.

### 4.2. Logika Biaya & Capex
*   Backend harus memisahkan antara biaya *Operational Expenditure (Opex)* untuk perbaikan ringan, dan *Capital Expenditure (Capex)* jika perbaikan tersebut menambah umur ekonomis aset (misal: ganti mesin utama).
*   Jika Capex, backend harus mentrigger kalkulasi ulang depresiasi (fitur masa depan).