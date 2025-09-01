import { GameCreationBody, GameParticipant } from "../schemas";
import { Result } from "../types";
import { GameSession } from "./GameSession";

let next_id = 0;

export class LiveSessionManager {
    game_sessions: Map<number, GameSession>;

    constructor () {
        this.game_sessions = new Map();
    }

    createGameSession(type: GameCreationBody["type"], participants: GameCreationBody["participants"][number][]): number {
        const game_id = next_id++;

        const new_game = new GameSession(type, participants);
        this.game_sessions.set(game_id, new_game);

        return game_id;
    }

    joinGameSession(game_id: number, participant: GameParticipant): Result {
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

    deleteGameSession(game_id: number): void {

    }

    saveGameSession(game_id: number): void {

    }

    getGameSession(game_id: number): GameSession | undefined {
        return this.game_sessions.get(game_id);
    }
}