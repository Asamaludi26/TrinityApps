# Referensi API Backend

Dokumen ini menyediakan referensi teknis untuk setiap endpoint REST API yang akan diekspos oleh server backend. Semua endpoint, kecuali `/api/auth/login`, memerlukan otentikasi menggunakan JWT `Bearer Token` di header `Authorization`.

## 1. Sumber Daya: `Auth`
Mengelola autentikasi pengguna.

### `POST /api/auth/login`
-   **Deskripsi**: Mengautentikasi pengguna berdasarkan email dan password. Jika berhasil, akan mengembalikan sebuah JSON Web Token (JWT).
-   **Otorisasi**: Publik (tidak memerlukan token).
-   **Request Body**:
    ```json
    {
      "email": "user@example.com",
      "password": "password123"
    }
    ```
-   **Response (200 OK)**:
    ```json
    {
      "access_token": "ey..."
    }
    ```
-   **Response (401 Unauthorized)**: Jika kredensial tidak valid.

---

## 2. Sumber Daya: `Assets`
Mengelola data aset.

### `GET /api/assets`
-   **Deskripsi**: Mengambil daftar semua aset dengan dukungan paginasi, pencarian, dan filter.
-   **Otorisasi**: `Bearer Token` (Semua Peran).
-   **Query Params (Opsional)**:
    -   `page` (number): Nomor halaman.
    -   `limit` (number): Jumlah item per halaman.
    -   `search` (string): Pencarian berdasarkan ID, nama, atau serial number.
    -   `status` (string): Filter berdasarkan status aset (misal: `IN_USE`).
    -   `category` (string): Filter berdasarkan kategori.
-   **Response (200 OK)**: Objek paginasi.
    ```json
    {
      "data": [ { "id": "AST-001", "name": "Router A", ... } ],
      "meta": {
        "totalItems": 100,
        "itemCount": 10,
        "itemsPerPage": 10,
        "totalPages": 10,
        "currentPage": 1
      }
    }
    ```

### `GET /api/assets/:id`
-   **Deskripsi**: Mengambil detail satu aset berdasarkan ID-nya.
-   **Otorisasi**: `Bearer Token` (Semua Peran).
-   **Response (200 OK)**: Objek aset.
-   **Response (404 Not Found)**: Jika aset tidak ditemukan.

### `POST /api/assets`
-   **Deskripsi**: Membuat satu atau lebih aset baru.
-   **Otorisasi**: `Bearer Token` (Hanya `AdminLogistik`, `SuperAdmin`).
-   **Request Body**: `CreateAssetDto`.
-   **Response (201 Created)**: Objek aset yang baru dibuat.

### `PATCH /api/assets/:id`
-   **Deskripsi**: Memperbarui sebagian informasi dari sebuah aset.
-   **Otorisasi**: `Bearer Token` (Hanya `AdminLogistik`, `SuperAdmin`).
-   **Request Body**: `UpdateAssetDto` (parsial dari data aset).
-   **Response (200 OK)**: Objek aset yang telah diperbarui.

### `DELETE /api/assets/:id`
-   **Deskripsi**: Menghapus sebuah aset.
-   **Otorisasi**: `Bearer Token` (Hanya `SuperAdmin`).
-   **Response (204 No Content)**.

---

## 3. Sumber Daya: `Requests`
Mengelola alur kerja permintaan aset.

### `GET /api/requests`
-   **Deskripsi**: Mengambil daftar semua permintaan aset, dengan filter dan paginasi.
-   **Otorisasi**: `Bearer Token` (Semua Peran, `Staff`/`Leader` hanya melihat request miliknya).
-   **Query Params (Opsional)**: `page`, `limit`, `search`, `status`, `requesterId`.
-   **Response (200 OK)**: Objek paginasi berisi daftar request.

### `POST /api/requests`
-   **Deskripsi**: Membuat permintaan aset baru.
-   **Otorisasi**: `Bearer Token` (Semua Peran).
-   **Request Body**: `CreateRequestDto`.
-   **Response (201 Created)**: Objek request yang baru dibuat.

### `POST /api/requests/:id/approve`
-   **Deskripsi**: Menyetujui sebuah permintaan (alur persetujuan multi-level).
-   **Otorisasi**: `Bearer Token` (`AdminLogistik`, `AdminPurchase`, `SuperAdmin` sesuai dengan status saat ini).
-   **Response (200 OK)**: Objek request yang telah diperbarui statusnya.

### `POST /api/requests/:id/reject`
-   **Deskripsi**: Menolak sebuah permintaan.
-   **Otorisasi**: `Bearer Token` (`AdminLogistik`, `AdminPurchase`, `SuperAdmin`).
-   **Request Body**:
    ```json
    {
      "reason": "Stok tidak mencukupi dan tidak ada budget."
    }
    ```
-   **Response (200 OK)**: Objek request yang telah diperbarui statusnya.

---

## 4. Sumber Daya: `Customers`, `Users`, `Divisions`
Endpoint untuk sumber daya ini mengikuti pola RESTful CRUD standar.

### `GET /api/[resource]`
-   Mengambil daftar semua item.

### `GET /api/[resource]/:id`
-   Mengambil detail satu item.

### `GET /api/[resource]/:id`
-   Mengambil detail satu item.

### `POST /api/[resource]`
-   Membuat item baru.

### `PATCH /api/[resource]/:id`
-   Memperbarui item yang ada.

### `DELETE /api/[resource]/:id`
-   Menghapus item.

**Otorisasi**: Sebagian besar endpoint ini memerlukan hak akses `SuperAdmin`.