import { SocketStream } from "@fastify/websocket";
import { presenceService } from '../services/PresenceService';
import { ErrorCode, WsErrorData } from '../errors';
import { RawData } from 'ws';
import { SessionSocketStream } from '../types';

class PresenceController {

  public async accept(connection: SocketStream) {
    console.log('🔌 New WebSocket connection accepted');
    const sessionConnection = connection as SessionSocketStream;
    
    // Add raw socket listeners to debug
    sessionConnection.socket.on('message', (data) => {
      console.log('🔍 RAW message received:', data.toString());
    });
    
    // sessionConnection.socket.once("message", (raw: RawData) => this.checkin(raw, sessionConnection));
    // sessionConnection.socket.on("message", (raw: RawData) => this.messageHandler(raw, sessionConnection));
    sessionConnection.socket.on("close", () => this.disconnectionHandler(sessionConnection));
    sessionConnection.socket.on("error", (error) => this.errorHandler(error, sessionConnection));
    console.log('✅ WebSocket event handlers registered');
  }
    
  private async checkin(raw: RawData, connection: SessionSocketStream) {
    console.log('📥 Checkin message received:', raw.toString());
    try {
      const msg = JSON.parse(raw.toString());
      await presenceService.checkin(msg.data, connection);
    } catch(err) {
      console.log('❌ Checkin error:', err);
      this.errorHandler(err, connection);
    }
  }

  private async messageHandler(raw: RawData, connection: SessionSocketStream) {
    try {
      const msg = JSON.parse(raw.toString());

      if (msg.type === "pong") {
        await presenceService.heartbeat(connection);
      } else {
        throw new Error(ErrorCode.INVALID_MESSAGE_TYPE);
      }
    } catch(err) {
      this.errorHandler(err, connection);
    }
  }

  private async disconnectionHandler(connection: SessionSocketStream) {
    try {
      await presenceService.disconnect(connection);
    } catch(err) {
      this.errorHandler(err, connection);
    }
  }
 
  private errorHandler(error: any, connection: SessionSocketStream) {
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
    
    // Only try to close if socket is still open
    if (connection.socket.readyState === 1) { // 1 = OPEN
      connection.socket.close(data.status, data.reason);
    }
  }
}

export const presenceController = new PresenceController();