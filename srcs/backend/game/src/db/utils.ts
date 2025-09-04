/**
 * Converts a Date object to a SQL-compatible datetime string (YYYY-MM-DD HH:MM:SS).
 */
export function toSqlDate(Date: Date): string {
    return Date.toISOString().slice(0, 19).replace('T', ' ');
}