import type { WebSocket } from "ws";
import { GameCreationData } from "../schemas";
import { GameEndedMessage, GameSession, PlayerMap, PublicPlayer } from "./GameSession";
import { GameConf } from "./GameEngine";
import { FastifyBaseLogger } from "fastify";
import { SessionRepository } from "../repositories/SessionRepository"
import { UsersClient } from "../clients/UsersClient";
import { StatsClient } from "../clients/StatsClient";
import { userWsAuthMiddleware } from "../middleware/userWsAuth";
import { FastifyRequest } from "fastify";
import { ChatClient } from "../clients/ChatClient";

let next_id = 1;

export class LiveSessionManager {
    private game_sessions: Map<number, GameSession>;
    private usersClient: UsersClient;
    private chatClient: ChatClient;
    

    constructor(
        private session_repo: SessionRepository,
        private stats_client: StatsClient,
        private logger: FastifyBaseLogger) {
        this.game_sessions = new Map();
        this.usersClient = new UsersClient();
        this.chatClient = new ChatClient();
    }

    public async createGameSession(data: GameCreationData): Promise<number> {
        if (data.invitation) {
            return await this.handleInvitationGameCreation(data);
        }
        
        const game_id = next_id++;
        const new_game = await GameSession.create(data, this.logger, this.usersClient);
        this.game_sessions.set(game_id, new_game);
        
        return game_id;
    }

    private findDuplicateInvitationGame(data: GameCreationData): number | undefined {
        if (!data.invitation) return undefined;
        
        const participantId1 = data.participants[0].participant_id;
        const participantId2 = data.participants[1].participant_id;
        
        for (const [gameId, session] of this.game_sessions.entries()) {
            if (session.isInvitation && session.hasParticipantPair(participantId1, participantId2)) {
                return gameId;
            }
        }
        
        return undefined;
    }

    private async handleInvitationGameCreation(data: GameCreationData): Promise<number> {
        // Check if invitation game already exists
        const existingGameId = this.findDuplicateInvitationGame(data);
        
        if (existingGameId) {
            // Game already exists, just notify chat again
            try {
                await this.chatClient.notifyGameCreationToChatService({
                    ...data.invitation!,
                    gameId: existingGameId
                });
            } catch (error: any) {
                this.logger.error({ error: error.message || String(error) }, "Failed to notify chat service");
                throw error;
            }
            return existingGameId;
        }
        
        // No duplicate, validate and create new game
        this.validateInvitationData(data);
        
        const game_id = next_id++;
        const new_game = await GameSession.create(data, this.logger, this.usersClient);
        this.game_sessions.set(game_id, new_game);
        
        try {
            await this.chatClient.notifyGameCreationToChatService({
                ...data.invitation!,
                gameId: game_id
            });
        } catch (error: any) {
            this.game_sessions.delete(game_id); // Rollback
            this.logger.error({ error: error.message || String(error) }, "Failed to notify chat service, rolling back session");
            throw error;
        }
        
        return game_id;
    }

    private validateInvitationData(data: GameCreationData): void {
        const participants = data.participants;

        // Check exactly 2 participants
        if (participants.length !== 2) {
            const error = new Error;
            (error as any).status = 400;
            (error as any).code = 'INVALID_INVITATION_PARTICIPANTS';
            error.message = `Invitation games require exactly 2 participants, got ${participants.length}`;
            throw error;
        }

        // Validate each participant
        for (let idx = 0; idx < participants.length; idx++) {
            const p = participants[idx];

            // Check that participant has a user_id (must be registered)
            if (!p.user_id) {
                const error = new Error;
                (error as any).status = 400;
                (error as any).code = 'MISSING_USER_ID';
                error.message = `Invitation participant at index ${idx} must have a user_id`;
                throw error;
            }

            // Check that participant_id matches user_id (as string)
            if (p.participant_id !== String(p.user_id)) {
                const error = new Error;
                (error as any).status = 400;
                (error as any).code = 'PARTICIPANT_ID_MISMATCH';
                error.message = `participant_id must equal user_id for invitations. Expected "${p.user_id}", got "${p.participant_id}"`;
                throw error;
            }
        }

        // Check for duplicate user_ids (same user against itself)
        if (participants[0].user_id === participants[1].user_id) {
            const error = new Error;
            (error as any).status = 400;
            (error as any).code = 'DUPLICATE_USER';
            error.message = `Cannot invite yourself. Both participants have user_id ${participants[0].user_id}`;
            throw error;
        }
    }

