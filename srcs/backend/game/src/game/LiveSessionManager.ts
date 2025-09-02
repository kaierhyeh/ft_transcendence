import { GameCreationBody, GameParticipant } from "../schemas";
import { Result } from "../types";
import { GameSession } from "./GameSession";

let next_id = 0;

interface Status {
    code: number;
    reason: string;
}

export class LiveSessionManager {
    private game_sessions: Map<number, GameSession>;

    constructor () {
        this.game_sessions = new Map();
    }

    public createGameSession(type: GameCreationBody["type"], participants: GameCreationBody["participants"][number][]): number {
        const game_id = next_id++;

        const new_game = new GameSession(type, participants);
        this.game_sessions.set(game_id, new_game);

        return game_id;
    }

    public joinGameSession(game_id: number, participant: GameParticipant): Result {
        const session = this.game_sessions.get(game_id);
        if (!session)
            return {success: false, status: 404, msg: "Game not found"};

        const player = Array.from(session.state.players.values())
            .find((p) => p.match_ticket === participant.match_ticket);
        if (!player)
            return {success: false, status: 401, msg: "Unauthorized participant"};

        player.ready = true;
        return {success: true, status: 200, msg: "Succesfully joined game"};
    }

    private saveSession_(session: GameSession): void {

    }

    private terminateSession_(id: number, session: GameSession): void {
        this.saveSession_(session);
        session.closeAllConnections(); 
        this.game_sessions.delete(id);
    }

    public getGameSession(game_id: number): GameSession | undefined {
        return this.game_sessions.get(game_id);
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