import { Database } from "better-sqlite3";
import { GoogleUserCreationData, LocalUserCreationRawData } from "../schemas";
import { TwoFa } from "../types";
import { CONFIG } from "../config";
import fs from "fs";
import path from "path";

export interface UserRow {
    user_id: number;
    username: string;
    email: string | null;
    password_hash: string | null;
    alias: string | null;
    avatar_filename: string;
    avatar_updated_at: string;
    two_fa_enabled: 0 | 1;
    two_fa_secret: string | null;
    google_sub: string | null;
    settings: string;
    created_at: string;
    updated_at: string;
    last_seen: string | null;
}

export interface UpdateData {
    password_hash?: string;
    alias?: string;
    avatar?: {
        filename: string;
        updated_at: string;
    };
    settings?: string;
}

type LocalUserCreationData = Omit<LocalUserCreationRawData, "password"> & {
    password_hash: string;
    alias?: string;
}

export class UserRepository {
    constructor(private db: Database) {
        this.db = db;
    }

    public createLocalUser(data: LocalUserCreationData): number {
        const stmt = this.db.prepare(`
            INSERT INTO users (username, email, password_hash, alias)
            VALUES (?, ?, ?, ?)
        `);
        const result = stmt.run(
            data.username,
            data.email ?? null,
            data.password_hash,
            data.alias ?? null,
        );
        return result.lastInsertRowid as number;
    }

    public createGoogleUser(data: GoogleUserCreationData): number {
        const stmt = this.db.prepare(`
            INSERT INTO users (google_sub, username, email, alias)
            VALUES (?, ?, ?, ?)
        `);
        const result = stmt.run(
            data.google_sub,
            data.username,
            data.email ?? null,
            data.alias ?? null,
        );
        return result.lastInsertRowid as number;
    }

    public find(identifier: string): UserRow | null {
        const stmt = this.db.prepare(`
            SELECT * FROM users 
            WHERE (user_id = ? OR username = ?)
        `);
        const result = stmt.get(identifier, identifier) as UserRow | undefined;
        return result || null;
    }

    public updateById(user_id: number, data: UpdateData): number {
        // Build dynamic SQL query only for fields that are provided
        const set_clauses: string[] = [];
        const params: Record<string, any> = { user_id };

        // Handle regular fields
        if (data.password_hash !== undefined) {
            set_clauses.push("password_hash = @password_hash");
            params.password_hash = data.password_hash;
        }
        if (data.alias !== undefined) {
            set_clauses.push("alias = @alias");
            params.alias = data.alias;
        }
        if (data.avatar !== undefined) {
            set_clauses.push("avatar_filename = @avatar_filename");
            params.avatar_filename = data.avatar.filename;
            set_clauses.push("avatar_updated_at = @avatar_updated_at");
            params.avatar_updated_at = data.avatar.updated_at;
        }
        if (data.settings !== undefined) {
            set_clauses.push("settings = @settings");
            params.settings = data.settings;
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

    public findByGoogleSub(google_sub: string): UserRow | null {
        const stmt = this.db.prepare(`
            SELECT * FROM users 
            WHERE google_sub = ?
        `);
        const result = stmt.get(google_sub) as UserRow | undefined;
        return result || null;
    }

    private safeDeleteAvatarFile(avatar_filename: string | null): void {
        // Never delete the default avatar
        if (!avatar_filename || avatar_filename === CONFIG.AVATAR.DEFAULT_FILENAME) {
            return;
        }

        if (avatar_filename.includes('..')) {
            console.warn(`Invalid avatar filename`);
            return ;
        }
        const avatarPath = path.join(CONFIG.AVATAR.BASE_URL, avatar_filename);
        try {
            if (fs.existsSync(avatarPath)) {
                fs.unlinkSync(avatarPath);
                console.log(`Deleted avatar file: ${avatarPath}`);
            }
        } catch (error) {
            console.warn(`Failed to delete avatar file: ${avatarPath}`, error);
        }
    }

    public resetAvatarToDefault(user_id: number): number {
        // First get the current avatar filename
        const userStmt = this.db.prepare(`
            SELECT avatar_filename FROM users WHERE user_id = ?
        `);
        const user = userStmt.get(user_id) as { avatar_filename: string | null } | undefined;
        
        // Safely delete current avatar file (never deletes default.png)
        if (user?.avatar_filename) {
            this.safeDeleteAvatarFile(user.avatar_filename);
        }
        
        // Update to default avatar
        const stmt = this.db.prepare(`
            UPDATE users 
            SET avatar_filename = ?,
                avatar_updated_at = datetime('now'),
                updated_at = datetime('now')
            WHERE user_id = ?
        `);
        const result = stmt.run(CONFIG.AVATAR.DEFAULT_FILENAME, user_id);
        return result.changes as number;
    }

    public update2FASettings(user_id: number, enabled: number, secret?: string | null): number {
        const stmt = this.db.prepare(`
            UPDATE users 
            SET two_fa_enabled = ?,
                two_fa_secret = ?,
                updated_at = datetime('now')
            WHERE user_id = ?
        `);
        const result = stmt.run(enabled, secret, user_id);
        return result.changes as number;
    }

}
