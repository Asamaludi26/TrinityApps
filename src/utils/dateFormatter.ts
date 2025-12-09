/**
 * Converts a Date object to a 'YYYY-MM-DD' string, correctly handling timezone offsets.
 * This prevents the common "one day off" bug by using the local date parts
 * instead of converting to UTC.
 * @param date The date object to format.
 * @returns A string in 'YYYY-MM-DD' format, or an empty string if the date is null/undefined.
 */
export const toYYYYMMDD = (date: Date | null | undefined): string => {
  if (!date) {
    return '';
  }
  
  const d = new Date(date); // Create a new Date object to avoid modifying the original
  const year = d.getFullYear();
  const month = d.getMonth() + 1; // getMonth() is zero-based
  const day = d.getDate();

  return [
    year,
    month.toString().padStart(2, '0'),
    day.toString().padStart(2, '0')
  ].join('-');
};