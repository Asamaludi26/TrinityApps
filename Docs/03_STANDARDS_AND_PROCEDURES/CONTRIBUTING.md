# Panduan Kontribusi

Terima kasih atas minat Anda untuk berkontribusi pada proyek ini! Panduan ini akan membantu Anda memahami alur kerja yang kami gunakan untuk memastikan kolaborasi yang lancar dan kualitas kode yang tinggi.

## 1. Alur Kerja Pull Request (PR)

Setiap perubahan kode, baik itu fitur baru, perbaikan bug, atau dokumentasi, harus melalui proses Pull Request.

1.  **Buat Branch Baru**: Selalu buat _branch_ baru dari `develop` untuk pekerjaan Anda. Gunakan konvensi penamaan yang telah dijelaskan di [Standar Koding](./CODING_STANDARDS.md).
    ```bash
    # Pastikan Anda berada di cabang 'develop' yang terbaru
    git checkout develop
    git pull

    # Buat branch baru
    git checkout -b feat/nama-fitur-anda
    ```

2.  **Lakukan Perubahan**: Tulis kode Anda. Buat _commit_ secara berkala dengan pesan yang jelas dan sesuai standar [Conventional Commits](./CODING_STANDARDS.md).

3.  **Jaga Agar Branch Tetap Sinkron**: Sebelum Anda siap membuat PR, pastikan _branch_ Anda sinkron dengan `develop` untuk menghindari konflik _merge_ yang besar.
    ```bash
    git fetch origin
    git rebase origin/develop
    ```

4.  **Push ke Remote**: Unggah _branch_ Anda ke repository remote.
    ```bash
    git push -u origin feat/nama-fitur-anda
    ```

5.  **Buat Pull Request**: Buka repositori di GitHub (atau platform Git lainnya) dan buat _Pull Request_ dari _branch_ Anda ke `develop`.

6.  **Isi Template PR**: Gunakan template di bawah ini untuk mengisi deskripsi PR Anda. Ini sangat penting untuk membantu _reviewer_ memahami konteks perubahan Anda.

7.  **Proses Review**:
    -   Setidaknya satu anggota tim lain harus me-review PR Anda.
    -   Jika ada permintaan perubahan, lakukan _commit_ baru dan _push_ ke _branch_ yang sama. PR akan otomatis diperbarui.
    -   Jangan membuat PR baru untuk perubahan yang diminta.

8.  **Merge**: Setelah disetujui, _reviewer_ atau pemilik kode akan menggabungkan (merge) PR Anda ke `develop`.

9.  **Hapus Branch**: Setelah di-merge, hapus _branch_ fitur Anda baik di lokal maupun di remote.

## 2. Memperbarui Dokumentasi (Living Documentation)

Dokumentasi hanya berharga jika akurat dan relevan. Menjaga dokumentasi agar tetap "hidup" adalah tanggung jawab setiap kontributor.

-   **Kewajiban**: Setiap *Pull Request* yang memperkenalkan fitur baru, mengubah alur kerja yang ada, atau memodifikasi endpoint API **wajib** menyertakan pembaruan pada dokumentasi yang relevan (`/Docs`).
-   **Contoh Pembaruan**:
    -   Menambah endpoint baru? Perbarui [Referensi API](./../02_DEVELOPMENT_GUIDES/API_REFERENCE.md).
    -   Mengubah struktur database? Perbarui [Skema Database](./../01_CONCEPT_AND_ARCHITECTURE/DATABASE_SCHEMA.md).
    -   Menambah alur kerja baru di UI? Perbarui [Panduan Pengguna](./../05_USER_DOCUMENTATION/USER_GUIDE.md).
-   **Tujuan**: Mencegah dokumentasi menjadi usang (*outdated*) dan memastikan semua anggota tim, baik yang sekarang maupun yang akan datang, memiliki sumber informasi yang dapat diandalkan.

## 3. Template Pull Request

Salin dan tempel template berikut ke dalam deskripsi PR Anda dan isi bagian-bagian yang relevan.

```markdown
### Deskripsi Perubahan
<!-- Jelaskan secara singkat "apa" dan "mengapa" dari perubahan ini. Apa masalah yang diselesaikan? Apa fitur yang ditambahkan? -->


### Jenis Perubahan
- [ ] Bug fix (perbaikan non-breaking yang memperbaiki masalah)
- [ ] New feature (fitur baru non-breaking)
- [ ] Breaking change (perbaikan atau fitur yang akan menyebabkan fungsionalitas yang ada berubah)
- [ ] Documentation (hanya perubahan dokumentasi)
- [ ] Refactor (perubahan kode yang tidak memperbaiki bug atau menambahkan fitur)

### Cara Menguji
<!-- Jelaskan langkah-langkah yang harus dilakukan reviewer untuk memverifikasi perubahan Anda. -->
1. Checkout branch ini.
2. Jalankan `pnpm install`.
3. Jalankan `pnpm run dev`.
4. Buka halaman `...` dan lakukan `...`
5. Harusnya `...` terjadi.

### Screenshot / Video
<!-- Jika ada perubahan visual, sertakan screenshot atau GIF singkat di sini. -->


### Checklist
- [ ] Kode saya mengikuti standar koding proyek ini.
- [ ] Saya telah melakukan self-review terhadap kode saya.
- [ ] Saya telah menambahkan komentar pada kode yang sulit dipahami.
- [ ] Saya telah memperbarui dokumentasi yang relevan.
- [ ] Perubahan saya tidak menghasilkan warning baru.
```

## 4. Ekspektasi Code Review

_Code review_ adalah proses kolaboratif untuk meningkatkan kualitas kode.

### Bagi Penulis PR:
-   Pastikan PR Anda fokus pada satu hal. Hindari mencampur perbaikan bug dengan fitur baru dalam satu PR.
-   Berikan konteks yang cukup dalam deskripsi PR.
-   Terbuka terhadap masukan dan jangan menganggapnya sebagai kritik pribadi.

### Bagi Reviewer:
-   **Bersikap Konstruktif**: Fokus pada kode, bukan pada penulisnya. Berikan saran yang membangun.
-   **Jelaskan Alasan**: Jika Anda menyarankan perubahan, jelaskan "mengapa" perubahan itu diperlukan.
-   **Puji Hal Baik**: Jika Anda melihat solusi yang cerdas atau kode yang bersih, berikan pujian!
-   **Prioritaskan Review**: Usahakan untuk me-review PR dalam waktu 24 jam untuk menjaga alur kerja tim tetap berjalan.