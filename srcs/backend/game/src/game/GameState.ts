import { Ball, Team, GameType, PublicGameState, PlayerMap, SerializedPlayerMap } from '../types'

export class GameState {
    type: GameType;
    players: PlayerMap;
    ball: Ball | undefined;
    score: Record<Team, number>;
    ongoing: boolean;
    last_time: number | undefined;

    constructor(game_type: GameType) {
        this.type = game_type;
        this.players = new Map();
        this.score = { left: 0, right: 0 };
        this.ongoing = false;
    }

    toPublic(): PublicGameState {
        if (this.ball === undefined) {
            throw new Error("Ball is undefined");
        }
        return {
            ball: { ...this.ball },
            players: Object.fromEntries(
                [...this.players].map(([slot, p]) => [slot, {
                    player_id: p.player_id,
                    paddle_coord: p.paddle_coord,
                    team: p.team
                }])
            ) as SerializedPlayerMap,
            scores: { ...this.score }
        };
    }
}