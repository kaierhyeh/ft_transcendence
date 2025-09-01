import { GameCreationBody } from "../schemas";
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

    deleteGameSession(game_id: number): void {

    }

    saveGameSession(game_id: number): void {

    }

    getGameSessionConf(game_id: number): void {

    }
}