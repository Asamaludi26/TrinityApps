# Product Requirements Document (PRD): Aplikasi Inventori Aset

-   **Versi**: 1.2 (Ditingkatkan)
-   **Tanggal**: 17 Oktober 2025
-   **Pemilik Dokumen**: Angga Samuludi Septiawan

## 1. Pendahuluan

### 1.1. Latar Belakang & Masalah
Saat ini, PT. Triniti Media Indonesia mengelola aset perusahaan menggunakan metode manual yang rentan terhadap kesalahan, kurang efisien, dan sulit untuk dilacak. Proses mulai dari permintaan barang, pencatatan, serah terima, hingga penarikan kembali aset tidak terpusat, menyebabkan kesulitan dalam audit, potensi kehilangan aset, dan ketidakjelasan status kepemilikan aset.

### 1.2. Visi & Tujuan Proyek
**Visi**: Menciptakan sistem manajemen inventori aset yang terpusat, modern, dan efisien untuk memberikan visibilitas penuh dan kontrol atas seluruh siklus hidup aset di PT. Triniti Media Indonesia.

**Tujuan**:
1.  **Sentralisasi Data**: Mengumpulkan semua data aset dalam satu database yang terstruktur.
2.  **Otomatisasi Alur Kerja**: Mendigitalkan proses permintaan, persetujuan, serah terima, dan penarikan aset.
3.  **Peningkatan Akuntabilitas**: Melacak riwayat setiap aset, termasuk siapa yang bertanggung jawab atasnya pada waktu tertentu.
4.  **Efisiensi Operasional**: Mempercepat proses audit dan pelaporan dengan data yang akurat dan real-time.
5.  **Pengurangan Risiko**: Meminimalkan risiko kehilangan atau kerusakan aset dengan pemantauan yang lebih baik.

### 1.3. Lingkup Proyek
Aplikasi ini akan mencakup fungsionalitas _end-to-end_ untuk manajemen aset, termasuk:
-   **IN-SCOPE**: Manajemen Request, Pencatatan Aset (Individual & Massal), Stok, Handover Internal, Instalasi & Dismantle di Pelanggan, Manajemen Perbaikan Aset, Manajemen Pengguna & Divisi, Manajemen Kategori, Pelaporan, dan Pencetakan Kode QR.
-   **OUT-OF-SCOPE**: Integrasi dengan sistem akuntansi, manajemen _purchase order_ (PO) mendalam, manajemen vendor, fitur depresiasi aset.

---

## 2. Target Pengguna & Peran (User Persona & Roles)

Aplikasi akan memiliki lima tingkat hak akses utama untuk merefleksikan struktur operasional yang realistis.

| Peran              | Deskripsi                                                                                                                                                      | Hak Akses Utama                                                                                                                                                                                                                            |
| ------------------ | -------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| **Staff**          | Karyawan dari berbagai divisi yang membutuhkan aset untuk pekerjaan mereka.                                                                                      | - Membuat dan melihat status request aset pribadi (hanya tipe **Regular Stock**).<br>- Melihat daftar aset yang sedang digunakan.<br>- Melaporkan kerusakan pada aset yang dipegang. |
| **Leader**         | Peran ini secara spesifik ditujukan untuk Manajer atau Supervisor (SPV) di setiap divisi. Mereka bertanggung jawab atas kebutuhan proyek atau situasi darurat. | - Semua hak akses Staff.<br>- Membuat request aset tipe **Urgent** dan **Project Based**.                                                                                                                                        |
| **Admin Logistik** | Staf dari Divisi Logistik yang bertanggung jawab atas operasional gudang, pencatatan, dan pergerakan fisik aset. | - Mencatat aset baru.<br>- Mengelola handover dan dismantle.<br>- Mengelola alur perbaikan aset.<br>- Mengelola data pelanggan dan kategori aset.<br>- Melihat semua request. |
| **Admin Purchase** | Staf yang bertanggung jawab atas proses pengadaan dan persetujuan permintaan. | - Mengelola (menyetujui/menolak) request aset.<br>- Memperbarui status pengadaan (pembelian, pengiriman, tiba).<br>- Mengelola data pelanggan dan kategori aset. |
| **Super Admin**    | Pimpinan atau manajer senior yang memiliki otoritas penuh atas sistem.                                                                                           | - Semua hak akses Admin Logistik & Admin Purchase.<br>- Mengelola akun pengguna dan divisi.<br>- Memberikan persetujuan final untuk request bernilai tinggi.<br>- Mengakses semua laporan dan analitik.<br>- Dapat melakukan disposisi & meminta update progres. |


---

## 3. Persyaratan Fungsional (User Stories)

