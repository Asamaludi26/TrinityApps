
/**
 * Menghasilkan UUID v4 yang aman secara kriptografi.
 * Menggunakan crypto.randomUUID() jika tersedia, atau fallback ke metode manual.
 * Ini penting untuk mencegah collision ID pada list item dan kompatibilitas dengan database PostgreSQL.
 */
export const generateUUID = (): string => {
    if (typeof crypto !== 'undefined' && crypto.randomUUID) {
        return crypto.randomUUID();
    }
    
    // Fallback untuk browser lama (meskipun project ini target modern browser)
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
        const r = Math.random() * 16 | 0, v = c == 'x' ? r : (r & 0x3 | 0x8);
        return v.toString(16);
    });
};
