import { Database } from "better-sqlite3";

export class FriendRepository {
	constructor(private db: Database) {
		this.db = db;
	}

	public async listFriends(userId: number) {
		const stmt = this.db.prepare(`
			SELECT u.id, u.nickname, u.isOnline
			FROM friendships f
			JOIN users u ON (f.user_id = u.id OR f.friend_id = u.id)
			WHERE (f.user_id = ? OR f.friend_id = ?) AND f.status = 'accepted' AND u.id != ?
		`);
		return stmt.all(userId, userId, userId);
	}

	/* INCOMING requests */
	public async listPendingIncomingRequests(userId: number) {
		const stmt = this.db.prepare(`
			SELECT f.user_id AS fromUserId, u.nickname
			FROM friendships f
			JOIN users u ON u.id = f.user_id
			WHERE f.friend_id = ? AND f.status = 'pending'
		`);
		return stmt.all(userId);
	}

	/* OUTGOING requests */
	public async listPendingOutgoingRequests(userId: number) {
		const stmt = this.db.prepare(`
			SELECT f.friend_id AS toUserId, u.nickname
			FROM friendships f
			JOIN users u ON u.id = f.friend_id
			WHERE f.user_id = ? AND f.status = 'pending'
		`);
		return stmt.all(userId);
	}

	// IGNORE duplicates
	public async sendFriendRequest(fromUserId: number, toUserId: number) {
		const stmt = this.db.prepare(`
			INSERT OR IGNORE INTO friendships (user_id, friend_id, status)
			VALUES (?, ?, 'pending')
		`);
		stmt.run(fromUserId, toUserId);
	}

	// fromUserId = sender, toUserId = recipient
	public async cancelFriendRequest(fromUserId: number, toUserId: number) {
		const stmt = this.db.prepare(`
			DELETE FROM friendships
			WHERE user_id = ? AND friend_id = ? AND status = 'pending'
		`);
		stmt.run(fromUserId, toUserId);
	}

	// friendId = sender, userId = recipient
	public async acceptFriendRequest(userId: number, friendId: number) {
		const stmt = this.db.prepare(`
			UPDATE friendships
			SET status = 'accepted'
			WHERE user_id = ? AND friend_id = ? AND status = 'pending'
		`);
		stmt.run(friendId, userId);
	}

	// friendId = sender, userId = recipient
	public async declineFriendRequest(userId: number, friendId: number) {
		const stmt = this.db.prepare(`
			DELETE FROM friendships
			WHERE user_id = ? AND friend_id = ? AND status = 'pending'
		`);
		stmt.run(friendId, userId);
	}

	public async removeFriendship(userId: number, friendId: number) {
		const stmt = this.db.prepare(`
			DELETE FROM friendships
			WHERE ((user_id = ? AND friend_id = ?) OR (user_id = ? AND friend_id = ?))
			AND status = 'accepted'
		`);
		stmt.run(friendId, userId, userId, friendId);
	}

	// useful when need to find two users relationship status
	// now we no need such functions like this one: isStatusFriends(user1, user2)
	public async isStatusExists(userId: number, friendId: number, status: string): Promise<boolean> {
		const stmt = this.db.prepare(`
			SELECT COUNT(*) as count
			FROM friendships
			WHERE ((user_id = ? AND friend_id = ?) OR (user_id = ? AND friend_id = ?))
			AND status = ?
		`);
		const result = stmt.get(userId, friendId, friendId, userId, status) as { count: number };
		return result.count > 0;
	}
}