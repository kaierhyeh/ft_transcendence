import { SocketStream } from "@fastify/websocket";
import { GameCreationData } from "../schemas";
import { GameEndedMessage, GameSession } from "./GameSession";
import { GameConf } from "./GameEngine";
import { FastifyBaseLogger } from "fastify";
import { SessionRepository } from "../repositories/SessionRepository"
// import { toInteger } from "../utils/type-converters";
// import { verifyGameSessionJWT } from "../services/JwtVerifierService";

let next_id = 1;

export class LiveSessionManager {
    private game_sessions: Map<number, GameSession>;

    constructor(
        private session_repo: SessionRepository,
        private logger: FastifyBaseLogger) {
        this.game_sessions = new Map();
    }

    public createGameSession(data: GameCreationData): number {
        const game_id = next_id++;

        const new_game = new GameSession(data, this.logger);
        this.game_sessions.set(game_id, new_game);

        return game_id;
    }

    public getGameSessionConf(id: number): GameConf | undefined {
        return this.game_sessions.get(id)?.config;
    }

    public connectToGameSession(id: number, connection: SocketStream): void {
        const session = this.game_sessions.get(id);
        if (!session) {
            connection.socket.close(4004, "Game not found");
            return;
        }
        connection.socket.once("message", async (raw: string) => {
            let msg;

            try { 
                msg = JSON.parse(raw); 
            } catch(err) { 
                connection.socket.close(4002, "Invalid JSON"); 
                return;
            }

            if (msg.type === "view") {
                session.connectViewer(connection);
            } else if (msg.type === "join") {
                const ticket = msg.ticket as string | undefined;
                if (!ticket) { 
                    connection.socket.close(4001, "Missing ticket"); 
                    return; 
                }
                try {
                    session.connectPlayer(ticket, connection);
                } catch (err) {
                    this.logger.warn({ error: err instanceof Error ? err.message : String(err) }, "JWT verification failed");
                    connection.socket.close(4001, "Invalid or expired token");
                }
            } 
        });
    }

    private saveSession(game_id: number, session: GameSession): void {
        try {
            const dto = session.toDbRecord();
            if (dto) {
                this.session_repo.save(dto); // save in db with db plugin I guess, taking dto: DbSession as argument
                this.logger.info({ game_id: game_id }, "Game session saved");
            }
        } catch(err) {
            this.logger.warn({ game_id: game_id, error: err instanceof Error ? err.message : String(err) }, "Failed to save game session");
            return;
        }
    }

    private terminateSession_(id: number, session: GameSession): void {
        
        this.saveSession(id, session);
        let message: GameEndedMessage;
        if (session.disconnected_player) {
            message = {
                type: "game_ended",
                data: {
                    reason: "player_disconnected",
                    disconnected_player: session.disconnected_player
                }
            };
            session.closeAllConnections(4000, message);
        } else {
            message = {
                type: "game_ended",
                data: {
                    reason: "game_over",
                }
            };
            session.closeAllConnections(1001, message); 
        }
        this.game_sessions.delete(id);
    }

    public update(): void {
        for (const id of this.game_sessions.keys()) {
            const game = this.game_sessions.get(id);

            if (!game) continue;

            if (!game.started) {
                game.checkAndStart();
                continue;
            }

            game.tick();
            game.broadcastState();

            if (game.over)
                this.terminateSession_(id, game);
        }
    }

}