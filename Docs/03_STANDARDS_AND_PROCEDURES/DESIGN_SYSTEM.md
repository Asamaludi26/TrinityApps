# Design System & Panduan UI/UX

Dokumen ini adalah "sumber kebenaran" (*single source of truth*) untuk semua elemen visual, komponen, dan prinsip desain yang digunakan dalam Aplikasi Inventori Aset. Tujuannya adalah untuk menjaga konsistensi, meningkatkan *usability*, dan mempercepat proses pengembangan.

## 1. Prinsip Desain Inti

-   **Jelas & Ringkas (Clarity)**: Antarmuka harus mudah dipahami. Prioritaskan informasi yang paling penting dan hindari ambiguitas.
-   **Konsisten (Consistency)**: Komponen dan pola interaksi yang sama harus berperilaku sama di seluruh aplikasi. Ini mengurangi beban kognitif pengguna.
-   **Efisien (Efficiency)**: Pengguna harus dapat menyelesaikan tugas mereka dengan jumlah klik dan usaha seminimal mungkin. Alur kerja harus logis dan terprediksi.
-   **Aksesibel (Accessibility)**: Aplikasi harus dapat digunakan oleh semua orang, termasuk mereka yang memiliki keterbatasan. Ikuti standar WCAG.

## 2. Palet Warna

Palet warna diambil dari konfigurasi Tailwind CSS (`index.html`) untuk memastikan konsistensi.

### Warna Primer & Merek
| Nama            | Kode Heks   | Kelas Tailwind | Penggunaan Utama                                          |
| --------------- | ----------- | -------------- | --------------------------------------------------------- |
| **Primary**     | `#1D4ED8`   | `bg-tm-primary`  | Tombol utama, link aktif, elemen interaktif utama.        |
| **Primary Hover** | `#1E40AF`   | `hover:bg-tm-primary-hover` | Efek hover pada elemen primer.                            |
| **Accent**      | `#3B82F6`   | `bg-tm-accent`   | Aksen visual, fokus pada input form, highlight sekunder.  |
| **Secondary**   | `#6B7280`   | `text-tm-secondary` | Teks sekunder, ikon non-interaktif, placeholder.          |

### Warna Latar & Teks
| Nama            | Kode Heks   | Kelas Tailwind | Penggunaan Utama                                          |
| --------------- | ----------- | -------------- | --------------------------------------------------------- |
| **Light**       | `#F3F4F6`   | `bg-tm-light`    | Latar belakang utama aplikasi.                            |
| **Dark**        | `#111827`   | `text-tm-dark`   | Teks utama, judul, elemen dengan kontras tinggi.          |

### Warna Semantik
Warna-warna ini digunakan untuk memberikan umpan balik visual yang cepat kepada pengguna mengenai status atau hasil dari suatu aksi.

| Status      | Kode Warna      | Kelas Dasar       | Kelas Latar Terang | Kelas Teks        | Contoh Penggunaan                                        |
| ----------- | --------------- | ----------------- | ------------------ | ----------------- | -------------------------------------------------------- |
| **Success** | `#16A34A` (600) | `bg-success`      | `bg-success-light` | `text-success-text` | Notifikasi berhasil, status "Selesai", badge "Aktif".    |
| **Danger**  | `#DC2626` (600) | `bg-danger`       | `bg-danger-light`  | `text-danger-text`  | Tombol hapus, pesan error, status "Ditolak".             |
| **Warning** | `#FBBF24` (400) | `bg-warning`      | `bg-warning-light` | `text-warning-text` | Notifikasi peringatan, status "Menunggu", "Suspend".     |
| **Info**    | `#2563EB` (600) | `bg-info`         | `bg-info-light`  | `text-info-text`    | Pesan informatif, status "Dalam Proses", badge "Admin".  |

## 3. Tipografi

-   **Font Utama**: **Inter**. Digunakan di seluruh aplikasi untuk keterbacaan yang baik di layar. Diimpor dari `rsms.me`.
-   **Teks Utama (Body)**: Ukuran `14px` (`text-sm`) dengan warna `text-gray-700`.
-   **Judul Halaman (`<h1>`)**: Ukuran `30px` (`text-3xl`), tebal (`font-bold`), warna `text-tm-dark`.
-   **Judul Bagian (`<h2>`, `<h3>`)**: Ukuran `18px-24px` (`text-lg` hingga `text-xl`), semi-tebal (`font-semibold`), warna `text-tm-dark`.

## 4. Komponen Utama

