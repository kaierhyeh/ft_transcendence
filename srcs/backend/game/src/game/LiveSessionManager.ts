import { GameParticipant, GameType } from "../types";
import { GameSession } from "./GameSession";

export class LiveSessionManager {
    game_sessions: Map<number, GameSession>;
    #next_id: number;

    constructor () {
        this.game_sessions = new Map();
        this.#next_id = 0;
    }

    createGameSession(type: GameType, participants: GameParticipant[]): number {
        const session_id: number = this.#next_id++;

        return session_id;
    }

    deleteGameSession(game_id: number): void {

    }

    saveGameSession(game_id: number): void {

    }

    getGameSessionConf(game_id: number): void {

    }
}