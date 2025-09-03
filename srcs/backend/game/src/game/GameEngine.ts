import { GameType } from "../schemas";
import { GameConf, PlayerSlot, Team } from "../types";
import { SessionPlayerMap } from "./GameSession";

const PADDLE_STEP: number = 9;
const WIDTH: number = 600;
const HEIGHT: number = 400;
const PADDLE_WIDTH: number = 10;
const PADDLE_HEIGHT: number = 80;
const WIN_POINT: number = 3;
const BALL_SIZE: number = 10;
const BALL_SPEED: number = 200;


interface Ball {
    x: number;
    y: number;
    dx: number;
    dy: number;
}

interface Player {
    slot: PlayerSlot;
    paddle_coord: number;
    connected: boolean;
    team: Team;
}

type Score = Map<Team, number>;

export interface GameState {
    ball: Ball;
    players: Map<PlayerSlot, Player>;
    score: Score;
    winner: Team | undefined;
}

export class GameEngine {
    private ball: Ball;
    private players = new Map<PlayerSlot, Player>;
    private winner_: Team | undefined;
    private score: Score;
    
    constructor(game_type: GameType, session_players: SessionPlayerMap) {

    }

    public update(delta: number): void {

    }

    public get winner() {
        return this.winner_;
    }

    public get state(): GameState {
        return {
            ball: this.ball,
            players: this.players,
            score: this.score,
            winner: this.winner_
        };
    }

    public setConnected(slot: PlayerSlot, value: boolean): void {
        const player = this.players.get(slot);
        if (player) player.connected = value;
    }

    static moveBall(state: GameState): void {

    }

    static movePaddle(slot: PlayerSlot, dir: "up" | "down", state: GameState): void {

    }

    static resetBall(state: GameState): void {

    }

    static getConf(game_type: GameType): GameConf {
        return ({
            canvas_width: WIDTH,
            canvas_height: HEIGHT,
            paddle_width: PADDLE_WIDTH,
            paddle_height: PADDLE_HEIGHT,
            win_point: WIN_POINT,
            ball_size: BALL_SIZE,
        });
    }

    static getPaddleFreshState(slot: PlayerSlot, type: GameType): number {
        if (type === "multi")
            throw new Error("Multiplayer not implemented yet");
        return HEIGHT / 2 - PADDLE_HEIGHT / 2;
    }
}