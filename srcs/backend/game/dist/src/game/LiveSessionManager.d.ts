import { SocketStream } from "@fastify/websocket";
import { GameParticipant, GameType } from "../schemas";
import { GameConf } from "./GameEngine";
import { FastifyBaseLogger } from "fastify";
import { SessionRepository } from "../db/repositories/SessionRepository";
export declare class LiveSessionManager {
    private game_sessions;
    private logger;
    private session_repo;
    constructor(session_repo: SessionRepository, logger: FastifyBaseLogger);
    createGameSession(type: GameType, participants: GameParticipant[]): number;
    getGameSessionConf(id: number): GameConf | undefined;
    connectToGameSession(id: number, connection: SocketStream): void;
    private saveSession;
    private terminateSession_;
    update(): void;
}
//# sourceMappingURL=LiveSessionManager.d.ts.map