import { SocketStream } from "@fastify/websocket";
import { GameCreationBody, GameParticipant } from "../schemas";
import { GameConf, Result } from "../types";
import { GameSession } from "./GameSession";

let next_id = 0;

export class LiveSessionManager {
    private game_sessions: Map<number, GameSession>;

    constructor () {
        this.game_sessions = new Map();
    }

    public createGameSession(type: GameCreationBody["type"], participants: GameParticipant[]): number {
        const game_id = next_id++;

        const new_game = new GameSession(type, participants);
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
            return ;
        }

        connection.socket.once("message", (raw: string) => {
            const msg = JSON.parse(raw);  // TODO - can fail, maybe wrap it intry catch

            if (msg.type === "join") {
                const ticket = msg.ticket;
                const success = session.connectPlayer(ticket, connection);

                if (!success) {
                    connection.socket.close(4001, "Invalid or duplicate ticket");
                    return ;
                }
                session.setupPlayerListeners(ticket, connection);
            } else if (msg.type === "view") {
                session.connectViewer(connection);
            } else {
                connection.socket.close(4000, "First message myst be join or view");
            }
        });
    }

    private saveSession_(session: GameSession): void {
        // save in dB
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

            if (!game.over)
                this.terminateSession_(id, game);
        }
    }

}