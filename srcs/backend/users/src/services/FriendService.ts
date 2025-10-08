import { FriendRepository } from '../repositories';

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

	// if no friends, return empty array
	// user(id, nickname, isOnline)
	public async getFriends(userId: number) {
		return this.friendRepository.listFriends(userId);
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
		this.friendRepository.acceptFriendRequest(userId, friendId);
	}

	public async declineFriendRequest(userId: number, friendId: number) {
		this.friendRepository.declineFriendRequest(userId, friendId);
	}

	public async removeFriendship(userId: number, friendId: number) {
		this.friendRepository.removeFriendship(userId, friendId);
	}

}
