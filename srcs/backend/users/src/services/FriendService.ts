import { FriendRepository } from '../repositories';
import { friendshipEventService } from './FriendshipEventService';

export class FriendService {
	constructor(private friendRepository: FriendRepository) {}

	// if no users, return empty array
	public async getAllUsers(userId: number | null) {
		if (userId === null) {
			return this.friendRepository.listAllUsers();
		} else {
			return this.friendRepository.listAllUsersExcept(userId);
		}
	}

	public async getUserById(thisUserId: number | null, targetUserId: number) {
		if (thisUserId === null) {
			return this.friendRepository.getUserById(1, targetUserId);
		} else {
			return this.friendRepository.getUserByIdForUser(thisUserId, targetUserId);
		}
	}

	// if no friends, return empty array
	// user(id, nickname, isOnline)
	public async getFriends(userId: number) {
		return this.friendRepository.listFriends(userId);
	}

	// Get friends for multiple users at once (for presence service)
	// Returns array of { user_id, friends: User[] }
	public async getFriendsBatch(userIds: number[]) {
		const friendLists = await Promise.all(
			userIds.map(async (userId) => ({
				user_id: userId,
				friends: await this.friendRepository.listFriends(userId)
			}))
		);
		return friendLists;
	}

	// if no requests TO userId, return empty array
	// requestIn(fromUserId, nickname)
	public async getPendingIncomingRequests(userId: number) {
		return this.friendRepository.listPendingIncomingRequests(userId);
	}

	// if no requests FROM userId, returns empty array
	// requestOut(toUserId, nickname)
	public async getPendingOutgoingRequests(userId: number) {
		return this.friendRepository.listPendingOutgoingRequests(userId);
	}

	public async sendFriendRequest(fromUserId: number, toUserId: number) {

		// Better to check that toUser exist
		// but toUserId going from front MENU USERS section

		this.friendRepository.sendFriendRequest(fromUserId, toUserId);
	}

	public async cancelFriendRequest(fromUserId: number, toUserId: number) {
		this.friendRepository.cancelFriendRequest(fromUserId, toUserId);
	}

	public async acceptFriendRequest(userId: number, friendId: number) {
		// Update database
		await this.friendRepository.acceptFriendRequest(userId, friendId);
		
		// Publish event to Redis (cache + pub/sub)
		await friendshipEventService.publishFriendshipAdded(userId, friendId);
	}

	public async declineFriendRequest(userId: number, friendId: number) {
		this.friendRepository.declineFriendRequest(userId, friendId);
	}

	public async removeFriendship(userId: number, friendId: number) {
		// Update database
		await this.friendRepository.removeFriendship(userId, friendId);
		
		// Publish event to Redis (cache + pub/sub)
		await friendshipEventService.publishFriendshipRemoved(userId, friendId);
	}

	public async getUsersByIds(thisUserId: number, userIds: number[]) {
		const res = await this.friendRepository.getUsersByIds(thisUserId, userIds);

		return res.map((u) => {
			if (u.friendship_status === null || u.friendship_status === "pending") {
				return {
					...u,
					friendship_status: null,
					from_id: null,
					to_id: null,
				};
			}
			return u;
		});
	}

	public async getFriendshipStatus(userId: number, friendId: number) {
		return this.friendRepository.getFriendshipStatus(userId, friendId);
	}
}
