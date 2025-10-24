import redis from "../clients/RedisClient"
import { Session } from "../services/PresenceService";


export class presenceRepository {

    async getOnlineUsers(): Promise<number[]> {
        const userIds = await redis.smembers('presence:online_users'); // returns string[]
        return userIds.map(id => Number(id));
    }

    async addUserSession(session: Session) {
        redis.sadd(`presence:user:${session.userId}:sessions`, session.sessionId);
        redis.hset(`presence:session:${session.sessionId}`,
            {
                userId: session.userId,
                connectedAt: Date.now(),
                lastHeartbeat: Date.now(),
        });
        redis.sadd(`presence:online_users`, session.userId);
    }

    async heartbeat(session: Session) {

    }

}

