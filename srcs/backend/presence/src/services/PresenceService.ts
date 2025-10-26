import { SocketStream } from '@fastify/websocket';
import { presenceRepository } from '../repository/presenceRepository';
import { jwtVerifier } from './JwtVerifierService';
import { toInteger } from '../utils';
import { FriendsMessage, FriendStatusChangeMessage, UserStatus } from '../types';
import { usersClient } from "../clients/UsersClient"
import { ErrorCode } from '../errors';

let nextId = 1;
const INACTIVE_SESSION_TIMEOUT = 90_000; // [ms] (90s)
const PING_INTERVAL = 30_000; // [ms] (30s)
const CLEANUP_INTERVAL = 60_000; // [ms] (60s)
const FRIENDS_RETRIEVAL_INTERVAL = 60_000; // [ms] (60s)


export interface Session {
  sessionId: number;
  userId: number;
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
    // setInterval which periodically retrieve user friend lists
    setInterval(() => this.updateFriendLists(), FRIENDS_RETRIEVAL_INTERVAL);

  }

  async checkin(data: any, connection: SocketStream) {

    const token: string = data.accessToken;
    if (!token) throw new Error(ErrorCode.MISSING_TOKEN);

    const result = await jwtVerifier.verifyUserSessionToken(token);
    const userId = toInteger(result.sub);

    this.registerConnection(connection, userId);

    const session = this.sessions.get(connection);
    if (!session) throw new Error(ErrorCode.INTERNAL_ERROR);
    // add user session
    const statusChanged = await presenceRepository.addUserSession(session);

    // save friend lists into redis
    await this.setFriends(userId);
    
    // broadcast update to subscribers if the new user has no session already
    if (statusChanged) this.broadcastUpdate({ userId, status: "online" });

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

    // retrieve online friends
    const friendStatus = await this.getFriendStatus(session.sessionId);
    
    const msg: FriendsMessage = {
      type: "friends",
      data: { friends: friendStatus },
    };

    connection.socket.send(JSON.stringify(msg));
  }

  private async getFriendStatus(userId: number): Promise<UserStatus[]> {
    const friends = await presenceRepository.getFriendStatus(userId);
    const onlineFriends = friends.online.map(id => ({userId: id, status: "online"} as UserStatus));
    const offlineFriends = friends.offline.map(id => ({userId: id, status: "offline"} as UserStatus));
    return [...onlineFriends, ...offlineFriends]; // array concat
  }

  private async broadcastUpdate(userStatus: UserStatus) {
    const msg: FriendStatusChangeMessage = {
      type: "friend_status_change",
      data: userStatus,
    };

    for (const [connection, session] of this.sessions.entries()) {
      if (this.subscribers.has(session.sessionId)) {
        const friends = await presenceRepository.getFriends(session.userId);
        if (friends.includes(userStatus.userId)) {
          try {
            connection.socket.send(JSON.stringify(msg));
          } catch (err) {
            console.log('❌ Error broadcasting presence update:', err);
          }
        }
      }
    }
  }

  async disconnect(connection: SocketStream) {
    const session = this.sessions.get(connection);
    if (!session) throw new Error(ErrorCode.INTERNAL_ERROR);
    // remove user session
    const nbSessions = await presenceRepository.removeUserSession(session);
    this.subscribers.delete(session.sessionId);
    // broadcast update to subscribers if the user has no more sessions
    if (nbSessions === 0) this.broadcastUpdate({userId: session.userId, status: "offline"});
    this.sessions.delete(connection);
  }

  private async setFriends(userId: number) {
    const friendList =  await usersClient.getFriends(userId);
    await presenceRepository.setFriends(userId, friendList);
  }

  private async updateFriendLists() {
    const userList = await presenceRepository.getOnlineUsers();
    const friendLists = await usersClient.getFriendLists(userList);
    for (const friendList of friendLists) {
      await presenceRepository.setFriends(friendList.user_id, friendList.friends);
    }
  }

  private registerConnection(connection: SocketStream, userId: number) {
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