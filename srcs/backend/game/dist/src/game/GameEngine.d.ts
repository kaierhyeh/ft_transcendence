import { PlayerSlot, Team } from "../types";
import { SessionPlayerMap } from "./GameSession";
export interface GameConf {
    canvas_width: number;
    canvas_height: number;
    paddle_width: number;
    paddle_height: number;
    win_point: number;
    ball_size: number;
}
interface Paddle {
    x: number;
    y: number;
}
interface Ball {
    x: number;
    y: number;
    dx: number;
    dy: number;
}
interface Player {
    slot: PlayerSlot;
    paddle: Paddle;
    velocity: number;
    connected: boolean;
    team: Team;
}
export type GameMode = "pvp" | "multi";
export interface GameState {
    ball: Ball;
    players: {
        [key: string]: Player;
    };
    score: {
        [key: string]: number;
    };
    winner: Team | undefined;
}
export declare class GameEngine {
    private game_mode;
    private mode_config;
    private conf_;
    private ball;
    private players;
    private winner_;
    private score;
    private paused;
    private lastDelta;
    constructor(game_mode: GameMode, session_players: SessionPlayerMap);
    update(delta: number): void;
    private moveBall;
    private checkScoring;
    private handleCollision;
    private checkPaddleCollision;
    get winner(): Team | undefined;
    get state(): GameState;
    setConnected(slot: PlayerSlot, value: boolean): void;
    private movePaddles;
    private getPaddleBounds;
    applyMovement(slot: PlayerSlot, move: "up" | "down" | "stop"): void;
    private resetBall;
    get conf(): GameConf;
}
export {};
//# sourceMappingURL=GameEngine.d.ts.map