# Standar Koding & Kontribusi

Dokumen ini mendefinisikan standar dan praktik terbaik yang harus diikuti oleh semua kontributor proyek untuk memastikan kode yang bersih, konsisten, dan mudah dikelola.

## Filosofi Kualitas

Standar yang dijabarkan dalam dokumen ini bukan sekadar aturan, melainkan manifestasi dari komitmen kami terhadap **keunggulan rekayasa perangkat lunak**. Setiap standar—mulai dari struktur Git hingga gaya penulisan kode—diterapkan untuk mencapai tujuan utama: menghasilkan *codebase* yang **bersih, terstruktur, efisien, dan efektif**.

Dengan mematuhi panduan ini, kita memastikan bahwa aplikasi ini bukan hanya fungsional, tetapi juga merupakan aset jangka panjang yang mudah dipelihara, diperluas, dan dipahami oleh developer di masa depan. Ini adalah fondasi untuk menjamin kualitas yang sepadan dengan investasi yang telah diberikan.

---

## 1. Version Control (Git)

Kami menggunakan alur kerja **Git Flow** yang disederhanakan.

### Cabang (Branches)

-   `main`: Cabang ini mencerminkan kode yang sudah di-deploy di lingkungan produksi. **Dilarang melakukan push langsung ke `main`**.
-   `develop`: Cabang utama untuk pengembangan. Semua cabang fitur akan digabungkan ke sini.
-   **Cabang Fitur/Perbaikan**: Semua pekerjaan baru harus dilakukan di cabang terpisah yang dibuat dari `develop`. Gunakan format penamaan berikut:
    -   **Fitur baru**: `feat/<nama-fitur>` (contoh: `feat/real-time-dashboard`)
    -   **Perbaikan bug**: `fix/<deskripsi-bug>` (contoh: `fix/login-button-disabled`)
    -   **Dokumentasi**: `docs/<topik-dokumentasi>` (contoh: `docs/update-readme`)
    -   **Refactor**: `refactor/<area-refactor>` (contoh: `refactor/move-asset-components`)

### Alur Kerja

1.  Selalu mulai pekerjaan baru dari cabang `develop` yang terbaru.
    ```bash
    git checkout develop
    git pull origin develop
    git checkout -b feat/nama-fitur-baru
    ```
2.  Lakukan pekerjaan Anda dan buat commit secara berkala dengan pesan yang jelas.
3.  Setelah selesai, gabungkan perubahan terbaru dari `develop` ke cabang Anda untuk menyelesaikan konflik.
    ```bash
    git fetch origin
    git rebase origin/develop
    ```
4.  Push cabang Anda ke remote repository.
    ```bash
    git push origin feat/nama-fitur-baru
    ```
5.  Buat **Pull Request (PR)** dari cabang Anda ke `develop`.
6.  PR harus di-review oleh setidaknya satu anggota tim lain sebelum digabungkan (merge).

## 2. Pesan Commit

Kami menggunakan standar **Conventional Commits**. Ini membantu menghasilkan changelog secara otomatis dan membuat riwayat Git lebih mudah dibaca.

**Format**: `<type>(<scope>): <subject>`

-   **Type**: `feat`, `fix`, `build`, `chore`, `ci`, `docs`, `perf`, `refactor`, `style`, `test`.
-   **Scope** (opsional): Bagian dari codebase yang terpengaruh (misal: `auth`, `request`, `dashboard`).
-   **Subject**: Deskripsi singkat perubahan dalam bentuk imperatif (misal: "tambahkan" bukan "menambahkan").

**Contoh**:

-   `feat(request): add bulk approval feature`
-   `fix(auth): prevent login with empty password`
-   `docs(readme): update setup instructions`
-   `refactor(ui): create reusable CustomSelect component`

## 3. Gaya Penulisan Kode & Formatting

-   **Formatter**: **Prettier** digunakan untuk format otomatis. Pastikan Anda mengintegrasikannya dengan editor kode Anda untuk memformat file saat disimpan.
-   **Linter**: **ESLint** digunakan untuk menemukan masalah dan menjaga konsistensi gaya kode. Konfigurasi linter ada di `.eslintrc.js`.

## 4. Konvensi Penamaan

-   **File Komponen React**: `PascalCase.tsx` (contoh: `ItemRequestPage.tsx`, `Button.tsx`).
-   **Variabel & Fungsi**: `camelCase` (contoh: `const totalAssets = ...`, `function handleSave() { ... }`).
-   **Tipe & Interface**: `PascalCase` (contoh: `interface Asset { ... }`, `type Page = 'dashboard'`).
-   **File CSS/SCSS** (jika ada): `kebab-case.css`.
-   **File non-komponen** (utilitas, hooks): `camelCase.ts` (contoh: `useSortableData.ts`).

## 5. Praktik Terbaik React & TypeScript

-   **Functional Components**: Selalu gunakan komponen fungsional dengan Hooks, bukan Class Components.
-   **TypeScript**: Berikan tipe pada semua `props`, `state`, dan variabel jika memungkinkan. Hindari penggunaan `any` sebisa mungkin. Definisikan tipe bersama di `src/types/index.ts`.
-   **Destructuring Props**: Gunakan destructuring pada props untuk keterbacaan.
    ```tsx
    // Baik
    const MyComponent = ({ title, onSave }: MyComponentProps) => { ... };
    
    // Kurang baik
    const MyComponent = (props: MyComponentProps) => { /* props.title, props.onSave */ };
    ```
-   **Keys dalam List**: Saat merender daftar, selalu berikan `key` yang unik dan stabil untuk setiap elemen. Hindari menggunakan indeks array sebagai `key` jika daftar bisa berubah urutannya.
-   **Immutability**: Jangan pernah memutasi state atau props secara langsung. Selalu buat salinan baru.
    ```typescript
    // Baik
    setItems(prevItems => [...prevItems, newItem]);
    
    // Buruk
    items.push(newItem);
    setItems(items);
    ```

## 6. Aksesibilitas (A11y)

Membangun aplikasi yang dapat diakses oleh semua orang, termasuk penyandang disabilitas, adalah prioritas.

-   **HTML Semantik**: Gunakan elemen HTML yang tepat untuk tugasnya (`<button>`, `<nav>`, `<main>`, `<h1>`, dll).
-   **Atribut ARIA**: Gunakan atribut `aria-*` jika diperlukan untuk meningkatkan aksesibilitas elemen dinamis (misal: `aria-label`, `aria-hidden`, `role`).
-   **Kontras Warna**: Pastikan kontras warna teks dan latar belakang memenuhi standar WCAG AA.
-   **Navigasi Keyboard**: Pastikan semua elemen interaktif (tombol, link, input) dapat diakses dan dioperasikan menggunakan keyboard saja (menggunakan `Tab`, `Enter`, `Space`).