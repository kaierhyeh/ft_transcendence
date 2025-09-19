import { Database } from "better-sqlite3";
import { GoogleUserCreationData, GuestUserCreationData, LocalUserCreationData } from "../schemas";
import { TwoFa } from "../types";

export interface UserRow {
    user_id: number;
    user_type: "registered" | "guest" | "deleted" | "expired";
    username: string | null;
    email: string | null;
    password_hash: string | null;
    alias: string | null;
    avatar_url: string | null;
    two_fa_enabled: 0 | 1;
    two_fa_secret: string | null;
    google_sub: string | null;
    status: "online" | "offline" | "away";
    created_at: string;
    updated_at: string;
    last_seen: string | null;
}

export interface UpdateData {
    email: string | undefined;
    password_hash: string | undefined;
    alias: string | undefined;
    avatar_url: string | undefined;
    settings: string | undefined;
    two_fa: TwoFa | undefined;
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
            data.alias ?? null,  // Use nullish coalescing for more explicit null handling
            data.avatar_url ?? null
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
            data.alias ?? null,  // Use nullish coalescing for more explicit null handling
            data.avatar_url ?? null
        );
        return result.lastInsertRowid as number;
    }

    public createGuestUser(data: GuestUserCreationData): number {
        const stmt = this.db.prepare(`
            INSERT INTO users (user_type, alias)
            VALUES ('guest', ?)
        `);
        const result = stmt.run(
            data.alias
        );
        return result.lastInsertRowid as number;
    }

    public findByLogin(login: string): UserRow | null {
        const stmt = this.db.prepare(`
            SELECT * FROM users 
            WHERE (username = ? OR email = ? OR google_sub = ?) 
              AND user_type = 'registered'
        `);
        const result = stmt.get(login, login, login) as UserRow | undefined;
        return result || null;
    }

    public updateById(user_id: number, data: UpdateData): number {
        // Build dynamic SQL query only for fields that are provided
        const set_clauses: string[] = [];
        const params: Record<string, any> = { user_id };

        // Handle regular fields
        if (data.email !== undefined) {
            set_clauses.push("email = @email");
            params.email = data.email;
        }
        if (data.password_hash !== undefined) {
            set_clauses.push("password_hash = @password_hash");
            params.password_hash = data.password_hash;
        }
        if (data.alias !== undefined) {
            set_clauses.push("alias = @alias");
            params.alias = data.alias;
        }
        if (data.avatar_url !== undefined) {
            set_clauses.push("avatar_url = @avatar_url");
            params.avatar_url = data.avatar_url;
        }
        if (data.settings !== undefined) {
            set_clauses.push("settings = @settings");
            params.settings = data.settings;
        }

        // Handle 2FA nested object
        if (data.two_fa !== undefined) {
            if (data.two_fa.enabled !== undefined) {
                set_clauses.push("two_fa_enabled = @two_fa_enabled");
                params.two_fa_enabled = data.two_fa.enabled ? 1 : 0;
            }
            if (data.two_fa.secret !== undefined) {
                set_clauses.push("two_fa_secret = @two_fa_secret");
                params.two_fa_secret = data.two_fa.secret;
            }
        }

        // If no fields to update, return 0
        if (set_clauses.length === 0) {
            return 0;
        }

        // Always update the timestamp
        set_clauses.push("updated_at = datetime('now')");

        const sql = `
            UPDATE users
            SET ${set_clauses.join(', ')}
            WHERE user_id = @user_id
        `;

        const stmt = this.db.prepare(sql);
        const result = stmt.run(params);
        return result.changes as number;
    }

    public findById(user_id: number): UserRow | null {
        const stmt = this.db.prepare(`
            SELECT * FROM users 
            WHERE user_id = ?
        `);
        const result = stmt.get(user_id) as UserRow | undefined;
        return result || null;
    }

    // TODO - remove findByEmail because not used
    public findByEmail(email: string): UserRow | null {
        const stmt = this.db.prepare(`
            SELECT * FROM users 
            WHERE email = ? AND user_type = 'registered'
        `);
        const result = stmt.get(email) as UserRow | undefined;
        return result || null;
    }

    public findByGoogleSub(google_sub: string): UserRow | null {
        const stmt = this.db.prepare(`
            SELECT * FROM users 
            WHERE google_sub = ? AND user_type = 'registered'
        `);
        const result = stmt.get(google_sub) as UserRow | undefined;
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
