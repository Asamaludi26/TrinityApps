
### 6.3. Migrasi Logika Kalkulasi Stok
Logika penentuan status `stock_allocated` vs `procurement_needed` yang ada di `useRequestStore.ts` (Frontend) harus dipindah ke Backend Service.
Frontend hanya mengirim: "Saya mau 5 Laptop".
Backend yang menjawab: "OK, 3 dari Stok, 2 harus Beli".

Jangan biarkan Frontend menentukan status alokasi stok.

### 6.4. Logika Peminjaman & Penetapan Aset (Loan Assignment)
Fitur ini memiliki risiko tinggi terjadinya *Race Condition* karena Admin memilih ID aset fisik spesifik.

**Masalah:** Admin A dan Admin B membuka halaman approval bersamaan. Keduanya melihat Aset `AST-001` tersedia. Keduanya memilih aset tersebut dan klik Simpan.

**Solusi Backend (Prisma Transaction & Locking):**

```typescript
// loans/loans.service.ts
async assignAssetsToLoan(loanId: string, assignments: AssignmentDto) {
  return this.prisma.$transaction(async (tx) => {
    // 1. Validasi Status Loan (Pastikan masih PENDING)
    const loan = await tx.loanRequest.findUniqueOrThrow({ where: { id: loanId } });
    if (loan.status !== 'PENDING') throw new BadRequestException('Request sudah diproses.');

    for (const [itemId, assetIds] of Object.entries(assignments)) {
      // 2. Cek Ketersediaan Aset (Critical Check - Optimistic Locking)
      const assets = await tx.asset.findMany({
        where: { 
          id: { in: assetIds },
          status: 'IN_STORAGE' // WAJIB: Pastikan status DB masih di gudang
        }
      });

      if (assets.length !== assetIds.length) {
        throw new ConflictException('Salah satu aset yang dipilih sudah tidak tersedia/dipinjam orang lain.');
      }

      // 3. Update Status Aset menjadi 'IN_USE' (Mencegah Double Booking)
      await tx.asset.updateMany({
        where: { id: { in: assetIds } },
        data: { 
          status: 'IN_USE',
          currentUser: loan.requester,
          location: `Dipinjam oleh ${loan.requester}`,
          // Tambahkan history log di sini jika menggunakan tabel terpisah
        }
      });
    }

    // 4. Update Loan Request
    return tx.loanRequest.update({
      where: { id: loanId },
      data: {
        status: 'APPROVED',
        assignedAssetIds: assignments, // Simpan mapping JSON
        approvalDate: new Date()
      }
    });
  });
}
```

### 6.5. Logika Pengembalian & Otomatisasi Handover
Saat Admin menyetujui pengembalian (`Return`), sistem **wajib** melakukan beberapa aksi sekaligus untuk menjaga integritas data audit.

**Persyaratan Bisnis:**
1.  **Status Aset**: Aset yang dikembalikan harus berubah dari `IN_USE` menjadi `IN_STORAGE` (atau `DAMAGED` sesuai input).
2.  **Loan Request**: Update status menjadi `RETURNED` (jika semua kembali) atau tetap `ON_LOAN` (jika sebagian).
3.  **Bukti Serah Terima**: Sistem **harus** membuat dokumen `Handover` baru secara otomatis sebagai bukti legal pengembalian.

**Implementasi Backend:**
```typescript
// returns/returns.service.ts
async approveReturn(returnId: string) {
  return this.prisma.$transaction(async (tx) => {
    // 1. Ambil Data Return Draft
    const returnDoc = await tx.assetReturn.findUniqueOrThrow({ where: { id: returnId } });
    
    // 2. Update Status Aset (Kembali ke Gudang)
    await tx.asset.update({
        where: { id: returnDoc.assetId },
        data: {
            status: returnDoc.returnedCondition === 'GOOD' ? 'IN_STORAGE' : 'DAMAGED',
            currentUser: null,
            location: 'Gudang Inventori'
        }
    });

    // 3. Buat Dokumen Handover Otomatis (Audit Trail)
    const handoverCode = await this.utils.generateDocNumber('HO-RET');
    await tx.handover.create({
        data: {
            docNumber: handoverCode,
            handoverDate: new Date(),
            menyerahkan: returnDoc.returnedBy,
            penerima: returnDoc.receivedBy, // Admin
            woRoIntNumber: returnDoc.docNumber, // Referensi ke Dokumen Return
            items: { /* ... mapping item asset ... */ }
        }
    });
    
    // 4. Update Status Dokumen Return
    return tx.assetReturn.update({
        where: { id: returnId },
        data: { status: 'APPROVED', approvalDate: new Date() }
    });
  });
}
```
