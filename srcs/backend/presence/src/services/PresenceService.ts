import { SocketStream } from '@fastify/websocket';
import { presenceRepository } from '../repository/presenceRepository';
import { jwtVerifier } from './JwtVerifierService';
import { toInteger } from '../utils';
import { Message } from '../types';
import { usersClient } from "../clients/UsersClient"
import { ErrorCode } from '../errors';

let nextId = 1;
const INACTIVE_SESSION_TIMEOUT = 90_000; // [ms] (90s)
const PING_INTERVAL = 30_000; // [ms] (30s)
const CLEANUP_INTERVAL = 60_000; // [ms] (60s)

export interface Session {
  sessionId: number;
  userId: number;
}

interface OnlineUser {
  userId: number;
  status: "online" | "offline";
}

type SessionMap = Map<SocketStream, Session>;

class PresenceService {
  private sessions: SessionMap;
  private subscribers: Set<number>;
  
  constructor() {
    this.sessions = new Map();
    this.subscribers = new Set();

    setInterval(() => this.cleanupInactiveSessions(), CLEANUP_INTERVAL);
    setInterval(() => this.sendPing(), PING_INTERVAL);
  }

  async checkin(data: any, connection: SocketStream) {

    const token: string = data.accessToken;
    if (!token) throw new Error(ErrorCode.MISSING_TOKEN);

    const result = await jwtVerifier.verifyUserSessionToken(token);
    const userId = toInteger(result.sub);

    this.registerConection(connection, userId);

    const session = this.sessions.get(connection);
    if (!session) throw new Error(ErrorCode.INTERNAL_ERROR);
    await presenceRepository.addUserSession(session);

    const onlineFriends = await this.getOnlineFriends(token);

    const msg: Message = {
      type: "friends",
      data: { friends: onlineFriends },
    };

    connection.socket.send(JSON.stringify(msg));

  }

  async heartbeat(connection: SocketStream) {
    const session = this.sessions.get(connection);
    if (!session) throw new Error(ErrorCode.INTERNAL_ERROR);
    presenceRepository.heartbeat(session);
  }

  async subscribeFriendsPresence(connection: SocketStream) {
    const session = this.sessions.get(connection);
    if (!session) throw new Error(ErrorCode.INTERNAL_ERROR);
    this.subscribers.add(session.sessionId);
  }

  async broadcastUpdate() {
    
  }

  async disconnect(connection: SocketStream) {
    const session = this.sessions.get(connection);
    if (!session) throw new Error(ErrorCode.INTERNAL_ERROR);
    presenceRepository.removeUserSession(session);
    this.subscribers.delete(session.sessionId);
    this.sessions.delete(connection);
  }

  private async getOnlineFriends(token: string): Promise<OnlineUser[]> {
    // retrieve list of friends from UserClients
    const friendList =  await usersClient.getFriends(token);
    
    // retrieve online users from presenceRepository
    const onlineUserIds = await presenceRepository.getOnlineUsers();
    
    // retrieve friends' presence status
    const onlineFriends: OnlineUser[] = [];
    for (const friend of friendList) {
      if (onlineUserIds.includes(friend.user_id)) {
        onlineFriends.push({ userId: friend.user_id, status: "online" });
      } else {
        onlineFriends.push({ userId: friend.user_id, status: "offline" });
      }
    }
    return onlineFriends;
  }

  private registerConection(connection: SocketStream, userId: number) {
    const sessionId = nextId++;
    this.sessions.set(connection, {sessionId, userId});
  }

  private async cleanupInactiveSessions() {
    try {
      const onlineUserIds = await presenceRepository.getOnlineUsers();
      for (const userId of onlineUserIds) {
        const sessionIds = await presenceRepository.getUserSessions(userId);
        for (const sessionId of sessionIds) {
          const lastHeartbeat = await presenceRepository.getSessionLastHeartbeat(sessionId);
          const now = Date.now();
          if (now - lastHeartbeat > INACTIVE_SESSION_TIMEOUT) {
            console.log(`🧹 Cleaning up inactive session ${sessionId} for user ${userId}`);
            await presenceRepository.removeUserSession({sessionId, userId});
          }
        }
      }
    } catch(err) {
      console.log('❌ Error during cleanupInactiveSessions:', err);
    }
  }

  private async sendPing() {
    for (const connection of this.sessions.keys()) {
      try {
        connection.socket.send(JSON.stringify({ type: "ping" }));
      } catch (err) {
        console.log('❌ Error sending ping:', err);
      }
    }
  }

}

export const presenceService = new PresenceService();