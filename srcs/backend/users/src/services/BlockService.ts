import { BlockRepository } from '../repositories';
import { FriendRepository } from '../repositories';

export class BlockService {
	constructor(
		private blockRepository: BlockRepository,
		private friendRepository: FriendRepository) {}

	public async getBlockedUsers(userId: number) {
		console.log("[INFO] SERVICE - getBlockedUsers 0");
		return this.blockRepository.listBlockedUsers(userId);
	}

	public async blockUser(userId: number, targetUserId: number) {
		// add block line
		this.blockRepository.blockUser(userId, targetUserId);
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
