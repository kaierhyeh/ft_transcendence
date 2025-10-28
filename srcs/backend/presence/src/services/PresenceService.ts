import { presenceRepository } from '../repository/presenceRepository';
import { FriendsMessage, FriendStatusChangeMessage, UserStatus } from '../types';
import { usersClient } from "../clients/UsersClient"
import { SocketStream } from '@fastify/websocket';
import { subscriber } from '../clients/RedisClient';

let nextId = 1;
const INACTIVE_SESSION_TIMEOUT = 90_000; // [ms] (90s)
const PING_INTERVAL = 30_000; // [ms] (30s)
const CLEANUP_INTERVAL = 60_000; // [ms] (60s)


export interface Session {
  sessionId: number;
  userId: number;
  connection: SocketStream;
}


type SessionMap = Map<number, Session>;

class PresenceService {
  private sessions: SessionMap;
  
  constructor() {
    this.sessions = new Map();

    setInterval(async () => await this.cleanupInactiveSessions(), CLEANUP_INTERVAL);
    setInterval(() => this.sendPing(), PING_INTERVAL);
    
    // Subscribe to friendship events from user service
    this.subscribeFriendshipEvents();
  }

  // PresenceService.ts
  async checkin(userId: number, connection: SocketStream) {
    console.log(`✅ User ${userId} checked in successfully`);

    const sessionId = this.registerConnection(connection, userId);

    const session = this.sessions.get(sessionId);
    if (!session) throw new Error("Internal error: Session not found after registration");
    
    // add user session
    const statusChanged = await presenceRepository.addUserSession(session);

    // Populate friends list from user service
    const friendList = await usersClient.getFriends(userId);
    await presenceRepository.setFriends(userId, friendList);

    // send initial friend list
    await this.sendFriendsPresence(session);
    
    // broadcast update to connected user if the new user has no session already
    if (statusChanged) await this.broadcastUpdate({ userId, status: "online" });
}

  async heartbeat(connection: SocketStream) {
    const sessionId = (connection as any).sessionId;
    if (!sessionId) throw new Error("Internal error: [heartbeat] Missing session ID in connection");
    const session = this.sessions.get(sessionId);
    if (!session) throw new Error("Internal error: Session not found for heartbeat");
    await presenceRepository.heartbeat(session);
  }

  async sendFriendsPresence(session: Session) {
    // retrieve online friends
    const friendStatus = await this.getFriendStatus(session.userId);
    
    const msg: FriendsMessage = {
      type: "friends",
      data: { friends: friendStatus },
    };
    session.connection.socket.send(JSON.stringify(msg));
  }

  private async getFriendStatus(userId: number): Promise<UserStatus[]> {
    const friends = await presenceRepository.getFriendStatus(userId);
    const onlineFriends = friends.online.map(id => ({userId: id, status: "online"} as UserStatus));
    const offlineFriends = friends.offline.map(id => ({userId: id, status: "offline"} as UserStatus));
    return [...onlineFriends, ...offlineFriends]; // array concat
  }

  private async  broadcastUpdate(userStatus: UserStatus) {
    const msg: FriendStatusChangeMessage = {
      type: "friend_status_change",
      data: userStatus,
    };

    // Broadcast to all sessions whose users have the affected user as a friend
    const broadcastPromises: Promise<void>[] = [];
    
    for (const session of this.sessions.values()) {
      broadcastPromises.push(
        (async () => {
          try {
            const friends = await presenceRepository.getFriends(session.userId);
            if (friends.includes(userStatus.userId)) {
              session.connection.socket.send(JSON.stringify(msg));
            }
          } catch (err) {
            console.log('❌ Error broadcasting presence update:', err);
          }
        })()
      );
    }

    await Promise.all(broadcastPromises);
  }

  /**
   * Subscribe to Redis pub/sub events from user service
   */
  private subscribeFriendshipEvents() {
    // Subscribe to friendship_added channel
    subscriber.subscribe('friendship_added', (err) => {
      if (err) {
        console.error('❌ Failed to subscribe to friendship_added:', err);
      } else {
        console.log('✅ Subscribed to friendship_added channel');
      }
    });

    // Subscribe to friendship_removed channel
    subscriber.subscribe('friendship_removed', (err) => {
      if (err) {
        console.error('❌ Failed to subscribe to friendship_removed:', err);
      } else {
        console.log('✅ Subscribed to friendship_removed channel');
      }
    });

    // Handle incoming messages
    subscriber.on('message', async (channel, message) => {
      try {
        const data = JSON.parse(message);
        
        if (channel === 'friendship_added') {
          await this.handleFriendshipAdded(data.userId1, data.userId2);
        } else if (channel === 'friendship_removed') {
          await this.handleFriendshipRemoved(data.userId1, data.userId2);
        }
      } catch (err) {
        console.error('❌ Error handling pub/sub message:', err);
      }
    });
  }

