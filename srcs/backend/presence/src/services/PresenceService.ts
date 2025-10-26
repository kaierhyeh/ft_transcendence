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
const FRIENDS_RETRIEVAL_INTERVAL = 60_000; // [ms] (30s)


export interface Session {
  sessionId: number;
  userId: number;
}

interface UserStatus {
  userId: number;
  status: "online" | "offline"; // maybe add "unknown" for the edge case where a friendship while both are connected
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
    setInterval(() => this.getFriendLists(), FRIENDS_RETRIEVAL_INTERVAL);

  }

  async checkin(data: any, connection: SocketStream) {

    const token: string = data.accessToken;
    if (!token) throw new Error(ErrorCode.MISSING_TOKEN);

    const result = await jwtVerifier.verifyUserSessionToken(token);
    const userId = toInteger(result.sub);

    this.registerConection(connection, userId);

    const session = this.sessions.get(connection);
    if (!session) throw new Error(ErrorCode.INTERNAL_ERROR);
    // add user session
    // const changes = await presenceRepository.addUserSession(session); // changes = 1 or 0
    await presenceRepository.addUserSession(session);

    // save friend lists into redis
    // await presenceRepository.setFriends(userId);
    
    // broadcast update to subscribers if the new user has no session already
    // if (changes) broadcastUpdate({ userId, "online" });

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
    // const onlineFriends = ...
    
    // const msg: Message = {
    //   type: "friends",
    //   data: { friends: onlineFriends },
    // };

    // connection.socket.send(JSON.stringify(msg));
  }

  private async broadcastUpdate(userStatus: UserStatus) {
    // iterate over subscribers
    // --> for each subscribers
    //     --> check if the userId is within the subscribers friendlist
    //     --> if it is, send the user status update
  }

  async disconnect(connection: SocketStream) {
    const session = this.sessions.get(connection);
    if (!session) throw new Error(ErrorCode.INTERNAL_ERROR);
    // remove user session
    // const nbSessions = await presenceRepository.removeUserSession(session);
    presenceRepository.removeUserSession(session);
    this.subscribers.delete(session.sessionId);
    // broadcast update to subscribers if the new user has not no more sessions
    // if (nbSessions === 0) broadcastUpdate({userId: session.userId, "offline"});
    this.sessions.delete(connection);
  }

  // TODO - to remove or refactor
  // private async getOnlineFriends(token: string): Promise<UserStatus[]> {
  //   // retrieve list of friends from UserClients
  //   const friendList =  await usersClient.getFriends(token);
    
  //   // retrieve online users from presenceRepository
  //   const onlineUserIds = await presenceRepository.getOnlineUsers();
    
  //   // retrieve friends' presence status
  //   const onlineFriends: UserStatus[] = [];
  //   for (const friend of friendList) {
  //     if (onlineUserIds.includes(friend.user_id)) {
  //       onlineFriends.push({ userId: friend.user_id, status: "online" });
  //     } else {
  //       onlineFriends.push({ userId: friend.user_id, status: "offline" });
  //     }
  //   }
  //   return onlineFriends;
  // }

  private async getFriendLists() {
    
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