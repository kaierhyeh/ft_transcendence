import { GameParticipant, MatchmakingMode, MatchmakingResponse } from '../schemas/index.js';
import { LiveSessionManager } from './LiveSessionManager.js';
import { SocketStream } from "@fastify/websocket";
interface QueueEntry {
    participant: GameParticipant;
}
export declare class MatchmakingManager {
    queues: Map<MatchmakingMode, QueueEntry[]>;
    sessionManager: LiveSessionManager;
    waitingConnections: Map<string, SocketStream>;
    constructor(sessionManager: LiveSessionManager);
    joinQueue(participant: GameParticipant, mode: MatchmakingMode): MatchmakingResponse;
    createGameFromQueue(mode: MatchmakingMode): MatchmakingResponse;
    isPlayerAlreadyInQueue(participantId: string): boolean;
    getQueueStatus(mode: MatchmakingMode): MatchmakingResponse;
    saveWebSocket(participantId: string, ws: SocketStream): void;
    removeWebSocket(participantId: string): void;
}
export {};
//# sourceMappingURL=remoteMatchmaking.d.ts.map