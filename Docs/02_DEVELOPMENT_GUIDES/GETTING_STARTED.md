# Panduan Memulai (Getting Started)

Dokumen ini berisi panduan langkah demi langkah untuk menyiapkan dan menjalankan **prototipe frontend** Aplikasi Inventori Aset di lingkungan pengembangan lokal.

## 1. Status Proyek Saat Ini

Penting untuk dipahami bahwa proyek yang akan Anda jalankan adalah **aplikasi frontend mandiri (standalone)**.
-   **Tidak ada backend**: Aplikasi ini **tidak** memerlukan server backend atau database untuk berjalan.
-   **Simulasi Data**: Semua data (aset, pengguna, request, dll.) disimulasikan menggunakan **Mock API** yang menyimpan data di `localStorage` browser Anda. Ini berarti data akan tetap ada saat Anda me-refresh halaman, tetapi akan hilang jika Anda membersihkan data situs di browser.

Tujuan dari setup ini adalah untuk memungkinkan pengembangan, pengujian, dan demonstrasi UI/UX secara penuh tanpa ketergantungan pada backend.

## 2. Prasyarat

Pastikan perangkat lunak berikut telah terinstal di komputer Anda:

-   **Node.js**: Versi 18.x atau yang lebih baru.
-   **pnpm**: Manajer paket yang direkomendasikan. Jika belum terinstal, jalankan:
    ```bash
    npm install -g pnpm
    ```
-   **Git**: Sistem kontrol versi.

## 3. Proses Setup

1.  **Clone Repositori**:
    Buka terminal Anda dan clone repositori proyek ke direktori lokal.
    ```bash
    git clone <url-repositori-proyek>
    cd <nama-folder-proyek>
    ```

2.  **Masuk ke Direktori Frontend**:
    Proyek ini memiliki struktur _monorepo_, di mana kode frontend dan backend dipisahkan. Untuk pengembangan saat ini, kita hanya akan fokus pada frontend.
    ```bash
    cd frontend
    ```
    > **Catatan**: Semua perintah selanjutnya (seperti `pnpm install` dan `pnpm run dev`) harus dijalankan dari dalam direktori `frontend/` ini. Folder `backend/` berisi cetak biru untuk pengembangan sisi server di masa mendatang.

3.  **Instal Dependensi**:
    Dari dalam direktori `frontend/`, jalankan perintah berikut untuk menginstal semua paket yang dibutuhkan:
    ```bash
    pnpm install
    ```

4.  **Jalankan Server Pengembangan**:
    Setelah instalasi selesai, jalankan server pengembangan Vite. Server ini akan secara otomatis membuka aplikasi di browser Anda dan memuat ulang setiap kali ada perubahan pada kode.
    ```bash
    pnpm run dev
    ```

5.  **Buka Aplikasi**:
    Server akan menampilkan URL di terminal Anda, biasanya:
    -   **Local**: `http://localhost:5173`

    Buka URL tersebut di browser web modern (Chrome, Firefox, Edge). Aplikasi sekarang siap digunakan.

## 4. Cara Kerja Mock API

-   **Lokasi Kode**: Logika untuk simulasi API berada di `frontend/src/services/api.ts`.
-   **Penyimpanan**: Data awal dimuat dari `frontend/src/data/mockData.ts` saat pertama kali aplikasi dijalankan. Setiap perubahan (membuat, mengedit, menghapus data) akan disimpan ke `localStorage` browser Anda.
-   **Inspeksi Data**: Anda dapat melihat data yang tersimpan dengan membuka Developer Tools di browser (`F12`), pergi ke tab `Application`, dan lihat di bawah `Local Storage`. Anda akan menemukan kunci seperti `app_assets`, `app_requests`, dll.
-   **Catatan Arsitektur**: Manajemen state dan routing dalam prototipe ini sengaja dibuat sederhana untuk kecepatan pengembangan. Untuk pengembangan lebih lanjut menuju produksi, sangat disarankan untuk mengikuti panduan peningkatan arsitektur di [**Panduan Frontend (Bagian Rekomendasi)**](./FRONTEND_GUIDE.md#8-rekomendasi-peningkatan-arsitektur-langkah-selanjutnya).

## 5. Troubleshooting (Masalah Umum)

-   **Error: `pnpm: command not found`**
    -   **Penyebab**: `pnpm` tidak terinstal secara global atau path-nya tidak ada di environment variable sistem Anda.
    -   **Solusi**: Jalankan `npm install -g pnpm`. Tutup dan buka kembali terminal Anda.

-   **Aplikasi menampilkan halaman kosong atau error saat dijalankan.**
    -   **Penyebab**: Dependensi mungkin tidak terinstal dengan benar atau Anda menjalankan perintah dari direktori yang salah.
    -   **Solusi**:
        1.  Pastikan Anda berada di dalam direktori `frontend/`.
        2.  Hentikan server pengembangan (`Ctrl+C`).
        3.  Hapus folder `node_modules`: `rm -rf node_modules`.
        4.  Jalankan kembali `pnpm install`.
        5.  Jalankan kembali `pnpm run dev`.

-   **Data kembali ke kondisi awal.**
    -   **Penyebab**: Anda mungkin membersihkan data situs (`Clear site data`) di browser, yang akan menghapus `localStorage`.
    -   **Solusi**: Ini adalah perilaku yang diharapkan dari Mock API. Data akan dimuat ulang dari file mock saat Anda me-refresh halaman.

## 6. Langkah Selanjutnya

Setelah berhasil menjalankan aplikasi, Anda siap untuk mulai berkontribusi!
1.  **Jelajahi Kode**: Lihat struktur folder di [Panduan Frontend](./FRONTEND_GUIDE.md).
2.  **Buat Perubahan Kecil**: Coba ubah teks di salah satu komponen dan lihat perubahan langsung di browser berkat *Hot Module Replacement* (HMR) dari Vite.
3.  **Pelajari Alur Kerja Kontribusi**: Baca [Panduan Kontribusi](../03_STANDARDS_AND_PROCEDURES/CONTRIBUTING.md) sebelum memulai pekerjaan pada fitur baru.

Selamat! Lingkungan pengembangan frontend Anda telah siap.