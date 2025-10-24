import { FastifyRequest } from 'fastify';
import { SocketStream } from "@fastify/websocket";
import { presenceService } from '../services/PresenceService';
import { ErrorCode, WsErrorData } from '../errors';

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
        throw new Error(ErrorCode.INVALID_MESSAGE_TYPE);
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
      error: error?.message || String(error)
    });

    let data: WsErrorData;
    
    if (error instanceof SyntaxError) {
      data = {status: 4000, reason: "Invalid JSON format"};
    } else if (error?.message === ErrorCode.INVALID_MESSAGE_TYPE) {
      data = {status: 4000, reason: "Invalid message type"};
    }
    else if (error?.message === ErrorCode.MISSING_TOKEN) {
      data = {status: 4000, reason: "Missing access token"};
    }
    else if (error?.message === ErrorCode.INVALID_TOKEN) {
      data = {status: 4001, reason: "Invalid access token"};
    } else {
      data = {status: 4005, reason: "Internal server error"};
    }
    connection.socket.close(data.status, data.reason);
  }
}

export const presenceController = new PresenceController();