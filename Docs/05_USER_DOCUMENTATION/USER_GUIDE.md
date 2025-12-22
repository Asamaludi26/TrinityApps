
# Panduan Pengguna Aplikasi Inventori Aset

Selamat datang di Panduan Pengguna Aplikasi Inventori Aset PT. Triniti Media Indonesia. Dokumen ini bertujuan untuk membantu Anda memahami dan menggunakan fitur-fitur aplikasi secara efektif sesuai dengan peran Anda.

## 1. Memulai

### 1.1. Login
- Buka aplikasi melalui browser Anda.
- Masukkan **alamat email** dan **kata sandi** yang telah terdaftar.
- Anda dapat mencentang "Ingat saya" agar tidak perlu memasukkan email saat login berikutnya.
- Jika Anda tidak yakin dengan akun yang harus digunakan, klik tombol **"Lihat Akun Demo"** untuk melihat daftar akun yang tersedia.

`[Screenshot: Halaman login dengan field email, password, dan tombol 'Lihat Akun Demo' disorot]`

- Setelah berhasil login, Anda akan diarahkan ke halaman **Dashboard**.

### 1.2. Navigasi Utama
- **Sidebar (Menu Kiri)**: Merupakan pusat navigasi utama. Klik pada menu untuk berpindah antar halaman seperti Dashboard, Request Aset, Catat Aset, dll.
- **Header (Bagian Atas)**:
    - **Tombol Notifikasi (Lonceng)**: Menampilkan notifikasi terbaru yang relevan untuk Anda.
    - **Tombol Pindai QR**: Membuka kamera untuk memindai kode QR atau barcode aset.
    - **Menu Profil**: Klik pada nama Anda untuk melihat role Anda dan tombol **Logout**.

`[Screenshot: Tampilan utama aplikasi dengan panah menunjuk ke Sidebar dan Header]`

## 2. Dashboard

Halaman Dashboard memberikan gambaran umum kondisi inventori dan tugas-tugas yang memerlukan perhatian Anda.
- **Ringkasan Statistik**: Menampilkan jumlah total aset, nilai stok, dan jumlah aset yang sedang digunakan.
- **Item Perlu Tindakan**: Panel ini berisi pintasan cepat ke tugas-tugas penting, seperti:
    - **Perlu Persetujuan**: Request aset yang menunggu persetujuan Anda.
    - **Siap Dicatat**: Barang yang sudah tiba di gudang dan perlu dicatat sebagai aset.
    - **Aset Rusak**: Daftar aset yang dilaporkan rusak dan memerlukan tindakan.
- **Analitik & Riwayat**: Menampilkan grafik distribusi aset dan daftar aktivitas terbaru di dalam sistem.

`[Screenshot: Halaman Dashboard dengan area 'Item Perlu Tindakan' disorot]`

## 3. Fitur Utama (Berdasarkan Peran)

### 3.1. Untuk Semua Pengguna (Staff & Leader)

#### Membuat Request Aset (Pengadaan Baru)
Ini adalah fitur untuk mengajukan permintaan pengadaan barang/aset baru.
1.  Buka halaman **Pusat Aset > Request Aset**.
2.  Klik tombol **"Buat Request Baru"**.
3.  Isi detail formulir:
    - **Tanggal & Tipe Order**: Pilih tipe order. Jika Anda seorang **Leader**, Anda dapat memilih `Urgent` atau `Project Based` dan wajib mengisi justifikasi/nama proyek.
    - **Detail Permintaan Barang**: Klik **"Tambah Item"** untuk menambahkan barang yang diminta. Pilih Kategori, Tipe, dan Model. Jumlah stok yang tersedia akan muncul otomatis.
    > **Catatan**: Pilihan Kategori Aset yang tersedia akan disesuaikan dengan divisi Anda.
4.  Setelah semua item terisi, klik **"Ajukan Permintaan"**.
5.  Anda dapat memantau status request Anda di halaman daftar request.

`[GIF singkat: Proses mengisi form request aset dan mengklik tombol 'Ajukan Permintaan']`

#### Membuat Request Pinjam (Aset Gudang)
Gunakan fitur ini jika Anda hanya ingin meminjam aset untuk sementara waktu.
1.  Buka halaman **Pusat Aset > Request Aset**, lalu klik tab **Request Pinjam** di bagian atas (atau menu *Request Pinjam* di sidebar).
2.  Klik **"Buat Request Pinjam"**.
3.  Isi formulir:
    -   Pilih aset yang tersedia di gudang.
    -   Tentukan jumlah dan **Tanggal Pengembalian** (opsional/bisa "Belum Ditentukan").
    -   Isi alasan peminjaman.
4.  Klik **"Ajukan Permintaan Pinjam"**.

#### Melakukan Follow-up
Jika request Anda belum diproses, Anda dapat mengirim notifikasi pengingat kepada Admin.
1.  Di halaman daftar **Request Aset**, cari request Anda.
2.  Klik tombol **"Follow Up"** pada baris request tersebut. Admin akan menerima notifikasi. Fitur ini hanya dapat digunakan sekali dalam 24 jam per request.

#### Melihat & Melaporkan Aset Pribadi
1.  Buka halaman **Pusat Aset > Stok Aset**. Halaman ini akan secara otomatis menampilkan daftar aset yang terdaftar atas nama Anda (baik aset tetap maupun pinjaman).
2.  Untuk melaporkan kerusakan, temukan aset yang rusak, lalu klik tombol **"Laporkan"** (ikon kunci pas).
3.  Isi formulir laporan kerusakan dengan detail masalah dan lampirkan foto jika perlu.
4.  Kirim laporan. Tim Admin akan menerima notifikasi dan menindaklanjuti.

### 3.2. Untuk Admin (Admin Logistik & Admin Purchase) & Super Admin

