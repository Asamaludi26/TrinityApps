# Strategi Monitoring & Logging

Dokumen ini menjelaskan pendekatan operasional untuk memantau kesehatan, kinerja, dan error pada Aplikasi Inventori Aset saat berjalan di lingkungan produksi.

> **Catatan**: Panduan ini berlaku untuk **aplikasi *full-stack* di lingkungan produksi**. Strategi ini menjadi relevan setelah backend dibangun dan di-deploy. Prototipe frontend saat ini dapat dipantau menggunakan *error tracking* dan *web vitals* standar.

## 1. Strategi Monitoring

Monitoring proaktif bertujuan untuk mendeteksi masalah sebelum berdampak signifikan pada pengguna.

### 1.1. Monitoring Frontend (Sisi Klien)

-   **Metrik Utama**:
    -   **Web Vitals**: Metrik kinerja yang berfokus pada pengalaman pengguna.
        -   **LCP (Largest Contentful Paint)**: Waktu muat halaman. Target: **< 2.5 detik**.
        -   **FID (First Input Delay)**: Responsivitas interaksi. Target: **< 100 ms**.
        -   **CLS (Cumulative Layout Shift)**: Stabilitas visual. Target: **< 0.1**.
    -   **Error Tracking**: Jumlah dan frekuensi error JavaScript yang terjadi di browser pengguna.
-   **Tools yang Direkomendasikan**:
    -   [Vercel Analytics](https://vercel.com/analytics) (jika frontend di-host di Vercel).
    -   [Sentry](https://sentry.io/) atau [Datadog Real User Monitoring](https://www.datadoghq.com/product/real-user-monitoring/) untuk _error tracking_ dan _performance monitoring_ yang lebih mendalam.

### 1.2. Monitoring Backend (Sisi Server)

-   **Metrik Utama**:
    -   **Ketersediaan (Availability)**: Endpoint `GET /api/health` harus selalu mengembalikan status `200 OK`.
    -   **Latensi API**: Waktu respons rata-rata dan persentil ke-95 (p95) untuk endpoint-endpoint krusial (misal: `GET /api/assets`). Target p95: **< 500 ms**.
    -   **Tingkat Error (Error Rate)**: Persentase request yang menghasilkan status `5xx` (Server Error). Target: **< 0.1%**.
    -   **Utilisasi Sumber Daya**: Penggunaan CPU dan Memori (RAM) pada server atau kontainer.
-   **Tools yang Direkomendasikan**:
    -   Layanan monitoring dari platform hosting (misal: Google Cloud Monitoring, AWS CloudWatch).
    -   [Prometheus](https://prometheus.io/) + [Grafana](https://grafana.com/) untuk visualisasi metrik kustom.
    -   [Datadog APM](https://www.datadoghq.com/product/apm/) atau [New Relic](https://newrelic.com/) untuk _Application Performance Monitoring_.

### 1.3. Monitoring Database

-   **Metrik Utama**:
    -   **Koneksi Aktif**: Jumlah koneksi yang sedang digunakan.
    -   **Utilisasi CPU & Memori**: Kinerja server database.
    -   **Latensi Query**: Waktu eksekusi untuk query yang berjalan lambat (_slow queries_).
-   **Tools yang Direkomendasikan**:
    -   Dashboard monitoring yang disediakan oleh penyedia database cloud (misal: AWS RDS Performance Insights, Google Cloud SQL).

## 2. Strategi Logging

Logging reaktif bertujuan untuk menyediakan informasi detail yang dibutuhkan saat melakukan _troubleshooting_ atau investigasi masalah.

### 2.1. Level Log

-   **`ERROR`**: Untuk error yang tidak terduga atau kegagalan kritis yang memerlukan perhatian segera (misal: gagal terhubung ke database, _unhandled exception_).
-   **`WARN`**: Untuk kejadian yang tidak diharapkan tetapi tidak menghentikan fungsi aplikasi (misal: percobaan login gagal, request dengan data tidak valid).
-   **`INFO`**: Untuk mencatat kejadian penting dalam alur kerja normal aplikasi (misal: pengguna berhasil login, request aset baru dibuat, aset berhasil dihapus).
-   **`DEBUG`**: Informasi verbose yang hanya berguna saat proses _debugging_ di lingkungan development. **Tidak boleh diaktifkan di produksi**.

### 2.2. Format Log

Semua log **harus** dalam format **JSON terstruktur**. Ini memudahkan mesin untuk mem-parsing dan menganalisis log.

**Contoh Format Log (Backend)**:
```json
{
  "timestamp": "2024-08-05T10:30:00.123Z",
  "level": "INFO",
  "message": "User successfully authenticated",
  "context": "AuthService",
  "traceId": "abc-123-xyz-789",
  "payload": {
    "userId": 123,
    "email": "user@example.com"
  }
}
```

### 2.3. Penyimpanan & Analisis

-   **Jangan log ke file lokal di produksi**: Di lingkungan kontainer atau _serverless_, file lokal bersifat sementara dan akan hilang.
-   **Output ke `stdout`**: Aplikasi backend harus mencetak log ke _standard output_ (`stdout`). Platform hosting akan menangkap aliran ini.
-   **Sentralisasi Log**: Gunakan layanan agregasi log untuk mengumpulkan, menyimpan, dan menganalisis log dari semua sumber.
-   **Tools yang Direkomendasikan**: [Datadog Logs](https://www.datadoghq.com/product/log-management/), [ELK Stack](https://www.elastic.co/what-is/elk-stack) (Elasticsearch, Logstash, Kibana), [Loki](https://grafana.com/oss/loki/).

## 3. Strategi Alerting

Alerting adalah mekanisme untuk memberi tahu tim secara proaktif ketika metrik penting melampaui ambang batas yang ditentukan.

### 3.1. Kondisi Alert Kritis (High-Priority)

Alert ini harus segera ditangani dan dikirim ke kanal darurat (misal: PagerDuty, notifikasi push).

-   Backend API health check gagal (server down).
-   Tingkat error server (`5xx`) melebihi 1% selama 5 menit.
-   Utilisasi CPU server atau database > 90% selama lebih dari 10 menit.

### 3.2. Kondisi Alert Peringatan (Low-Priority)

Alert ini menunjukkan potensi masalah dan dapat dikirim ke kanal yang kurang mendesak (misal: email, channel Slack).

-   Latensi API p95 melebihi 1 detik.
-   Tingkat error klien (`4xx`) meningkat tajam (menandakan mungkin ada masalah di frontend atau serangan).
-   Utilisasi disk database > 85%.