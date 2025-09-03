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
        return this.game_sessions.get(id)?.config();
    }

    public joinGameSession(id: number, participant: GameParticipant): Result {
        const session = this.game_sessions.get(id);
        if (!session)
            return {success: false, status: 404, msg: "Game not found"};
        if (!session.join(participant))
            return {success: false, status: 401, msg: "Unauthorized participant"};
        return {success: true, status: 200, msg: "Succesfully joined game"};
    }

    public connectToGameSession(id: number, connection: SocketStream): void {
        const session = this.game_sessions.get(id);
        if (!session) {
            connection.socket.close(1011, "Game id doens't exist");
            return ;
        }
        session.addConnection(id, connection);
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

            if (!game.started()) {
                game.checkAndStart();
                continue;
            }
            if (game.timeout()) {
                this.game_sessions.delete(id);
                continue ;
            }

            game.update();
            game.broadcastState();

            if (!game.over())
                this.terminateSession_(id, game);
        }
    }

}