  /**
   * Handle friendship_added event
   */
  private async handleFriendshipAdded(userId1: number, userId2: number) {
    console.log(`🤝 Friendship added: ${userId1} <-> ${userId2}`);
    
    // Check if users are online and notify them
    const user1Online = await presenceRepository.isUserOnline(userId1);
    const user2Online = await presenceRepository.isUserOnline(userId2);
    
    if (user1Online) {
      // Notify user1 about user2's status
      const sessions = this.getSessionsByUserId(userId1);
      const status: UserStatus = {
        userId: userId2,
        status: user2Online ? 'online' : 'offline'
      };
      sessions.forEach(session => {
        session.connection.socket.send(JSON.stringify({
          type: 'friend_status_change',
          data: status
        }));
      });
    }
    
    if (user2Online) {
      // Notify user2 about user1's status
      const sessions = this.getSessionsByUserId(userId2);
      const status: UserStatus = {
        userId: userId1,
        status: user1Online ? 'online' : 'offline'
      };
      sessions.forEach(session => {
        session.connection.socket.send(JSON.stringify({
          type: 'friend_status_change',
          data: status
        }));
      });
    }
  }

  /**
   * Handle friendship_removed event
   */
  private async handleFriendshipRemoved(userId1: number, userId2: number) {
    console.log(`💔 Friendship removed: ${userId1} <-> ${userId2}`);
    
    // Send "unknown" status to both users if online
    const user1Sessions = this.getSessionsByUserId(userId1);
    const user2Sessions = this.getSessionsByUserId(userId2);
    
    user1Sessions.forEach(session => {
      session.connection.socket.send(JSON.stringify({
        type: 'friend_status_change',
        data: { userId: userId2, status: 'unknown' }
      }));
    });
    
    user2Sessions.forEach(session => {
      session.connection.socket.send(JSON.stringify({
        type: 'friend_status_change',
        data: { userId: userId1, status: 'unknown' }
      }));
    });
  }

  /**
   * Get all sessions for a specific user
   */
  private getSessionsByUserId(userId: number): Session[] {
    const sessions: Session[] = [];
    for (const session of this.sessions.values()) {
      if (session.userId === userId) {
        sessions.push(session);
      }
    }
    return sessions;
  }

  async disconnect(connection: SocketStream) {
    const sessionId = (connection as any).sessionId;
    if (!sessionId) throw new Error("Internal error: [disconnect] Missing session ID in connection");
    const session = this.sessions.get(sessionId);
    if (!session) throw new Error("Internal error: Session not found for disconnection");
    
    // remove user session
    const nbSessions = await presenceRepository.removeUserSession(session);
    
    // broadcast update to subscribers if the user has no more sessions
    if (nbSessions === 0) {
      await this.broadcastUpdate({userId: session.userId, status: "offline"});
      
      // Clean up friends list (user service owns it, but we clean when user goes offline)
      await presenceRepository.deleteFriends(session.userId);
    }
    
    this.sessions.delete(sessionId);
    delete (connection as any).sessionId;
  }

  private registerConnection(connection: SocketStream, userId: number): number {
    const sessionId = nextId++;
    (connection as any).sessionId = sessionId;
    this.sessions.set(sessionId, {sessionId, userId, connection});
    return sessionId;
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
            const session = this.sessions.get(sessionId);
            if (session) {
              await presenceRepository.removeUserSession(session);
              this.sessions.delete(sessionId);
            }
          }
        }
      }
    } catch(err) {
      console.log('❌ Error during cleanupInactiveSessions:', err);
    }
  }

  private sendPing() {
    for (const [sessionId, session] of this.sessions.entries()) {
      try {
        session.connection.socket.send(JSON.stringify({ type: "ping" }));
      } catch (err) {
        console.log('❌ Error sending ping:', err);
      }
    }
  }

}

export const presenceService = new PresenceService();