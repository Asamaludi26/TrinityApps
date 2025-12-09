<!DOCTYPE html>
<html lang="id">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Berita Acara Kerjasama - Aplikasi Inventori Aset</title>
    <style>
        body {
            font-family: 'Times New Roman', Times, serif;
            line-height: 1.75;
            background-color: #f3f4f6;
            color: #111827;
        }
        .page {
            background-color: white;
            width: 210mm;
            min-height: 297mm;
            margin: 2rem auto;
            padding: 2.5cm;
            box-shadow: 0 0 10px rgba(0,0,0,0.1);
            text-align: justify;
            font-size: 12pt;
        }
        h2, h3, h4, p, ol, ul {
            margin-bottom: 1.5em;
        }
        h2 {
            font-size: 1.5em;
            font-weight: bold;
            text-align: center;
            text-transform: uppercase;
            text-decoration: underline;
        }
        h3 {
            font-size: 1.2em;
            font-weight: bold;
            text-align: center;
            margin-top: -1em;
        }
        ol {
            list-style-type: decimal;
            padding-left: 1.5em;
        }
        ol ol {
            list-style-type: lower-alpha;
        }
        ol ol ol {
            list-style-type: lower-roman;
        }
        ul {
            list-style-type: disc;
            padding-left: 1.5em;
        }
        .signature-block {
            margin-top: 5rem;
            display: grid;
            grid-template-columns: 1fr 1fr;
            gap: 2rem;
            text-align: center;
            break-inside: avoid;
        }
        .signature-line {
            border-top: 1px solid black;
            width: 250px;
            margin: 100px auto 0 auto;
            padding-top: 5px;
        }
        strong {
            font-weight: bold;
        }

        @media print {
            body {
                background-color: white;
                margin: 0;
            }
            .page {
                margin: 0;
                box-shadow: none;
                padding: 0;
            }
        }
    </style>
