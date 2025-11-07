// PresenceController.ts
import { SocketStream } from "@fastify/websocket";
import { presenceService } from '../services/PresenceService';
import { ErrorCode, WsErrorData } from '../errors';
import { RawData } from 'ws';

class PresenceController {
    public accept(connection: SocketStream, userId: number) {
        console.log(`🔌 New WebSocket connection accepted for user ${userId}`);
              
        
        connection.socket.on("message", async (raw: RawData) => {
          // console.log('📨 Message received from user', userId);
          await this.messageHandler(raw, connection, userId)
        }
        );
        
        connection.socket.on("close", async (code: number, reason: Buffer) => {
            console.log('🔌 Socket close event fired:', {
                code,
                reason: reason.toString(),
                hadSessionId: !!(connection as any).sessionId
            });
            await this.disconnectionHandler(connection);
        });
        
        connection.socket.on("error", (error) => {
            console.log('❌ Socket error event fired:', error);
            this.errorHandler(error, connection);
        });
        
        console.log('✅ WebSocket event handlers registered');
        
        // Send ready message to client so it knows it can start sending messages
        try {
            connection.socket.send(JSON.stringify({ type: "ready" }));
            console.log('📤 Ready message sent to client');
        } catch (error) {
            console.error('❌ Failed to send ready message:', error);
        }
    }

    private async checkin(raw: RawData, connection: SocketStream, userId: number) {
        console.log('📥 Checkin message received:', raw.toString());
        try {
          if ((connection as any).sessionId) return;
            // User is already authenticated, just register the session
            await presenceService.checkin(userId, connection);
        } catch(err) {
            console.log('❌ Checkin error:', err);
            this.errorHandler(err, connection);
        }
    }

  private async messageHandler(raw: RawData, connection: SocketStream, userId: number) {
    try {
      const msg = JSON.parse(raw.toString());

      if (msg.type === "checkin") {
        await this.checkin(raw, connection, userId);
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
      // Only disconnect if the connection was checked in (has a sessionId)
      if (!(connection as any).sessionId) {
        console.log('⚠️ Connection closed before checkin completed');
        return;
      }
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
    
    // Only try to close if socket is still open
    if (connection.socket.readyState === 1) { // 1 = OPEN
      connection.socket.close(data.status, data.reason);
    }
  }
}

export const presenceController = new PresenceController();