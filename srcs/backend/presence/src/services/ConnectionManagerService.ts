import { SocketStream } from "@fastify/websocket";

let nextId = 1;

export interface Session {
    sessionId: number;
    userId: number;
    connection: SocketStream;
}

export type SessionMap = Map<SocketStream, Session>;

export class ConnectionManager {
    private sessions: SessionMap;
    
    constructor() {
        this.sessions = new Map();
    }

    add(connection: SocketStream, userId: number) {
        const sessionId = nextId++;
        this.sessions.set(connection, {sessionId, userId, connection});
    }
}


// Export singleton instance
export const connectionManager = new ConnectionManager();