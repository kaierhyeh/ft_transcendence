/**
 * Converts a Date object to a SQL-compatible datetime string (YYYY-MM-DD HH:MM:SS).
 */
export function toSqlDateTime(date: Date): string {
    return date.toISOString().slice(0, 19).replace('T', ' ');
}

export function fromSqlDateTime(sqlDate: string): Date {
    return new Date(sqlDate);
}
