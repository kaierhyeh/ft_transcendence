import { Database } from "better-sqlite3";

export interface BlockedRow {
	user_id: number;
	username: string;
	alias: string;
	avatar_filename: string;
	avatar_updated_at: string | null;
}

export class BlockRepository {
    constructor(private db: Database) {
        this.db = db;
    }

	public async listBlockedUsers(userId: number) {
		console.log("[INFO] REPO - listBlockedUsers 0");
		const stmt = this.db.prepare(`
			SELECT
				u.user_id AS user_id,
				u.username AS username,
				u.alias AS alias,
				u.avatar_filename AS avatar_filename,
				u.avatar_updated_at AS avatar_updated_at
			FROM users u
			JOIN friendships f ON f.friend_id = u.user_id
			WHERE f.user_id = ? AND f.status = 'blocked'
		`);
		console.log("[INFO] REPO - listBlockedUsers 1");
		return stmt.all(userId) as BlockedRow[];
	}

	public async blockUser(userId: number, targetUserId: number) {

		const deleteStmt = this.db.prepare(`
			DELETE FROM friendships
			WHERE ((user_id = ? AND friend_id = ?) OR (user_id = ? AND friend_id = ?))
			AND status IN ('pending', 'accepted')
		`);

		const insertStmt = this.db.prepare(`
			INSERT OR IGNORE INTO friendships (user_id, friend_id, status)
			VALUES (?, ?, 'blocked')
		`);

		const operation = this.db.transaction(() => {
			deleteStmt.run(userId, targetUserId, targetUserId, userId);
			insertStmt.run(userId, targetUserId);
		});

		operation();
	}

	public async unblockUser(userId: number, targetUserId: number) {
		const stmt = this.db.prepare(`
			DELETE FROM friendships
			WHERE user_id = ? AND friend_id = ? AND status = 'blocked'
		`);
		stmt.run(userId, targetUserId);
	}

}
