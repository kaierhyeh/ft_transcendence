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

	// first delete any friendship or pending request between the two users
	// try add block line
	// if exists block line in opposite direction - do nothing
	public async blockUser(userId: number, targetUserId: number) { 									// HERE TO DO 
		const stmt = this.db.prepare(`
			WITH removed AS (
				DELETE FROM friendships
				WHERE (
					(user_id = ? AND friend_id = ?)
					OR (user_id = ? AND friend_id = ?)
				)
				AND status IN ('pending', 'accepted')
			)
			INSERT OR IGNORE INTO friendships (user_id, friend_id, status)
			VALUES (?, ?, 'blocked')
		`);
		stmt.run(userId, targetUserId, targetUserId, userId, userId, targetUserId);
	}

	public async unblockUser(userId: number, targetUserId: number) {
		const stmt = this.db.prepare(`
			DELETE FROM friendships
			WHERE user_id = ? AND targetUserId = ? AND status = 'blocked'
		`);
		stmt.run(userId, targetUserId);
	}

}
