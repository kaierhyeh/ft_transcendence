import redis from "../clients/RedisClient"
import { User } from "../clients/UsersClient";
import { Session } from "../services/PresenceService";

class PresenceRepository {

    async getOnlineUsers(): Promise<number[]> {
        const userIds = await redis.smembers('presence:online_users'); // returns string[]
        return userIds.map(id => Number(id));
    }

    async getFriendStatus(userId: number): Promise<{ online: number[], offline: number[] }> {
        const onlineIds = await redis.sinter(`presence:online_users`, `presence:user:${userId}:friends`);
        const offlineIds = await redis.sdiff(`presence:user:${userId}:friends`, `presence:online_users`);
        return {
            online: onlineIds.map(id => Number(id)),
            offline: offlineIds.map(id => Number(id)),
        };
    }

    async setFriends(userId: number, friendList: User[]) {
        const friendIds = friendList.map(friend => friend.user_id);
        if (friendIds.length > 0) {
            await redis.del(`presence:user:${userId}:friends`);
            await redis.sadd(`presence:user:${userId}:friends`, ...friendIds.map(id => id.toString()));
        }
    }

    async getFriends(userId: number): Promise<number[]> {
        const friendIds = await redis.smembers(`presence:user:${userId}:friends`);
        return friendIds.map(id => Number(id));
    }

    async addUserSession(session: Session): Promise<boolean> {
        await redis.sadd(`presence:user:${session.userId}:sessions`, session.sessionId);
        await redis.hset(`presence:session:${session.sessionId}`,
            {
                userId: session.userId,
                connectedAt: Date.now(),
                lastHeartbeat: Date.now(),
        });
        const alreadyOnline = await redis.sismember(`presence:online_users`, session.userId);
        if (!alreadyOnline) {
            await redis.sadd(`presence:online_users`, session.userId);
            return true; // status changed to online
        }
        return false; // user was already online
    }

    async heartbeat(session: Session) {
        await redis.hset(`presence:session:${session.sessionId}`,
            { lastHeartbeat: Date.now() },
        );
    }

    async removeUserSession(session: Session): Promise<number> {
        await redis.srem(`presence:user:${session.userId}:sessions`, session.sessionId);
        await redis.del(`presence:session:${session.sessionId}`);
        const nbSessions = await redis.scard(`presence:user:${session.userId}:sessions`);
        if (nbSessions === 0) {
            await redis.srem(`presence:online_users`, session.userId);
            await redis.del(`presence:user:${session.userId}:sessions`);
            await redis.del(`presence:user:${session.userId}:friends`);
        }
        return nbSessions;
    }

    async getUserSessions(userId: number): Promise<number[]> {
        const sessionIds = await redis.smembers(`presence:user:${userId}:sessions`);
        return sessionIds.map(id => Number(id));
    }

    async getSessionLastHeartbeat(sessionId: number): Promise<number> {
        const lastHeatbeat = await redis.hget(`presence:session:${sessionId}`, "lastHeartbeat");
        return Number(lastHeatbeat);
    }

}

export const presenceRepository = new PresenceRepository();