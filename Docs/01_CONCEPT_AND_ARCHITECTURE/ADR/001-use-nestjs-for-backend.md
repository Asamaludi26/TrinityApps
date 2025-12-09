# ADR 001: Penggunaan NestJS sebagai Framework Backend

-   **Status**: Diterima
-   **Tanggal**: 2025-10-01

## Konteks

Proyek ini membutuhkan sebuah backend yang andal, dapat diskalakan, dan mudah dipelihara untuk jangka panjang. Backend akan menangani semua logika bisnis, interaksi database, autentikasi, dan otorisasi. Pilihan framework akan sangat memengaruhi struktur kode, produktivitas developer, dan kemudahan pengujian.

Alternatif utama yang dipertimbangkan adalah:
1.  **Express.js**: Pustaka minimalis, sangat fleksibel tetapi tidak memiliki struktur baku, yang dapat menyebabkan inkonsistensi dalam proyek yang lebih besar.
2.  **NestJS**: Framework beropini yang dibangun di atas Express.js (atau Fastify), dengan arsitektur terstruktur (terinspirasi Angular) yang mendorong praktik terbaik.

## Keputusan

Kami memutuskan untuk menggunakan **NestJS** sebagai framework utama untuk pengembangan backend.

## Konsekuensi

### Keuntungan (Positif)
-   **Struktur yang Jelas**: Arsitektur modular NestJS (Modules, Controllers, Providers/Services) mendorong organisasi kode yang baik dan pemisahan tanggung jawab (_separation of concerns_). Ini sangat berharga untuk skalabilitas dan pemeliharaan jangka panjang, serta memudahkan developer baru untuk memahami codebase.
-   **Dukungan TypeScript Kelas Satu**: NestJS dibangun dengan TypeScript dari awal, yang selaras dengan tujuan proyek untuk mencapai _type-safety_ di seluruh tumpukan teknologi, mengurangi error runtime, dan meningkatkan pengalaman pengembangan.
-   **Dependency Injection (DI)**: Sistem DI bawaan NestJS menyederhanakan pengelolaan dependensi dan membuat kode lebih mudah untuk diuji secara terisolasi (_unit testing_).
-   **Ekosistem yang Matang**: NestJS memiliki dokumentasi yang sangat baik dan integrasi resmi dengan pustaka-pustaka penting seperti Passport.js (autentikasi), Swagger (dokumentasi API), dan TypeORM/Prisma (database), yang mempercepat pengembangan fitur-fitur umum.
-   **Dapat Diuji (Testable)**: Struktur NestJS memudahkan penulisan _unit test_ dan _end-to-end test_ menggunakan Jest, yang merupakan bagian dari _tooling_ standarnya.

### Kerugian (Negatif)
-   **Kurva Belajar yang Sedikit Lebih Curam**: Dibandingkan dengan Express.js yang minimalis, NestJS memiliki lebih banyak konsep (seperti _Decorators_, _Modules_, DI) yang perlu dipelajari oleh developer baru. Namun, investasi waktu ini akan terbayar dengan produktivitas dan kualitas kode jangka panjang.
-   **Lebih Beropini (Opinionated)**: Framework ini "memaksa" developer untuk mengikuti pola arsitektur tertentu. Meskipun ini umumnya merupakan hal yang baik untuk konsistensi, ini bisa terasa membatasi bagi developer yang lebih suka kebebasan penuh dalam menstrukturkan kode.