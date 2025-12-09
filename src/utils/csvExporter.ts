export const exportToCSV = <T extends object>(data: T[], filename: string): void => {
    if (data.length === 0) {
        console.warn("No data to export.");
        alert("Tidak ada data untuk diekspor.");
        return;
    }

    const headers = Object.keys(data[0]) as (keyof T)[];
    const csvRows = [
        headers.join(',') // Header row
    ];

    data.forEach(row => {
        const values = headers.map(header => {
            const value = row[header];
            let escapedValue: string;
            
            if (value === null || value === undefined) {
                escapedValue = '';
            } else if (typeof value === 'object') {
                // Handle complex objects like arrays by JSON stringifying them
                escapedValue = `"${JSON.stringify(value).replace(/"/g, '""')}"`;
            } else {
                 // Escape quotes and wrap in quotes if it contains a comma, quote, or newline
                escapedValue = `"${String(value).replace(/"/g, '""')}"`;
            }
            return escapedValue;
        });
        csvRows.push(values.join(','));
    });

    const csvString = csvRows.join('\n');
    const blob = new Blob([`\uFEFF${csvString}`], { type: 'text/csv;charset=utf-8;' }); // Add BOM for Excel compatibility

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
