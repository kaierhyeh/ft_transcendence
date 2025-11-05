import { Database } from "better-sqlite3";

export interface UserListRow {
	user_id: number;
	username: string;
	alias: string | null;
	avatar_filename: string | null;
	avatar_updated_at: string | null;
	friendship_status: string | null;
	from_id: number | null;
	to_id: number | null;
}

export interface FriendListRow {
	user_id: number;
	username: string;
	alias: string | null;
	avatar_filename: string | null;
	avatar_updated_at: string | null;
}

export interface IncomingRequestListRow {
	user_id: number;
	username: string;
	alias: string | null;
	avatar_filename: string | null;
	avatar_updated_at: string | null;
}

export interface OutgoingRequestListRow {
	user_id: number;
	username: string;
	alias: string | null;
	avatar_filename: string | null;
	avatar_updated_at: string | null;
}

export interface FriendshipStatus {
	status: string | null;
	from_id: number | null;
	to_id: number | null;
	from_username: string | null;
	to_username: string | null;
}

export class FriendRepository {
	constructor(private db: Database) {
		this.db = db;
	}

	public async listAllUsers() {
		const stmt = this.db.prepare(`
			SELECT
				u.user_id,
				u.username,
				u.alias,
				u.avatar_filename,
				u.avatar_updated_at
			FROM users as u
			ORDER BY u.username ASC
		`);
		return stmt.all() as UserListRow[];
	}

	public async listAllUsersExcept(userId: number) {
		const stmt = this.db.prepare(`
			SELECT
				u.user_id,
				u.username,
				u.alias,
				u.avatar_filename,
				u.avatar_updated_at AS avatar_updated_at,
				f.status AS friendship_status
			FROM users AS u
			LEFT JOIN friendships AS f
				ON f.status = 'accepted'
				AND (
					(f.user_id = ? AND f.friend_id = u.user_id)
					OR
					(f.friend_id = ? AND f.user_id = u.user_id)
				)
			WHERE u.user_id != ?
			ORDER BY u.username ASC
		`);
		return stmt.all(userId, userId, userId) as UserListRow[];
	}

	public async getUserById(userId: number, targetUserId: number) {
		const stmt = this.db.prepare(`
			SELECT
				u.user_id,
				u.username,
				u.alias,
				u.avatar_filename,
				u.avatar_updated_at
			FROM users AS u
			WHERE u.user_id = ?
		`);
		return stmt.get(targetUserId) as UserListRow | undefined;
	}

	public async getUserByIdForUser(thisUserId: number, targetUserId: number) {
		const stmt = this.db.prepare(`
			SELECT
				u.user_id,
				u.username,
				u.alias,
				u.avatar_filename,
				u.avatar_updated_at AS avatar_updated_at,
				f.status AS friendship_status,
				f.user_id AS from_id,
				f.friend_id AS to_id
			FROM users AS u
			LEFT JOIN friendships AS f
				ON (
					(f.user_id = ? AND f.friend_id = u.user_id)
					OR
					(f.friend_id = ? AND f.user_id = u.user_id)
				)
			WHERE u.user_id = ?
		`);
		return stmt.get(thisUserId, thisUserId, targetUserId) as UserListRow | undefined;
	}

	public async listFriends(userId: number) {
		const stmt = this.db.prepare(`
			SELECT
				u.user_id AS user_id,
				u.username AS username,
				u.alias AS alias,
				u.avatar_filename AS avatar_filename,
				u.avatar_updated_at AS avatar_updated_at,
				f.status AS friendship_status
			FROM users u
			JOIN friendships f
				ON (
					(f.friend_id = u.user_id AND f.user_id = ?)
					OR
					(f.user_id = u.user_id AND f.friend_id = ?)
				)
			WHERE f.status = 'accepted'
		`);
		return stmt.all(userId, userId) as FriendListRow[];
	}

	/* INCOMING requests */
	public async listPendingIncomingRequests(userId: number) {
		const stmt = this.db.prepare(`
			SELECT
				u.user_id AS user_id,
				u.username AS username,
				u.alias AS alias,
				u.avatar_filename AS avatar_filename,
				u.avatar_updated_at AS avatar_updated_at
			FROM users u
			JOIN friendships f ON f.user_id = u.user_id
			WHERE f.friend_id = ? AND f.status = 'pending'
		`);
		return stmt.all(userId) as IncomingRequestListRow[];
	}

	/* OUTGOING requests */
	public async listPendingOutgoingRequests(userId: number) {
		const stmt = this.db.prepare(`
			SELECT
				u.user_id AS user_id,
				u.username AS username,
				u.alias AS alias,
				u.avatar_filename AS avatar_filename,
				u.avatar_updated_at AS avatar_updated_at
			FROM users u
			JOIN friendships f ON f.friend_id = u.user_id
			WHERE f.user_id = ? AND f.status = 'pending'
		`);
		return stmt.all(userId) as OutgoingRequestListRow[];
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

	// remove friendship (if status="accepted")
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

	public async getUsersByIds(thisUserId: number, userIds: number[]) {
		if (!userIds.length) {
			return [];
		}

		// Dynamically build placeholders (?, ?, ?, ...)
		const placeholders = userIds.map(() => "?").join(", ");

		const stmt = this.db.prepare(`
			SELECT
				u.user_id,
				u.username,
				u.alias,
				u.avatar_filename,
				u.avatar_updated_at,
				f.status AS friendship_status,
				f.user_id AS from_id,
				f.friend_id AS to_id
			FROM users AS u
			LEFT JOIN friendships AS f
				ON (
					(f.user_id = ? AND f.friend_id = u.user_id)
					OR
					(f.friend_id = ? AND f.user_id = u.user_id)
				)
			WHERE u.user_id IN (${placeholders})
		`);

		const params = [thisUserId, thisUserId, ...userIds];

		return stmt.all(...params) as UserListRow[];
	}

	public async getFriendshipStatus(userId: number, friendId: number) {
		const stmt = this.db.prepare(`
			SELECT
				f.status AS status,
				f.user_id AS from_id,
				f.friend_id AS to_id
			FROM friendships f
			WHERE f.user_id = ? AND f.friend_id = ?
		`);
		
		const res = stmt.get(userId, friendId) as FriendshipStatus;
		console.log("--------------- RES FROM DB: ", res);
		return res;
	}
}
