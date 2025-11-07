import { BlockRepository } from '../repositories';
import { FriendRepository } from '../repositories';
import { friendshipEventService } from './FriendshipEventService';

export class BlockService {
	constructor(
		private blockRepository: BlockRepository,
		private friendRepository: FriendRepository) {}

	public async getBlockedUsers(userId: number) {
		console.log("[INFO] SERVICE - getBlockedUsers 0");
		return this.blockRepository.listBlockedUsers(userId);
	}

	public async blockUser(userId: number, targetUserId: number) {
		// Update database (removes friendship + adds block in transaction)
		await this.blockRepository.blockUser(userId, targetUserId);
		
		// Publish event to Redis (cache + pub/sub)
		// Blocking someone removes them from your friends list
		await friendshipEventService.publishFriendshipRemoved(userId, targetUserId);
	}

	public async unblockUser(userId: number, targetUserId: number) {
		this.blockRepository.unblockUser(userId, targetUserId);
	}

	// check is there is block between two users
	// direction doesn't matter
	public async isBlocked(userId: number, targetUserId: number) {
		return this.friendRepository.isStatusExists(userId, targetUserId, 'blocked');
	}

}
