import { Database } from "better-sqlite3";

export class FriendRepository {
		constructor(private db: Database) {
				this.db = db;
		}

	// sendFriendRequest(fromUserId: number, toUserId: number): Promise<void>;
	// acceptFriendRequest(userId: number, friendId: number): Promise<void>;
	// declineFriendRequest(userId: number, friendId: number): Promise<void>;
	// removeFriendship(userId: number, friendId: number): Promise<void>;

	// listFriends(userId: number): Promise<Friend[]>;
	// listPendingRequests(userId: number): Promise<FriendRequest[]>;

	// areFriends(userId: number, friendId: number): Promise<boolean>;
}