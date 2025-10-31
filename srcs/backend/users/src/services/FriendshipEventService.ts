import redis from '../clients/RedisClient';

/**
 * Utility service for publishing friendship-related events to Redis
 * Used by FriendService and BlockService to avoid code duplication
 * This is a horizontal concern (like logging), not a layer violation
 */
export class FriendshipEventService {
	/**
	 * Publish friendship_added event to Redis
	 * Updates cache and notifies subscribers (e.g., presence service)
	 */
	public async publishFriendshipAdded(userId: number, friendId: number): Promise<void> {
		try {
			await redis.sadd(`friends:${userId}`, friendId);
			await redis.sadd(`friends:${friendId}`, userId);
			
			await redis.publish('friendship_added', JSON.stringify({
				userId1: userId,
				userId2: friendId
			}));
		} catch (err) {
			console.error('Redis update failed for friendship_added:', err);
		}
	}

	/**
	 * Publish friendship_removed event to Redis
	 * Updates cache and notifies subscribers (e.g., presence service)
	 * Used when friendship is removed OR when user is blocked
	 */
	public async publishFriendshipRemoved(userId: number, friendId: number): Promise<void> {
		try {
			await redis.srem(`friends:${userId}`, friendId);
			await redis.srem(`friends:${friendId}`, userId);
			
			await redis.publish('friendship_removed', JSON.stringify({
				userId1: userId,
				userId2: friendId
			}));
		} catch (err) {
			console.error('Redis update failed for friendship_removed:', err);
		}
	}
}

// Export singleton instance
export const friendshipEventService = new FriendshipEventService();
