import { FriendRepository } from '../repositories';

export class FriendService {
	constructor(private friendRepository: FriendRepository) {}

	public async getFriends(userId: number) {
		// return friends data (id, nickname, avatar_url, isOnline....) status="accepted"
		// if no friends, return empty array

		return this.friendRepository.listFriends(userId);
	}

	public async getPendingRequests(userId: number) {
		// get both incoming and outgoing requests status="pending"
		// if no requests, return empty array

		return this.friendRepository.listPendingRequests(userId);
	}

	public async sendFriendRequest(fromUserId: number, toUserId: number) {
		// if toUser exist
		// if request not exist
		// insert into friends values (fromUserId, toUserId, 'pending')

		return this.friendRepository.sendFriendRequest(fromUserId, toUserId);
	}

	public async cancelFriendRequest(fromUserId: number, toUserId: number) {
		// if request exist and status="pending"
		// delete line from friends table

		return this.friendRepository.cancelFriendRequest(fromUserId, toUserId);
	}

	public async acceptFriendRequest(userId: number, friendId: number) {
		// if request exist and status="pending"
		// change status to "accepted"

		return this.friendRepository.acceptFriendRequest(userId, friendId);
	}

	public async declineFriendRequest(userId: number, friendId: number) {
		// if request exist and status="pending"
		// delete line from friends table

		return this.friendRepository.declineFriendRequest(userId, friendId);
	}

	public async removeFriendship(userId: number, friendId: number) {
		// if request exist and status="accepted"
		// delete line from friends table

		return this.friendRepository.removeFriendship(userId, friendId);
	}

}