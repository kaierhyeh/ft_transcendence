import { Database } from "better-sqlite3";
import { GoogleUserCreationData, LocalUserCreationData } from "../schemas";

export interface UserRow {
    id: number;
    username: string;
    email: string;
    password_hash?: string;  // Add this field
    alias: string | null;
    avatar_url: string | null;
    two_fa_enabled: 0 | 1;
    two_fa_secret: string | null;
    google_sub: string | null;
    status: "online" | "offline" | "away";
    created_at: string;
    updated_at: string;
}

export class UserRepository {
    constructor(private db: Database) {
        this.db = db;
    }

    public createLocalUser(data: LocalUserCreationData): number {
        const stmt = this.db.prepare(`
            INSERT INTO users (username, email, password_hash, alias, avatar_url)
            VALUES (?, ?, ?, ?, ?)
        `);
        const result = stmt.run(
            data.username,
            data.email,
            data.password_hash,
            data.alias || null,
            data.avatar_url || null
        );
        return result.lastInsertRowid as number;
    }

    public createGoogleUser(data: GoogleUserCreationData): number {
        const stmt = this.db.prepare(`
            INSERT INTO users (google_sub, username, email, alias, avatar_url)
            VALUES (?, ?, ?, ?, ?)
        `);
        const result = stmt.run(
            data.google_sub,
            data.username,
            data.email,
            data.alias || null,
            data.avatar_url || null
        );
        return result.lastInsertRowid as number;
    }

    public findByEmail(email: string): UserRow | null{
        const stmt = this.db.prepare(`
            SELECT * FROM users WHERE email = ?  
        `);
        const result = stmt.get(email) as UserRow | undefined;
        return result || null;
    }

//     createLocalUser(input: {
//     username: string;
//     email: string;
//     passwordHash: string; // already hashed
//     alias?: string;
//     avatarUrl?: string;
//   }): number; // returns user_id

//   linkGoogle(userId: number, googleSub: string): void;

//   enable2FA(userId: number, totpSecret: string): void;
//   disable2FA(userId: number): void;

//   getById(userId: number): UserRow | null;
//   getByUsername(username: string): UserRow | null;
//   getByEmail(email: string): UserRow | null;
//   getByGoogleSub(googleSub: string): UserRow | null;

//   setPasswordHash(userId: number, passwordHash: string): void;
//   setEmailVerified(userId: number, verified: boolean): void;

//   updateProfile(userId: number, patch: {
//     alias?: string;
//     avatarUrl?: string;
//     settingsJson?: string;
//   }): void;

//   bumpPresence(userId: number, status: 'online'|'offline'|'away', when?: string): void; // updates last_seen & status

}
