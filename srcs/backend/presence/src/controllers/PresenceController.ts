import { FastifyRequest, FastifyReply } from 'fastify';
import { PresenceService } from '../services/PresenceService';
import { SocketStream } from "@fastify/websocket";
import { AppError } from '../errors/AppError';

export class PresenceController {
  private presenceService: PresenceService;

  constructor() {
    this.presenceService = new PresenceService();
  }

  public async accept(connection: SocketStream, request: FastifyRequest ) {
    connection.socket.once("message", this.checkin);
    connection.socket.on("message", this.messageHandler);
    connection.socket.on("close", this.disconnectionHandler);
    connection.socket.on("error", this.errorHandler)
  }
    
  private async checkin(raw: string, connection: SocketStream ) {
    try {
      const msg = JSON.parse(raw);
      await this.presenceService.checkin(msg.data, connection);
    } catch(err) {
      this.errorHandler(err, connection);
    }
  }

  private async messageHandler(raw: string, connection: SocketStream) {
    try {
      const msg = JSON.parse(raw);

      if (msg.type === "subscribe_friends") {
        await this.presenceService.subscribeFriendsPresence(connection);
      } else if (msg.type === "pong") {
        await this.presenceService.heartbeat(connection);
      } else {
        throw new AppError(4000, "Invalid Message Type");
      }

    } catch(err) {
      this.errorHandler(err, connection);
    }
  }

  private async disconnectionHandler(connection: SocketStream) {
    try {
      await this.presenceService.disconnect(connection);
    } catch(err) {
      this.errorHandler(err, connection);
    }
  }
 
  private errorHandler(error: any, connection: SocketStream) {
    console.log('❌ Presence connection error:', {
      error: error instanceof Error ? error.message : 'Unknown error'
    });


  }
}