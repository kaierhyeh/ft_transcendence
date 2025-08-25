
export interface Paddle {
    x: number;
    y: number;
}

export interface Ball {
    x: number;
    y: number;
    dx: number;
    dy: number;
}

export interface GameConfig {
    paddleWidth: number;
    paddleHeight: number;
    ballSize: number;
    winScore: number;
    paddleSpeed: number;
    initialBallSpeed: number;
}

export interface GameState {
    ball: Ball;
    paused: boolean;
    scoreLeft: number;
    scoreRight: number;
    keys: Record<string, boolean>;
}

export type BallDirection = "left" | "right";


export interface PlayerControls {
    up: string;
    down: string;
}

export interface GameMode {
    name: string;
    playerCount: 2 | 4;
}