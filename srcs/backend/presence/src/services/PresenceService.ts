import { SocketStream } from '@fastify/websocket';
import { CONFIG } from '../config';
import { presenceRepository } from '../repository/presenceRepository';
import { AppError } from '../errors/AppError';
import { jwtVerifier } from './JwtVerifierService';
import { connectionManager } from './ConnectionManagerService';
import { toInteger } from '../utils/type-converters';
import { PresenceMessage } from '../types';
import { UsersClient } from "../clients/UsersClient"


export class PresenceService {
  private presenceRepository: presenceRepository;
  private usersClient: UsersClient;


  constructor() {
    this.presenceRepository = new presenceRepository();
    this.usersClient = new UsersClient();
  }

  async checkin(data: any, connection: SocketStream) {

    const token: string = data.accessToken;
    if (!token) throw new AppError(4000, "Missing access token");

    // WARN - the jwtVerifier should throw an error with a code
    const result = await jwtVerifier.verifyUserSessionToken(token);
    const userId = toInteger(result.sub);

    connectionManager.add(connection, userId);

    await this.presenceRepository.setUserOnline(connection);

    // retrieve list of friends from UserClients
    const friendList =  {};

    // retrieve connected friends from redis repository
    const onlineFriends = await this.presenceRepository.getOnlineFriends(friendList);

    const msg: PresenceMessage = {
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

}