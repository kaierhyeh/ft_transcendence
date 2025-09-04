import { SocketStream } from "@fastify/websocket";
import { GameCreationBody, GameParticipant, GameType } from "../schemas";
import { GameSession } from "./GameSession";
import { GameConf } from "./GameEngine";
import { FastifyBaseLogger } from "fastify";

let next_id = 0;

export class LiveSessionManager {
    private game_sessions: Map<number, GameSession>;
    private logger: FastifyBaseLogger;

    constructor(logger: FastifyBaseLogger) {
        this.game_sessions = new Map();
        this.logger = logger;
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
         connection.socket.on("message", (raw: string) => {
            try {
                const msg = JSON.parse(raw);

                if (msg.type === "view") {
                    session.connectViewer(connection);
                } else {
                    session.setupPlayerListeners(raw, connection);
                } 
            } catch(err) {
                connection.socket.close(4002, "Invalid JSON");
            }
        });
    }

    private saveSession_(session: GameSession): void {
        // save in dB
    //         try {
    //     const saveGameInDb = fastify.db.prepare(
    //     `INSERT INTO sessions (
    //         type,
    //         tournament_id,
    //         player1_id,
    //         player2_id,
    //         player3_id,
    //         player4_id,
    //         score_player1,
    //         score_player2,
    //         score_player3,
    //         score_player4,
    //         winner_id,
    //         created_at
    //     ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
    //     );

    //     const left_player = game_session.state.players.get("left");
    //     const right_player = game_session.state.players.get("right");
    //     const winner_id = game_session.winner_id;

    //     if (left_player === undefined || right_player === undefined || winner_id === undefined) 
    //     throw new Error("Invalid game session data");

    //     const created_at: string = game_session.created_at.toISOString().slice(0, 19).replace('T', ' ');
    
    //     saveGameInDb.run(
    //     game_session.type,
    //     null,
    //     left_player.player_id,
    //     right_player.player_id,
    //     null,
    //     null,
    //     left_player.score,
    //     right_player.score,
    //     null,
    //     null,
    //     winner_id,
    //     created_at
    //     );

    //     console.log(`[INFO] Game ${game_session.id} saved successfully`);
    // } catch (error) {
    //     const errorMessage = error instanceof Error ? error.message : String(error);
    //     console.error(`[WARN] Failed to save game ${game_session.id}:`, errorMessage);
    //     fastify.log.warn({ gameId: game_session.id, error: errorMessage }, "Database save failed");
        
    //     broadcastServerMessage(game_session, "warning", "Game statistics could not be saved", "DB_SAVE_FAILED");
    // }
    }

    private terminateSession_(id: number, session: GameSession): void {
        this.saveSession_(session);
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