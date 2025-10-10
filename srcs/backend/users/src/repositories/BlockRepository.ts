import { Database } from "better-sqlite3";

export interface BlockedRow {
	id: number;
	nickname: number;
}

export class BlockRepository {
    constructor(private db: Database) {
        this.db = db;
    }

	public async listBlockedUsers(userId: number) {
		const stmt = this.db.prepare(`
			SELECT u.user_id AS id, u.nickname
			FROM friendships f
			JOIN users u ON f.friend_id = u.user_id
			WHERE f.user_id = ? AND f.status = 'blocked'
		`);
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
