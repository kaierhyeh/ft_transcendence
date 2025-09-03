import { GameType } from "../schemas";
import { PlayerSlot, Team } from "../types";
import { SessionPlayerMap } from "./GameSession";

const PADDLE_STEP: number = 9;
const WIDTH: number = 600;
const HEIGHT: number = 400;
const PADDLE_WIDTH: number = 10;
const PADDLE_HEIGHT: number = 80;
const WIN_POINT: number = 3;
const BALL_SIZE: number = 10;
const BALL_SPEED: number = 200;

export interface GameConf {
    canvas_width: number;
    canvas_height: number;
    paddle_width: number;
    paddle_height: number;
    win_point: number;
    ball_size: number;
}


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
    private game_type: GameType;
    private conf: GameConf;
    private ball: Ball;
    private players: Map<PlayerSlot, Player>;
    private winner_: Team | undefined;
    private score: Score;
    
    constructor(game_type: GameType, session_players: SessionPlayerMap) {
        this.game_type = game_type;
        this.players = new Map();
        session_players.forEach(p => {
            this.players.set(p.slot, {
                slot: p.slot,
                paddle_coord: this.getPaddleFreshState(p.slot, game_type),
                connected: false,
                team: p.team
            });
        });
        this.ball = {
             x: WIDTH / 2, 
            y: HEIGHT / 2, 
            dx: BALL_SPEED, 
            dy: BALL_SPEED / 2 
        };
        this.score = new Map();
        this.score.set("left", 0);
        this.score.set("right", 0);
        this.conf = this.setupConf();
    }
    
    private setupConf(): GameConf {
        if (this.game_type === "multi")
            throw new Error("Multiplayer not handled yet");
        return {
            canvas_width: WIDTH,
            canvas_height: HEIGHT,
            paddle_height: PADDLE_HEIGHT,
            paddle_width: PADDLE_WIDTH,
            win_point: WIN_POINT,
            ball_size: BALL_SIZE
        };
    }

    public update(delta: number): void {
        this.moveBall(delta);
        
        this.handleCollision();

        this.checkScoring();

    }

    private moveBall(dt: number): void {
        this.ball.x += this.ball.dx * (dt / 1000);
        this.ball.y += this.ball.dy * (dt / 1000);
    }

    private checkScoring(): void {
        let scoringTeam: Team | null = null;
        
        if (this.ball.x <= 0) {
            scoringTeam = "right";
        } else if (this.ball.x + BALL_SIZE >= WIDTH) {
            scoringTeam = "left";
        }
        
        if (scoringTeam) {
            const currentScore = this.score.get(scoringTeam)! + 1;
            this.score.set(scoringTeam, currentScore);
            
            if (currentScore >= WIN_POINT) {
                this.winner_ = scoringTeam;
            }
            
            this.resetBall();
        }
    }

    private handleCollision(): void {
        if (this.ball.y <= 0 || this.ball.y + BALL_SIZE >= HEIGHT) {
            this.ball.dy = -this.ball.dy;
        }

        const left_player = this.players.get('left');
        if (
            left_player &&
            this.ball.x <= PADDLE_WIDTH &&
            this.ball.y >= left_player.paddle_coord &&
            this.ball.y <= left_player.paddle_coord + PADDLE_HEIGHT
        ) {
            this.ball.dx = -this.ball.dx;
        }

        const right_player = this.players.get('right');
        if (
            right_player &&
            this.ball.x + BALL_SIZE >= WIDTH - PADDLE_WIDTH &&
            this.ball.y >= right_player.paddle_coord &&
            this.ball.y <= right_player.paddle_coord + PADDLE_HEIGHT
        ) {
            this.ball.dx = -this.ball.dx;
        }
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

    public movePaddle(slot: PlayerSlot, move: "up" | "down"): void {
        const player = this.players.get(slot);
        if (!player)
            return;
        if (move === "up" && player.paddle_coord > 0) {
            player.paddle_coord -= PADDLE_STEP;
        }      
        if (move === "down" && player.paddle_coord < HEIGHT - PADDLE_HEIGHT) {
            player.paddle_coord += PADDLE_STEP;
        }
    }

    private resetBall(): void {
        this.ball.x = WIDTH / 2;
        this.ball.y = HEIGHT / 2;
        this.ball.dx = -this.ball.dx;
    }

    public getConf(game_type: GameType): GameConf {
        return ({
            canvas_width: WIDTH,
            canvas_height: HEIGHT,
            paddle_width: PADDLE_WIDTH,
            paddle_height: PADDLE_HEIGHT,
            win_point: WIN_POINT,
            ball_size: BALL_SIZE,
        });
    }

    private getPaddleFreshState(slot: PlayerSlot, type: GameType): number {
        if (type === "multi")
            throw new Error("Multiplayer not implemented yet");
        return HEIGHT / 2 - PADDLE_HEIGHT / 2;
    }
}