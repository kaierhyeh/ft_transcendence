import { SocketStream } from '@fastify/websocket';
import { presenceRepository } from '../repository/presenceRepository';
import { jwtVerifier } from './JwtVerifierService';
import { toInteger } from '../utils';
import { Message } from '../types';
import { User, UsersClient } from "../clients/UsersClient"
import { ErrorCode } from '../errors';

let nextId = 1;

export interface Session {
    sessionId: number;
    userId: number;
    connection: SocketStream;
}

interface OnlineUser {
  userId: number;
  status: "online" | "offline";
}

type SessionMap = Map<SocketStream, Session>;


class PresenceService {
  private presenceRepository: presenceRepository;
  private usersClient: UsersClient;
  private sessions: SessionMap;
  private subscribers: Set<number>;
  


  constructor() {
    this.presenceRepository = new presenceRepository();
    this.usersClient = new UsersClient();
    this.sessions = new Map();
    this.subscribers = new Set();
  }

  async checkin(data: any, connection: SocketStream) {

    const token: string = data.accessToken;
    if (!token) throw new Error(ErrorCode.MISSING_TOKEN);

    const result = await jwtVerifier.verifyUserSessionToken(token);
    const userId = toInteger(result.sub);

    this.registerConection(connection, userId);

    const session = this.sessions.get(connection);
    if (!session) throw new Error(ErrorCode.INTERNAL_ERROR);
    await this.presenceRepository.addUserSession(session);

    // retrieve list of friends from UserClients
    const friendList =  await this.usersClient.getFriends(token);

    // retrieve connected friends from redis repository
    const onlineFriends = await this.getOnlineFriends(connection, friendList);

    const msg: Message = {
      type: "friends",
      data: { friends: onlineFriends },
    };

    connection.socket.send(JSON.stringify(msg));

  }

  async heartbeat(connection: SocketStream) {
    const session = this.sessions.get(connection);
    if (!session) throw new Error(ErrorCode.INTERNAL_ERROR);
    this.presenceRepository.heartbeat(session);
  }

  async subscribeFriendsPresence(connection: SocketStream) {
    const session = this.sessions.get(connection);
    if (!session) throw new Error(ErrorCode.INTERNAL_ERROR);
    this.subscribers.add(session.sessionId);
  }

  async broadcastUpdate() {
    
  }

  async disconnect(connection: SocketStream) {

  }

  private async getOnlineFriends(connection: SocketStream, friendsList: User[]): Promise<OnlineUser[]> {
    const onlineFriends: OnlineUser[] = [];
    const onlineUserIds = await this.presenceRepository.getOnlineUsers();
    
    for (const friend of friendsList) {
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
    this.sessions.set(connection, {sessionId, userId, connection});
  }

}


export const presenceService = new PresenceService();