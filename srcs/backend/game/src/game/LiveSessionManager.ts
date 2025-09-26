import { SocketStream } from "@fastify/websocket";
import { GameParticipant, GameType } from "../schemas";
import { GameSession } from "./GameSession";
import { GameConf } from "./GameEngine";
import { FastifyBaseLogger } from "fastify";
import { SessionRepository } from "../repositories/SessionRepository"
import { verify } from "jsonwebtoken";
import fs from "fs";
import { CONFIG } from "../config";
import { JwtGameSessionPayload } from "../types";

let next_id = 1;

export class LiveSessionManager {
    private game_sessions: Map<number, GameSession>;
    private gamePublicKey: string;

    constructor(
        private session_repo: SessionRepository,
        private logger: FastifyBaseLogger) {
        this.game_sessions = new Map();
        // Load the game-specific public key for JWT verification
        this.gamePublicKey = fs.readFileSync(CONFIG.JWT.GAME_PUBLIC_KEY_PATH, 'utf8');
    }

    /**
     * Verify game session JWT token using the game-specific public key
     */
    private verifyGameSessionJWT(token: string): Promise<JwtGameSessionPayload> {
        return new Promise((resolve, reject) => {
            verify(token, this.gamePublicKey, {
                algorithms: [CONFIG.JWT.ALGORITHM as any],
                issuer: CONFIG.JWT.ISSUER,
                audience: CONFIG.JWT.AUDIENCE,
            }, (err: any, payload: any) => {
                if (err) {
                    reject(err);
                } else {
                    resolve(payload as JwtGameSessionPayload);
                }
            });
        });
    }

    public createGameSession(type: GameType, participants: GameParticipant[]): number {
        const game_id = next_id++;

        const new_game = new GameSession(type, participants, this.logger);
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
                    const payload = await this.verifyGameSessionJWT(ticket);
                    if (!payload.game_id || payload.game_id !== id) {
                        throw new Error("Game ID mismatch");
                    }
                    const player_id = payload.player_id;
                    session.connectPlayer(player_id, connection);
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
            if (dto) this.session_repo.save(dto); // save in db with db plugin I guess, taking dto: DbSession as argument
        } catch(err) {
            this.logger.warn({ game_id: game_id, error: err instanceof Error ? err.message : String(err) }, "Failed to save game session");
        }
        this.logger.info({ game_id: game_id }, "Game session saved");
    }

    private terminateSession_(id: number, session: GameSession): void {
        this.saveSession(id, session);
        session.closeAllConnections(1001, "Game ended"); 
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
            if (game.timeout) {
                this.game_sessions.delete(id);
                continue ;
            }

            game.tick();
            game.broadcastState();

            if (game.over)
                this.terminateSession_(id, game);
        }
    }

}