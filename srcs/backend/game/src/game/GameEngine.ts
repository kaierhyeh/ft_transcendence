import { GameConf, GameState, GameType, PlayerSlot } from "../types";

const PADDLE_STEP: number = 9;
const WIDTH: number = 600;
const HEIGHT: number = 400;
const PADDLE_WIDTH: number = 10;
const PADDLE_HEIGHT: number = 80;
const WIN_POINT: number = 3;
const BALL_SIZE: number = 10;
const BALL_SPEED: number = 200;

export class GameEngine {

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