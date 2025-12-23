
### 6.6. Alur Permintaan Baru (New Request Workflow)

Fitur "Request Baru" memiliki logika bisnis yang cukup kompleks yang saat ini disimulasikan di frontend (`useRequestStore.ts`). Backend wajib mengimplementasikan logika ini untuk menjamin integritas data.

#### A. Validasi Stok Otomatis (Saat `POST /api/requests`)
Saat user membuat request, Backend tidak boleh hanya menyimpan data mentah. Backend harus melakukan pengecekan stok *real-time* terhadap tabel `Asset`.

**Logic Flow:**
1.  Terima payload `CreateRequestDto` (items: `{ name, brand, quantity }[]`).
2.  Lakukan *Aggregation Query* ke tabel `Asset` untuk menghitung jumlah item dengan status `IN_STORAGE` yang cocok dengan Nama & Brand.
3.  **Tentukan Status per Item**:
    *   Jika `Stok Tersedia >= Jumlah Diminta` -> Set item status: `stock_allocated`.
    *   Jika `Stok Tersedia < Jumlah Diminta` -> Set item status: `procurement_needed`.
4.  **Tentukan Status Request**:
    *   Jika **semua** item adalah `stock_allocated` -> Status Request bisa langsung ke `AWAITING_HANDOVER` (atau `PENDING` jika butuh approval manual admin).
    *   Jika **ada satu saja** item `procurement_needed` -> Status Request wajib `PENDING` (masuk alur pengadaan).

#### B. Logika Persetujuan & Revisi (Partial Approval)
Admin Logistik/Purchase memiliki hak untuk mengubah jumlah yang disetujui (misal: Minta 10, disetujui 5 karena budget/stok).

**Endpoint:** `PATCH /api/requests/:id/review`

**Implementasi Backend:**
```typescript
async reviewRequest(id: string, adjustments: Record<itemId, { approvedQty: number, reason: string }>) {
  // 1. Validasi
  const request = await this.prisma.request.findUniqueOrThrow({ where: { id } });
  
  // 2. Update Item Statuses (JSONB Column disarankan untuk fleksibilitas)
  const updatedItemStatuses = {};
  let hasRejection = false;
  
  request.items.forEach(item => {
     const adj = adjustments[item.id];
     if (adj) {
        // Logic penentuan status item berdasarkan qty baru
        const status = adj.approvedQty === 0 ? 'rejected' 
                     : adj.approvedQty < item.quantity ? 'partial' 
                     : 'approved';
        
        updatedItemStatuses[item.id] = { 
           status, 
           approvedQuantity: adj.approvedQty, 
           reason: adj.reason 
        };
        
        if (status === 'rejected') hasRejection = true;
     }
  });

  // 3. Tentukan Status Dokumen Selanjutnya
  let nextStatus = 'LOGISTIC_APPROVED'; // Default flow
  
  // Cek jika semua item ditolak
  const allRejected = Object.values(updatedItemStatuses).every((s: any) => s.status === 'rejected');
  if (allRejected) nextStatus = 'REJECTED';

  // 4. Simpan Perubahan & Log Activity
  return this.prisma.request.update({
     where: { id },
     data: {
        status: nextStatus,
        itemStatuses: updatedItemStatuses,
        // ... update approver info ...
     }
  });
}
```

#### C. Staging & Registrasi Aset (Request to Asset Conversion)
Saat barang tiba (`status: ARRIVED`), Admin akan melakukan "Pencatatan Aset". Ini adalah proses mengubah data `RequestItem` menjadi entitas `Asset` fisik dengan Serial Number.

**Endpoint:** `POST /api/requests/:id/register-assets`

**Syarat Transactional (CRITICAL):**
Operasi ini **harus atomic**. Jangan sampai Aset tercatat tapi status Request tidak berubah, atau sebaliknya.

```typescript
async registerAssetsFromRequest(requestId: string, payload: RegisterAssetDto) {
  return this.prisma.$transaction(async (tx) => {
    // 1. Buat Aset Baru (Bulk Create)
    // Generate ID unik untuk setiap aset (AST-YYYY-XXXX)
    const newAssetsData = payload.items.map(item => ({
       // ... mapping data dari request ke asset schema ...
       status: 'IN_STORAGE', // Default masuk gudang dulu
       woRoIntNumber: requestId // Link ke Request asal
    }));
    
    await tx.asset.createMany({ data: newAssetsData });

    // 2. Update Progress Registrasi di Request
    // Backend harus melacak berapa item yang sudah diregistrasi vs total yang disetujui.
    const request = await tx.request.findUnique({ where: { id: requestId } });
    
    // Hitung apakah semua item sudah terpenuhi/dicatat?
    const isFullyRegistered = this.checkFullRegistration(request, payload);

    // 3. Update Status Request
    if (isFullyRegistered) {
       await tx.request.update({
          where: { id: requestId },
          data: { status: 'AWAITING_HANDOVER', isRegistered: true }
       });
    } else {
       // Update counter partial registration jika perlu
    }
  });
}
```