| Alur Kerja                   | ID      | Sebagai... (Peran)    | Saya ingin...                                                                                                       | Agar...                                                                               | Prioritas |
| ---------------------------- | ------- | --------------------- | ------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------- | --------- |
| **Permintaan Aset**          | US-1    | Staff                 | mengisi formulir request dengan memilih item dari daftar standar                                                    | prosesnya cepat dan tidak ada kesalahan pengetikan.                                   | **Tinggi**  |
|                              | US-2    | Staff                 | melihat status semua permintaan yang pernah saya ajukan (menunggu, disetujui, ditolak)                              | saya tahu progresnya.                                                                 | **Tinggi**  |
|                              | US-3    | Leader                | bisa membuat request 'Urgent' dengan menyertakan justifikasi                                                        | kebutuhan mendesak dapat segera diproses.                                             | **Tinggi**  |
|                              | US-4    | Admin Purchase/Logistik| menerima notifikasi ketika ada request baru atau ada *follow-up*                                                    | saya bisa segera memprosesnya.                                                        | **Tinggi**  |
|                              | US-5    | Admin Purchase        | bisa menyetujui (level logistik) atau menolak sebuah request dengan memberikan catatan                              | keputusan saya transparan.                                                            | **Tinggi**  |
|                              | US-6    | Super Admin           | harus memberikan persetujuan final untuk request dengan nilai total di atas ambang batas (misal: Rp 10.000.000)      | dapat menjaga kontrol anggaran perusahaan.                                            | **Tinggi**  |
| **Pencatatan Aset**          | US-7    | Admin Logistik        | mencatat aset baru dari request yang telah tiba, dengan data yang sebagian sudah terisi                               | mempercepat proses pencatatan.                                                        | **Tinggi**  |
|                              | US-8    | Admin Logistik        | mencetak label Kode QR untuk setiap aset yang baru dicatat, baik secara individual maupun massal                    | mudah diidentifikasi dan dilacak di kemudian hari.                                    | **Tinggi**  |
|                              | US-9    | Admin Logistik        | mencatat aset dalam jumlah banyak (bulk) untuk item yang tidak memerlukan pelacakan individual (misal: kabel)       | efisiensi waktu saat mencatat barang habis pakai.                                     | **Medium**  |
| **Serah Terima & Penarikan** | US-10   | Admin Logistik        | membuat Berita Acara Serah Terima (BAST) digital saat menyerahkan aset kepada seorang Staff                         | ada jejak digital yang jelas mengenai siapa yang bertanggung jawab.                   | **Tinggi**  |
|                              | US-11   | Staff (Teknisi)       | membuat Berita Acara Dismantle yang mencatat kondisi aset saat ditarik dari lokasi pelanggan                        | ada bukti kondisi barang saat diterima kembali.                                       | **Tinggi**  |
|                              | US-12   | Admin Logistik        | status aset otomatis kembali menjadi "Disimpan" (In Storage) setelah proses dismantle diselesaikan                  | stok gudang selalu akurat.                                                            | **Tinggi**  |
| **Pelaporan & Pencarian**    | US-13   | Super Admin           | melihat dashboard yang menampilkan ringkasan jumlah aset, statusnya, dan tugas yang memerlukan tindakan             | bisa mendapatkan gambaran umum kondisi inventori dengan cepat.                        | **Tinggi**  |
|                              | US-14   | Semua Pengguna        | bisa dengan cepat mencari aset berdasarkan ID, nama, SN, atau dengan memindai Kode QR/Barcode-nya                   | menemukan informasi aset secara instan.                                               | **Tinggi**  |
|                              | US-15   | Admin Purchase/Logistik| bisa mengekspor daftar aset atau request ke dalam format CSV                                                        | dapat membuat laporan offline atau analisis lebih lanjut.                              | **Medium**  |
| **Manajemen Perbaikan**      | US-16   | Staff                 | melaporkan kerusakan pada aset yang sedang saya gunakan, dengan menyertakan deskripsi & foto                          | tim Admin Logistik dapat segera menindaklanjuti.                                      | **Tinggi**  |
|                              | US-17   | Admin Logistik        | mengelola alur perbaikan, mulai dari memulai perbaikan (internal/eksternal) hingga menyelesaikannya                 | status aset yang rusak selalu terpantau.                                              | **Tinggi**  |

---

## 4. Aturan Bisnis (Business Rules)

| ID Aturan | Trigger                               | Kondisi                                         | Aksi                                | Aktor yang Diizinkan |
| :-------- | :------------------------------------ | :---------------------------------------------- | :---------------------------------- | :------------------- |
| **BR-001**| Persetujuan Request                   | `status == 'PENDING'`                           | Melakukan Persetujuan Awal          | `Admin Logistik`, `Super Admin` |
| **BR-002**| Persetujuan Request                   | `status == 'LOGISTIC_APPROVED'`                 | Mengisi Detail Pembelian            | `Admin Purchase` |
| **BR-003**| Persetujuan Request                   | `status == 'AWAITING_CEO_APPROVAL'` dan `totalValue > 10000000` | Melakukan Persetujuan Final | `Super Admin`        |
| **BR-004**| Membuat Request                       | `user.role == 'Staff'`                          | Hanya dapat memilih `order.type == 'Regular Stock'` | `Staff`            |
| **BR-005**| Membuat Request                       | `order.type == 'Urgent'`                        | Wajib mengisi `justification`       | `Leader`, `Admin Purchase`, `Admin Logistik`, `Super Admin` |
| **BR-006**| Hapus Pelanggan                       | Pelanggan masih memiliki aset terpasang         | Aksi hapus ditolak                  | `Admin Purchase`, `Admin Logistik`, `Super Admin` |
| **BR-007**| Hapus Divisi                          | Divisi masih memiliki anggota                   | Aksi hapus ditolak                  | `Super Admin`        |

---

## 5. Persyaratan Non-Fungsional

-   **Keamanan**: Aplikasi harus memiliki sistem login yang aman dan hak akses berbasis peran.
-   **Performa**: Waktu muat halaman tidak boleh lebih dari 3 detik. Operasi pencarian dan filter harus terasa instan.
-   **Usability**: Antarmuka harus bersih, intuitif, dan mudah digunakan bahkan oleh pengguna non-teknis.
-   **Skalabilitas**: Arsitektur harus mampu menangani penambahan jumlah aset dan pengguna di masa depan tanpa penurunan performa yang signifikan.
-   **Kompatibilitas**: Aplikasi harus berjalan dengan baik di browser modern versi terbaru (Chrome, Firefox, Safari, Edge).
