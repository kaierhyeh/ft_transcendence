<<<<<<< HEAD
/**
 * Converts a Date object to a SQL-compatible datetime string (YYYY-MM-DD HH:MM:SS).
 */
=======
// Converts a Date object to a SQL-compatible datetime string (YYYY-MM-DD HH:MM:SS).
>>>>>>> develop
export function toSqlDate(Date: Date): string {
    return Date.toISOString().slice(0, 19).replace('T', ' ');
}