import redis from "../clients/RedisClient"
import { Session } from "../services/PresenceService";

class PresenceRepository {

    async getOnlineUsers(): Promise<number[]> {
        const userIds = await redis.smembers('presence:online_users'); // returns string[]
        return userIds.map(id => Number(id));
    }

    async addUserSession(session: Session) {
        await redis.sadd(`presence:user:${session.userId}:sessions`, session.sessionId);
        await redis.hset(`presence:session:${session.sessionId}`,
            {
                userId: session.userId,
                connectedAt: Date.now(),
                lastHeartbeat: Date.now(),
        });
        await redis.sadd(`presence:online_users`, session.userId);
    }

    async heartbeat(session: Session) {
        await redis.hset(`presence:session:${session.sessionId}`,
            { lastHeartbeat: Date.now() },
        );
    }

    async removeUserSession(session: Session) {
        await redis.srem(`presence:user:${session.userId}:sessions`, session.sessionId);
        await redis.del(`presence:session:${session.sessionId}`);
        const nbSessions = await redis.scard(`presence:user:${session.userId}:sessions`);
        if (nbSessions === 0) {
            await redis.srem(`presence:online_users`, session.userId);
            await redis.del(`presence:user:${session.userId}:sessions`);
        }
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