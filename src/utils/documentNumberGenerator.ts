/**
 * Menghasilkan nomor dokumen yang unik untuk tanggal tertentu.
 * Format default adalah PREFIX-YYMMDD-XXX.
 * Untuk prefix 'MNT', formatnya adalah WO-MT-YYYYMMDD-NNNN.
 * 
 * @param prefix Prefix untuk nomor dokumen (misal: 'HO', 'DSM', 'MNT').
 * @param existingDocs Array objek yang memiliki properti `docNumber`.
 * @param date Objek Date opsional. Jika tidak disediakan, akan menggunakan tanggal saat ini.
 * @returns Nomor dokumen baru yang unik untuk tanggal yang ditentukan.
 */
export const generateDocumentNumber = (
  prefix: string,
  // FIX: Allow docNumber to be optional to match the Request type. The implementation already safely handles this.
  existingDocs: { docNumber?: string }[],
  date: Date = new Date()
): string => {
  if (prefix === 'MNT') {
    // New format for Maintenance: WO-MT-YYYYMMDD-NNNN
    const d = new Date(date);
    const year = d.getFullYear().toString(); // YYYY
    const month = (d.getMonth() + 1).toString().padStart(2, '0'); // MM
    const day = d.getDate().toString().padStart(2, '0'); // DD
    const dateStr = `${year}${month}${day}`;

    const dayPrefix = `WO-MT-${dateStr}`;

    const dayDocs = existingDocs.filter(doc => 
      doc.docNumber && doc.docNumber.startsWith(dayPrefix)
    );

    const highestSequence = dayDocs.reduce((max, doc) => {
      const parts = doc.docNumber!.split('-');
      const sequenceStr = parts[parts.length - 1];
      const sequence = parseInt(sequenceStr, 10);
      return !isNaN(sequence) && sequence > max ? sequence : max;
    }, 0);

    const newSequence = (highestSequence + 1).toString().padStart(4, '0');
    
    return `${dayPrefix}-${newSequence}`;
  }

  // Old logic for other prefixes (HO, DSM, etc.)
  const d = new Date(date);
  const year = d.getFullYear().toString().slice(-2);
  const month = (d.getMonth() + 1).toString().padStart(2, '0');
  const day = d.getDate().toString().padStart(2, '0');
  const dateStr = `${year}${month}${day}`;

  const dayPrefix = `${prefix}-${dateStr}`;

  const dayDocs = existingDocs.filter(doc => 
    doc.docNumber && doc.docNumber.startsWith(dayPrefix)
  );

  const highestSequence = dayDocs.reduce((max, doc) => {
    const parts = doc.docNumber!.split('-');
    const sequenceStr = parts[parts.length - 1];
    const sequence = parseInt(sequenceStr, 10);
    return !isNaN(sequence) && sequence > max ? sequence : max;
  }, 0);

  const newSequence = (highestSequence + 1).toString().padStart(3, '0');
  
  return `${dayPrefix}-${newSequence}`;
};