#### Mengelola Request Aset (Utama untuk Admin Purchase)
1.  Buka halaman **Pusat Aset > Request Aset**.
2.  Request yang memerlukan persetujuan akan muncul di bagian atas atau dapat difilter.
3.  Klik pada sebuah request untuk melihat detailnya.
4.  Di halaman detail, Anda dapat:
    - **Menyetujui**: Klik tombol **"Setujui (Logistik)"** atau **"Setujui Final"** (tergantung peran dan status).
    - **Menolak**: Klik tombol **"Tolak"** dan isi alasan penolakan.
    - **Memulai Pengadaan**: Setelah disetujui, klik **"Mulai Pengadaan"** untuk mengubah status dan memasukkan estimasi tanggal tiba.

`[Screenshot: Modal detail request dengan tombol 'Setujui' dan 'Tolak' disorot]`

#### Mengelola Peminjaman & Pengembalian (Utama untuk Admin Logistik)
Fitur ini digunakan untuk memproses peminjaman aset dari stok gudang.
1.  **Persetujuan Pinjam**:
    -   Buka halaman **Pusat Aset > Request Aset**, pilih tab **Request Peminjaman**.
    -   Buka request yang statusnya `Menunggu Persetujuan`.
    -   Klik **"Tinjau & Tetapkan"**.
    -   Di panel ini, Anda dapat menyetujui jumlah item dan **memilih Aset ID spesifik** dari stok yang akan diserahkan.
    -   Klik **"Simpan & Terapkan"**. Status berubah menjadi `Disetujui`.
2.  **Handover Pinjaman**:
    -   Setelah disetujui, klik **"Buat Dokumen Handover"** untuk mencetak bukti serah terima resmi.
    -   Status aset akan otomatis berubah menjadi `Digunakan (Dipinjam)` dan stok gudang berkurang.
3.  **Proses Pengembalian (Return)**:
    -   Saat staf mengembalikan barang, buka detail request peminjaman tersebut.
    -   Klik **"Konfirmasi Pengembalian"**.
    -   Pilih aset mana saja yang dikembalikan (bisa parsial).
    -   Isi kondisi aset saat diterima kembali.
    -   Klik **"Konfirmasi"**. Aset akan kembali ke stok dengan status `Di Gudang`.

#### Mencatat Aset Baru (Utama untuk Admin Logistik)
Fitur ini digunakan untuk mendaftarkan barang yang telah tiba ke dalam sistem sebagai aset.
1.  **Dari Request**: Di halaman **Request Aset**, cari request yang statusnya **"Telah Tiba"**. Klik tombol **"Catat Aset"**.
2.  **Manual**: Buka halaman **Pusat Aset > Catat Aset** dan klik **"Catat Aset Baru"**.
3.  Isi formulir pencatatan secara lengkap:
    - **Informasi Dasar**: Kategori, Tipe, dan Model Aset.
    - **Detail Unit**: Masukkan Nomor Seri dan MAC Address. Anda bisa menggunakan tombol **Pindai QR** untuk mengisinya secara otomatis.
4.  Klik **"Simpan Aset Baru"**.

#### Mengelola Stok Aset
Buka **Pusat Aset > Stok Aset** untuk melihat ringkasan semua tipe aset yang ada di perusahaan.
-   Lihat jumlah aset di gudang, yang sedang digunakan, dan yang rusak.
-   Filter berdasarkan kategori, brand, atau status stok (misal: "Stok Menipis").
-   Mulai permintaan baru langsung dari item yang stoknya habis.

#### Mengelola Handover (Serah Terima Internal) (Utama untuk Admin Logistik)
Fitur ini mencatat perpindahan aset dari satu staf/divisi ke staf/divisi lain (bukan peminjaman sementara).
1.  Buka halaman **Pusat Aset > Handover Aset**.
2.  Klik **"Buat Handover Baru"**.
3.  Isi formulir Berita Acara: pilih aset dari gudang dan pihak yang terlibat.
4.  Klik **"Proses Handover"**. Status aset akan otomatis berubah menjadi "Digunakan".

#### Mengelola Dismantle (Penarikan Aset dari Pelanggan) (Utama untuk Admin Logistik)
1.  Buka halaman **Daftar Pelanggan** atau **Catat Aset**.
2.  Dari detail pelanggan atau detail aset, klik tombol **"Tarik dari Pelanggan"**.
3.  Lengkapi formulir Berita Acara Dismantle.
4.  Setelah aset tiba di gudang, Admin Gudang harus membuka detail dismantle ini dan mengklik **"Acknowledge & Complete"** untuk mengembalikan aset ke stok.

#### Mengelola Perbaikan Aset (Utama untuk Admin Logistik)
1.  Buka halaman **Pusat Aset > Perbaikan Aset**.
2.  Halaman ini menampilkan semua aset yang dilaporkan rusak atau sedang dalam perbaikan.
3.  Klik **"Mulai Perbaikan"** pada aset yang rusak untuk mencatat teknisi/vendor dan estimasi selesai.
4.  Gunakan tombol **"Update"** atau **"Selesaikan"** untuk memperbarui status perbaikan.

#### Mengelola Pelanggan & Pengguna
- **Pelanggan**: Buka **Daftar Pelanggan** untuk menambah, mengedit, atau melihat detail pelanggan.
- **Akun & Divisi**: (Hanya Super Admin) Buka **Pengaturan > Akun & Divisi** untuk mengelola akun pengguna dan daftar divisi perusahaan.

#### Mengelola Kategori
Buka **Pengaturan > Kategori & Model** untuk menambah atau mengubah Kategori, Tipe, dan Model Standar Aset. Ini memungkinkan sistem untuk beradaptasi dengan jenis-jenis aset baru di masa depan.
