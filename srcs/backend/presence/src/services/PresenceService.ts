import { SocketStream } from '@fastify/websocket';
import { CONFIG } from '../config';
import { presenceRepository } from '../repository/presenceRepository';
import { AppError } from '../errors/AppError';
import { jwtVerifier } from './JwtVerifierService';
import { toInteger } from '../utils';
import { Message } from '../types';
import { UsersClient } from "../clients/UsersClient"

let nextId = 1;

interface Session {
    sessionId: number;
    userId: number;
    connection: SocketStream;
}

type SessionMap = Map<SocketStream, Session>;


class PresenceService {
  private presenceRepository: presenceRepository;
  private usersClient: UsersClient;
  private sessions: SessionMap;
  


  constructor() {
    this.presenceRepository = new presenceRepository();
    this.usersClient = new UsersClient();
    this.sessions = new Map();
  }

  async checkin(data: any, connection: SocketStream) {

    const token: string = data.accessToken;
    if (!token) throw new AppError(4000, "Missing access token");

    const result = await jwtVerifier.verifyUserSessionToken(token);
    if (!result.success) throw new AppError(4001, "Invalid access token");
    const userId = toInteger(result.value.sub);

    this.registerConection(connection, userId);

    await this.presenceRepository.setUserOnline(connection);

    // retrieve list of friends from UserClients
    const friendList =  {};

    // retrieve connected friends from redis repository
    const onlineFriends = await this.presenceRepository.getOnlineFriends(friendList);

    const msg: Message = {
      type: "friends",
      data: { friends: onlineFriends },
    };

    connection.socket.send(JSON.stringify(msg));

  }

  async heartbeat(connection: SocketStream) {

  }

  async subscribeFriendsPresence(connection: SocketStream) {

  }

  async disconnect(connection: SocketStream) {

  }

  private registerConection(connection: SocketStream, userId: number) {
    const sessionId = nextId++;
    this.sessions.set(connection, {sessionId, userId, connection});
  }

}


export const presenceService = new PresenceService();