"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.toSqlDate = toSqlDate;
// Converts a Date object to a SQL-compatible datetime string (YYYY-MM-DD HH:MM:SS).
function toSqlDate(Date) {
    return Date.toISOString().slice(0, 19).replace('T', ' ');
}
//# sourceMappingURL=utils.js.map