### Tombol (Buttons)
-   **Primary Action**: Latar `bg-tm-primary`, teks `text-white`. Digunakan untuk aksi utama pada sebuah halaman (misal: "Simpan", "Ajukan").
-   **Secondary Action**: Latar `bg-white`, border `border-gray-300`, teks `text-gray-700`. Digunakan untuk aksi sekunder (misal: "Batal", "Kembali").
-   **Destructive Action**: Latar `bg-danger`, teks `text-white`. Digunakan untuk aksi yang merusak (misal: "Hapus").
-   **State**: Semua tombol harus memiliki state `hover`, `focus`, dan `disabled` yang jelas secara visual.

### Modal
-   **Tujuan**: Menampilkan informasi atau form tanpa meninggalkan konteks halaman utama.
-   **Struktur**:
    -   **Header**: Berisi judul yang jelas dan tombol tutup (ikon 'X').
    -   **Body**: Konten utama, memiliki *scrollbar* jika konten lebih panjang dari tinggi layar.
    -   **Footer**: Berisi tombol aksi (misal: "Simpan" dan "Batal").
-   **Perilaku**:
    -   Dapat ditutup dengan mengklik tombol tutup, menekan tombol `Escape`, atau mengklik area di luar modal.
    -   Fokus keyboard harus "terjebak" di dalam modal saat terbuka.

### Formulir & Input
-   **Label**: Selalu ada di atas input, jelas, dan ringkas.
-   **Input Field**: Latar `bg-gray-50`, border `border-gray-300`. Saat fokus, harus memiliki highlight `ring-tm-accent`.
-   **Pesan Error**: Tampil di bawah input yang relevan dengan warna `text-danger-text`.
-   **Select/Dropdown**: Menggunakan komponen kustom `CustomSelect` dan `CreatableSelect` untuk tampilan yang konsisten di semua browser.

### Tabel
-   **Header**: Latar `bg-gray-50`, teks `font-semibold` dan berwarna `text-gray-500`.
-   **Baris**: Latar putih, dengan efek `hover:bg-gray-50` untuk memberikan umpan balik.
-   **Aksi**: Tombol aksi (Edit, Hapus) ditempatkan di kolom terakhir, biasanya menggunakan ikon untuk menghemat ruang.

### Stamps (Stempel)
-   **Tujuan**: Memberikan representasi visual yang kuat untuk status persetujuan atau penolakan pada dokumen.
-   **Jenis**:
    -   `ApprovalStamp`: Warna hijau, teks "APPROVED".
    -   `RejectionStamp`: Warna merah, teks "REJECTED".
    -   `SignatureStamp`: Warna biru, menampilkan tanda tangan digital (nama).
-   **Penggunaan**: Ditempatkan di area tanda tangan pada dokumen BAST, Dismantle, atau detail Request.

### Avatar
-   **Tujuan**: Merepresentasikan pengguna secara visual menggunakan inisial nama mereka.
-   **Desain**: Lingkaran dengan warna latar belakang yang dihasilkan secara konsisten dari nama pengguna, menampilkan 1-2 huruf inisial.

### Tooltip
-   **Tujuan**: Memberikan informasi tambahan pada elemen UI saat pengguna mengarahkan kursor ke atasnya.
-   **Desain**: Kotak kecil berwarna `bg-tm-primary` dengan teks putih yang muncul di dekat elemen target.

### Pagination Controls
-   **Tujuan**: Memungkinkan navigasi pada daftar data yang panjang.
-   **Struktur**: Termasuk tombol "Sebelumnya" & "Selanjutnya", informasi jumlah data yang ditampilkan, dan pilihan untuk mengubah jumlah item per halaman.

### Floating Action Bar
-   **Tujuan**: Menjaga agar tombol aksi utama (seperti "Simpan") selalu terlihat di layar saat pengguna menggulir halaman formulir yang panjang.
-   **Perilaku**: Muncul di bagian bawah layar saat tombol aksi utama di bagian bawah formulir tidak terlihat.

## 5. Aksesibilitas (A11y)

-   **HTML Semantik**: Gunakan elemen HTML yang tepat (`<button>`, `<nav>`, `<h1>`).
-   **Navigasi Keyboard**: Pastikan semua elemen interaktif dapat diakses dan dioperasikan menggunakan `Tab` dan `Enter`/`Space`.
-   **Atribut ARIA**: Gunakan `aria-label`, `role`, dll., jika elemen non-semantik digunakan untuk interaksi (misal: `<div>` yang berfungsi sebagai tombol).
-   **Kontras**: Semua kombinasi warna teks dan latar harus memenuhi standar kontras WCAG AA.
-   **Label Form**: Setiap `input` harus terhubung dengan `label` menggunakan atribut `htmlFor`.