</head>
<body>
    <div class="page">
        <header>
            <h2>Berita Acara Kesepakatan Kerjasama</h2>
            <h3>NOMOR: 001/BAK-DEV/TMI-AS/X/2025</h3>
        </header>

        <p>
          Pada hari ini, ........................, tanggal ...... (........................) bulan Oktober tahun Dua Ribu Dua Puluh Lima (2025), yang bertanda tangan di bawah ini telah melakukan dan menyetujui kesepakatan dalam rangka rencana Kerjasama Perancangan dan Pengembangan Aplikasi Inventori Aset ("Aplikasi"), dengan ketentuan sebagai berikut:
        </p>

        <ol>
            <li>
                Bahwa <strong>Angga Samuludi Septiawan</strong> ("PIHAK KEDUA") telah mengajukan proposal penawaran untuk pengembangan Aplikasi kepada <strong>PT. TRINITI MEDIA INDONESIA</strong> ("PIHAK PERTAMA") sesuai proposal Nomor: Q-INV/AS/X/2025/001 perihal Penawaran Pengembangan Aplikasi Inventori Aset.
            </li>
            <li>
                Atas rencana kerjasama tersebut telah disetujui oleh Direksi PIHAK PERTAMA sesuai dengan Perjanjian Kerja Nomor: 001/SPK-DEV/TMI-AS/X/2025 tentang Pengembangan Perangkat Lunak Inventori Aset.
            </li>
            <li>
                Sesuai dengan Surat Persetujuan tersebut di atas, Para Pihak sepakat untuk menuangkan poin-poin kerjasama teknis dan operasional dalam Berita Acara ini.
            </li>
            <li>
                <strong>Kerjasama Perancangan dan Pengembangan Aplikasi</strong>
                <ol>
                    <li>
                        Para Pihak telah melakukan pembahasan dengan hasil sebagai berikut:
                        <ol>
                            <li>
                                Para Pihak sepakat bahwa perancangan dan pengembangan Aplikasi dilaksanakan oleh PIHAK KEDUA selama jangka waktu <strong>10 (sepuluh) minggu</strong> sejak tanggal Perjanjian Kerja ditandatangani.
                            </li>
                            <li>
                                Atas pekerjaan perancangan dan pengembangan Aplikasi tersebut, dan mempertimbangkan model kerjasama jual putus, maka PIHAK PERTAMA akan membayarkan nilai investasi total sebesar <strong>Rp 25.000.000,- (Dua Puluh Lima Juta Rupiah)</strong>. Rincian tata cara pembayaran diatur lebih lanjut dalam Perjanjian Kerja.
                            </li>
                        </ol>
                    </li>
                    <li>
                        PIHAK KEDUA akan menerima manfaat berupa pembayaran nilai investasi sesuai dengan termin yang disepakati dalam Perjanjian Kerja.
                    </li>
                </ol>
            </li>
            <li>
                <strong>Lingkup Kerjasama</strong>
                <p>Lingkup kerjasama selama pengembangan meliputi realisasi modul-modul fungsional berikut dalam bentuk prototipe frontend fungsional penuh:</p>
                <ul>
                    <li>Dashboard Analitis</li>
                    <li>Manajemen Aset (Permintaan, Pencatatan, Stok, Serah Terima, Penarikan, Perbaikan)</li>
                    <li>Manajemen Pelanggan</li>
                    <li>Manajemen Pengguna & Divisi (termasuk Hak Akses Berbasis Peran)</li>
                    <li>Modul Pengaturan (Kategori, Tipe, dan Model Aset)</li>
                    <li>Fitur Produktivitas (Pencarian, Filter, Ekspor CSV, Aksi Massal)</li>
                    <li>Integrasi Pemindai dan Generator Kode QR/Barcode</li>
                </ul>
            </li>
            <li>
                <strong>Hasil Pekerjaan dan Kewajiban Para Pihak</strong>
                <ol>
                    <li>
                        <strong>Hasil Pekerjaan (Deliverables)</strong> yang diserahkan oleh PIHAK KEDUA terdiri dari:
                        <ul>
                            <li>Seluruh Kode Sumber (*Source Code*) aplikasi Frontend (React).</li>
                            <li>Aplikasi fungsional yang dapat didemonstrasikan.</li>
                            <li>Dokumentasi teknis, arsitektur, dan panduan pengguna yang komprehensif.</li>
                            <li>Satu sesi pelatihan untuk administrator sistem yang ditunjuk oleh PIHAK PERTAMA.</li>
                        </ul>
                    </li>
                    <li>
                        <strong>Kewajiban PIHAK PERTAMA</strong> terdiri dari:
                        <ul>
                            <li>Melakukan pembayaran sesuai termin yang diatur dalam Perjanjian Kerja.</li>
                            <li>Menyediakan data, informasi, dan umpan balik yang diperlukan untuk kelancaran proyek.</li>
                            <li>Menyediakan infrastruktur server yang diperlukan untuk deployment aplikasi versi produksi di kemudian hari.</li>
                        </ul>
                    </li>
                </ol>
            </li>
            <li>
                Rincian perbaikan dan pemeliharaan yang menjadi kewajiban dan tanggung jawab PIHAK KEDUA adalah garansi perbaikan cacat (*bug fixing*) selama 90 (sembilan puluh) hari kalender setelah serah terima proyek, sebagaimana terlampir dalam Perjanjian Kerja.
            </li>
            <li>
                Seluruh perangkat lunak dan kode sumber yang dikembangkan menjadi Hak Kekayaan Intelektual milik PIHAK PERTAMA setelah pelunasan penuh dilakukan. PIHAK KEDUA wajib menyerahkan seluruh aset digital tersebut pada saat serah terima pekerjaan.
            </li>
            <li>
                Ketentuan lain yang terkait kerjasama ini dituangkan dalam Perjanjian Kerja yang berlaku dan menjadi satu kesatuan yang tidak terpisahkan dengan Berita Acara ini.
            </li>
        </ol>
        
        <p>Demikian berita acara ini dibuat dan ditandatangani oleh Para Pihak dalam keadaan sadar dan tanpa ada paksaan dari pihak manapun untuk dipergunakan sebagaimana mestinya.</p>

        <div class="signature-block">
            <div>
                <p>PIHAK PERTAMA,</p>
                <p><strong>PT. TRINITI MEDIA INDONESIA</strong></p>
                <div class="signature-line">
                    <p><strong>(.........................................)</strong></p>
                    <p>Direktur Utama</p>
                </div>
            </div>
            <div>
                <p>PIHAK KEDUA,</p>
                <div class="signature-line">
                    <p><strong>Angga Samuludi Septiawan</strong></p>
                    <p>Full-Stack Developer</p>
                </div>
            </div>
        </div>
    </div>
</body>
</html>