    public deleteGameSession(gameId: number, userId: number) {
        const session = this.game_sessions.get(gameId);
        if (!session) {
            const error = new Error;
            (error as any).status = 404;
            (error as any).code = 'GAME_NOT_FOUND';
            error.message = `Game session with id ${gameId} not found`;
            throw error;
        }
        if (session.isUserGameCreator(userId)) {
            if (session.started && !session.over) {
                const error = new Error;
                (error as any).status = 403;
                (error as any).code = 'CANNOT_DELETE_ACTIVE_GAME';
                error.message = `Cannot delete an active game session`;
                throw error;
            }
            this.game_sessions.delete(gameId);
        } else {
            const error = new Error;
            (error as any).status = 403;
            (error as any).code = 'NOT_GAME_CREATOR';
            error.message = `Only the game creator can delete this session`;
            throw error;
        }

    }

    public getGameSessionConf(id: number): GameConf | undefined {
        return this.game_sessions.get(id)?.config;
    }

    /**
     * Check if a user can access an invitation game
     * @throws Error with status and code properties
     */
    public checkGameAccess(gameId: number, userId: number): void {
        const session = this.game_sessions.get(gameId);
        
        if (!session) {
            const error = new Error("Game not found");
            (error as any).status = 404;
            (error as any).code = 'GAME_NOT_FOUND';
            throw error;
        }

        if (!session.isInvitation) {
            const error = new Error("This game is not an invitation game");
            (error as any).status = 403;
            (error as any).code = 'NOT_INVITATION_GAME';
            throw error;
        }

        if (!session.canUserAccessInvitation(userId)) {
            const error = new Error("You are not authorized to access this game");
            (error as any).status = 403;
            (error as any).code = 'UNAUTHORIZED_ACCESS';
            throw error;
        }
    }

    public getPlayers(gameId: number): PlayerMap | undefined {
        return this.game_sessions.get(gameId)?.playersMap;
    }

    public connectToGameSession(id: number, connection: WebSocket, request: FastifyRequest): void {
        const session = this.game_sessions.get(id);
        if (!session) {
            connection.close(4004, "Game not found");
            return;
        }
        connection.once("message", async (raw: string) => {
            let msg;

            try { 
                msg = JSON.parse(raw); 
            } catch(err) { 
                connection.close(4002, "Invalid JSON"); 
                return;
            }

            if (msg.type === "view") {
                session.connectViewer(connection);
            } else if (msg.type === "join") {
                let participant_id: string | undefined;
                
                if (session.isInvitation) {
                    // Authenticate and get user_id from JWT
                    const isAuthenticated = await userWsAuthMiddleware(request);
                    
                    if (!isAuthenticated || !request.authUser?.sub) {
                        this.logger.warn("WebSocket authentication failed for invitation game");
                        connection.close(4001, "Invalid or expired access token");
                        return;
                    }
                    
                    const userId = parseInt(request.authUser.sub);
                    participant_id = String(userId);
                    this.logger.info(`WebSocket authenticated for invitation game: user ${userId}`);
                } else {
                    participant_id = msg.participant_id;
                }
                
                if (!participant_id) { 
                    connection.close(4001, "Missing participant_id"); 
                    return; 
                }
                try {
                    session.connectPlayer(participant_id, connection);
                } catch (err) {
                    this.logger.warn({ error: err instanceof Error ? err.message : String(err) }, "Invalid participant id");
                    connection.close(4001, "Invalid participant id");
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
                if (game.timeout) {
                    console.log(`[LiveSessionManager] Game ${id} timed out before starting. Terminating session.`);
                    this.game_sessions.delete(id);   
                }
                continue;
            }

            game.tick();
            game.broadcastState();

            if (game.over)
                await this.terminateSession_(id, game);
        }
    }

}