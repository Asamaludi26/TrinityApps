
export const exportToCSV = <T extends object>(
    data: T[], 
    filename: string, 
    extraHeader?: { title: string; metadata: Record<string, string> }
): void => {
    if (data.length === 0) {
        alert("Tidak ada data untuk diekspor.");
        return;
    }

    const csvRows: string[] = [];

    // 1. Judul Laporan (Simulasi Center Alignment di Excel dengan menaruh di kolom tengah)
    if (extraHeader?.title) {
        csvRows.push(`,,,,${extraHeader.title.toUpperCase()}`);
        csvRows.push(""); // Baris kosong sebagai spacer
    }

    // 2. Metadata Section (Akun, Range Waktu, Tanggal Cetak)
    if (extraHeader?.metadata) {
        const meta = extraHeader.metadata;
        // Akun di kiri, Range di tengah, Tanggal di kanan
        const metaRow = `Akun : ${meta["Akun"] || "-"},,,Range Waktu : ${meta["Range Waktu"] || "-"},,,,,Tanggal : ${meta["Tanggal"] || "-"}`;
        csvRows.push(metaRow);
        csvRows.push(""); // Baris kosong sebelum header tabel
    }

    // 3. Header Tabel (Sesuai kunci objek data ter-map)
    const headers = Object.keys(data[0]) as (keyof T)[];
    csvRows.push(headers.join(','));

    // 4. Baris Data
    data.forEach(row => {
        const values = headers.map(header => {
            const value = row[header];
            if (value === null || value === undefined) return '""';
            
            // Escape double quotes dan bungkus dengan quotes untuk menangani koma/newline dalam sel
            const stringValue = String(value);
            return `"${stringValue.replace(/"/g, '""')}"`;
        });
        csvRows.push(values.join(','));
    });

    // Menambahkan Byte Order Mark (BOM) \uFEFF agar Excel otomatis deteksi UTF-8
    const csvString = csvRows.join('\n');
    const blob = new Blob([`\uFEFF${csvString}`], { type: 'text/csv;charset=utf-8;' });

    const link = document.createElement('a');
    if (link.download !== undefined) {
        const url = URL.createObjectURL(blob);
        link.setAttribute('href', url);
        link.setAttribute('download', `${filename}.csv`);
        link.style.visibility = 'hidden';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    }
};
