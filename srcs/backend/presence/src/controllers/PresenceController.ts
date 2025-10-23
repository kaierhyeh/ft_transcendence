import { FastifyRequest, FastifyReply } from 'fastify';
import { SocketStream } from "@fastify/websocket";
import { AppError } from '../errors/AppError';
import { presenceService } from '../services/PresenceService';

class PresenceController {

  public async accept(connection: SocketStream, request: FastifyRequest ) {
    connection.socket.once("message", this.checkin);
    connection.socket.on("message", this.messageHandler);
    connection.socket.on("close", this.disconnectionHandler);
    connection.socket.on("error", this.errorHandler)
  }
    
  private async checkin(raw: string, connection: SocketStream ) {
    try {
      const msg = JSON.parse(raw);
      await presenceService.checkin(msg.data, connection);
    } catch(err) {
      this.errorHandler(err, connection);
    }
  }

  private async messageHandler(raw: string, connection: SocketStream) {
    try {
      const msg = JSON.parse(raw);

      if (msg.type === "subscribe_friends") {
        await presenceService.subscribeFriendsPresence(connection);
      } else if (msg.type === "pong") {
        await presenceService.heartbeat(connection);
      } else {
        throw new AppError(4000, "Invalid Message Type");
      }

    } catch(err) {
      this.errorHandler(err, connection);
    }
  }

  private async disconnectionHandler(connection: SocketStream) {
    try {
      await presenceService.disconnect(connection);
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

export const presenceController = new PresenceController();