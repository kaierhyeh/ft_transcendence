import { SocketStream } from "@fastify/websocket";
import { GameCreationData } from "../schemas";
import { GameEndedMessage, GameSession, PlayerMap, PublicPlayer } from "./GameSession";
import { GameConf } from "./GameEngine";
import { FastifyBaseLogger } from "fastify";
import { SessionRepository } from "../repositories/SessionRepository"
import { UsersClient } from "../clients/UsersClient";
import { StatsClient } from "../clients/StatsClient";
import { toInteger } from "../utils/type-converters";
import { verifyGameSessionJWT } from "../services/JwtVerifierService";

let next_id = 1;

export class LiveSessionManager {
    private game_sessions: Map<number, GameSession>;
    private usersClient: UsersClient;

    constructor(
        private session_repo: SessionRepository,
        private stats_client: StatsClient,
        private logger: FastifyBaseLogger) {
        this.game_sessions = new Map();
        this.usersClient = new UsersClient();
    }

    public async createGameSession(data: GameCreationData): Promise<number> {
        const game_id = next_id++;

        const new_game = await GameSession.create(data, this.logger, this.usersClient);
        this.game_sessions.set(game_id, new_game);

        return game_id;
    }

    public getGameSessionConf(id: number): GameConf | undefined {
        return this.game_sessions.get(id)?.config;
    }

    public getPlayers(gameId: number): PlayerMap | undefined {
        return this.game_sessions.get(gameId)?.playersMap;
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
                const participant_id = msg.participant_id as string | undefined;
                if (!participant_id) { 
                    connection.socket.close(4001, "Missing participant_id"); 
                    return; 
                }
                try {
                    session.connectPlayer(participant_id, connection);
                } catch (err) {
                    this.logger.warn({ error: err instanceof Error ? err.message : String(err) }, "Invalid participant id");
                    connection.socket.close(4001, "Invalid participant id");
                }
            } 
        });
    }

    private async saveSession(game_id: number, session: GameSession): Promise<void> {
        try {
            const dto = session.toDbRecord();
            if (dto) {
                this.session_repo.save(dto); // save in db with db plugin I guess, taking dto: DbSession as argument
                this.logger.info({ game_id: game_id }, "Game session saved");
                
                for (const player of dto.player_sessions) {
                    if (player.user_id && player.type === 'registered') {
                        try {
                            await this.stats_client.updateStats({
                                user_id: player.user_id,
                                won: player.winner,
                                points_scored: player.score
                            });
                            this.logger.info({ game_id: game_id, user_id: player.user_id }, "Stats updated");
                        } catch (statsError) {
                            this.logger.warn({ game_id: game_id, user_id: player.user_id, error: statsError instanceof Error ? statsError.message : String(statsError) }, "Failed to update stats");
                        }
                    }
                }
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
            session.broadcast(message);
            session.closeAllConnections(4000, message.data.reason);
        } else {
            message = {
                type: "game_ended",
                data: {
                    reason: "game_over",
                }
            };
            session.broadcast(message);
            session.closeAllConnections(1001, message.data.reason); 
        }
        this.game_sessions.delete(id);
    }

    public async update(): Promise<void> {
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
                await this.terminateSession_(id, game);
        }
    }

}