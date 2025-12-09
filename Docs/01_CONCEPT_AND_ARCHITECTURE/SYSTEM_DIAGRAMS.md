# Diagram Sistem

Dokumen ini adalah repositori visual untuk semua diagram arsitektur utama yang digunakan dalam proyek Aplikasi Inventori Aset. Diagram-diagram ini dibuat menggunakan sintaks Mermaid untuk memastikan dokumentasi tetap "hidup" dan mudah diperbarui seiring dengan evolusi kode.

## 1. Diagram C4 - Level 1 (System Context)

Diagram ini menunjukkan gambaran besar: bagaimana sistem "AssetFlow" berinteraksi dengan pengguna dan sistem eksternal lainnya. Tujuannya adalah untuk audiens non-teknis dan teknis agar memahami batasan dan dependensi utama sistem.

```mermaid
graph TD
    subgraph "Pengguna Internal"
        A[<b>Staff / Leader</b><br>Karyawan yang membuat<br>request dan menggunakan aset]
        B[<b>Admin / Super Admin</b><br>Tim yang mengelola inventori<br>dan sistem]
    end

    C(<b>Aplikasi Inventori Aset</b><br>Sistem terpusat untuk melacak<br>seluruh siklus hidup aset.)

    D[<b>Layanan Email Eksternal</b><br>Sistem pengiriman email<br>untuk notifikasi penting.]

    A -- "Menggunakan (via Web Browser)" --> C
    B -- "Mengelola (via Web Browser)" --> C
    C -- "Mengirim Notifikasi via SMTP" --> D
    
    style A fill:#9f7aea,stroke:#333,stroke-width:2px
    style B fill:#9f7aea,stroke:#333,stroke-width:2px
    style C fill:#4299e1,stroke:#333,stroke-width:2px
    style D fill:#6B7280,stroke:#333,stroke-width:2px
```

## 2. Diagram C4 - Level 2 (Containers)

Diagram ini memperbesar sistem "AssetFlow" untuk menunjukkan komponen-komponen teknis utama (kontainer) yang dapat di-deploy secara terpisah.

```mermaid
graph TD
    A["<b>Pengguna</b><br>(Staff/Admin)<br><br>Mengakses aplikasi<br>melalui browser."]

    subgraph "Infrastruktur Server Produksi"
        B["<b>Aplikasi Frontend</b><br>[React Single-Page App]<br><br>Bertanggung jawab atas semua<br>antarmuka pengguna. Berjalan<br>di browser pengguna."]
        
        C["<b>API Backend</b><br>[Server NestJS]<br><br>Menyediakan REST API. Menangani<br>logika bisnis, autentikasi, &<br>validasi data."]
        
        D["<b>Database</b><br>[PostgreSQL]<br><br>Penyimpanan data persisten untuk<br>semua entitas: aset, pengguna, dll."]
    end

    A -- "Mengakses via HTTPS" --> B
    B -- "Memanggil API via HTTPS<br>[Payload JSON]" --> C
    C -- "Membaca/Menulis Data<br>[TCP/IP]" --> D

    style B fill:#63b3ed,stroke:#333,stroke-width:2px
    style C fill:#4299e1,stroke:#333,stroke-width:2px
    style D fill:#3182ce,stroke:#333,stroke-width:2px
```

## 3. Diagram Alur Data (Data Flow) - Pembaruan Aset

Diagram ini menggambarkan bagaimana data mengalir melalui sistem saat seorang Admin memperbarui informasi sebuah aset. Ini berguna untuk pengembang dalam memahami interaksi antar komponen.

```mermaid
sequenceDiagram
    participant Admin
    participant Frontend
    participant Backend
    participant Database

    Admin->>Frontend: Mengisi form & klik "Simpan Perubahan"
    Frontend->>Backend: PATCH /api/assets/:id (data pembaruan)
    activate Backend
    
    Backend->>Backend: Validasi data (DTO)
    Backend->>Backend: Cek otorisasi (apakah user boleh mengedit?)
    
    Backend->>Database: UPDATE assets SET ... WHERE id = :id
    activate Database
    Database-->>Backend: Hasil update (1 baris terpengaruh)
    deactivate Database

    Backend->>Database: INSERT INTO activity_log (...)
    activate Database
    Database-->>Backend: Log tersimpan
    deactivate Database
    
    Backend-->>Frontend: Response 200 OK (data aset yang sudah diperbarui)
    deactivate Backend
    
    Frontend->>Admin: Tampilkan notifikasi "Aset berhasil diperbarui"
    Frontend->>Admin: Perbarui data di tabel UI
```