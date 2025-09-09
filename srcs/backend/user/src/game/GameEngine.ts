import { PlayerSlot, Team } from "../types";
import { SessionPlayerMap } from "./GameSession";

const PADDLE_WIDTH: number = 10;
const PADDLE_HEIGHT: number = 50;

const INITIAL_BALL_SPEED: number = 420; // pixel / s
const PADDLE_SPEED: number = 350; // pixel / s

const WIDTH: number = 800;
const HEIGHT: number = 750;

const WIN_POINT: number = 7;
const BALL_SIZE: number = 10;

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

type Score = Map<Team, number>;

export type GameMode = "pvp" | "multi"; // Keep your existing naming

interface GameModeConfig {
    paddlePositions: Partial<Record<PlayerSlot, Paddle>>;
}

const GAME_MODE_CONFIGS: Record<GameMode, GameModeConfig> = {
    pvp: {
        paddlePositions: {
            left: { x: 20, y: HEIGHT / 2 - PADDLE_HEIGHT / 2 },
            right: { x: WIDTH - 30, y: HEIGHT / 2 - PADDLE_HEIGHT / 2 }
        }
    },
    multi: {
        paddlePositions: {
            "top-left": { x: 20, y: HEIGHT / 4 - PADDLE_HEIGHT / 2 },
            "bottom-left": { x: 20, y: (3 * HEIGHT) / 4 - PADDLE_HEIGHT / 2 },
            "top-right": { x: WIDTH - 30, y: HEIGHT / 4 - PADDLE_HEIGHT / 2 },
            "bottom-right": { x: WIDTH - 30, y: (3 * HEIGHT) / 4 - PADDLE_HEIGHT / 2 }
        }
    }
}

export interface GameState {
    ball: Ball;
    players: { [key: string]: Player };
    score: { [key: string]: number} ;
    winner: Team | undefined;
}

export class GameEngine {
    private game_mode: GameMode;
    private mode_config: GameModeConfig;
    private conf_: GameConf;
    private ball: Ball;
    private players: Map<PlayerSlot, Player>;
    private winner_: Team | undefined;
    private score: Score;
    private paused: boolean;
    
    constructor(game_mode: GameMode, session_players: SessionPlayerMap) {
        this.game_mode = game_mode;
        this.mode_config = GAME_MODE_CONFIGS[game_mode];
        this.conf_ = {
            canvas_width: WIDTH,
            canvas_height: HEIGHT,
            paddle_height: PADDLE_HEIGHT,
            paddle_width: PADDLE_WIDTH,
            win_point: WIN_POINT,
            ball_size: BALL_SIZE
        };

        this.players = new Map();
        session_players.forEach(p => {
            const paddle = this.mode_config.paddlePositions[p.slot];
            if (!paddle) {
                throw new Error(`No paddle position configured for slot: ${p.slot} in mode: ${game_mode}`);
            }
            
            this.players.set(p.slot, {
                slot: p.slot,
                paddle: paddle,
                velocity: 0,
                connected: false,
                team: p.team
            });
        });
        const angle = Math.random() * (Math.PI / 2) - Math.PI / 4;

        this.ball = {
            x: WIDTH / 2, 
            y: HEIGHT / 2,
            dx: Math.cos(angle) * INITIAL_BALL_SPEED,
            dy: Math.sin(angle) * INITIAL_BALL_SPEED
        };
        this.score = new Map();
        this.score.set("left", 0);
        this.score.set("right", 0);
        this.paused = false;
    }

    public update(delta: number): void {

        this.movePaddles(delta);
        
        if (!this.paused)
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
        
        if (this.ball.x < 0) {
            scoringTeam = "right";
            this.resetBall("right");
        } else if (this.ball.x > WIDTH) {
            scoringTeam = "left";
            this.resetBall("left");
        }

        if (!scoringTeam)
            return;

        const currentScore = this.score.get(scoringTeam)! + 1;
        this.score.set(scoringTeam, currentScore);
        
        if (currentScore >= WIN_POINT) {
            this.winner_ = scoringTeam;
        }
    }

    private handleCollision(): void {
        // Wall bouncing (this looks correct)
        if (this.ball.y <= 0 || this.ball.y + BALL_SIZE >= HEIGHT) {
            if (this.ball.y <= 0) this.ball.y = 0;
            else this.ball.y = HEIGHT - BALL_SIZE;
            this.ball.dy *= -1;
        }

        for (const player of this.players.values()) {
            this.checkPaddleCollision(player);
        }

    }

    private checkPaddleCollision(player: Player): void {
        const isMovingTowardsPaddle = 
            (player.team === "left" && this.ball.dx < 0) ||
            (player.team === "right" && this.ball.dx > 0);

        if (!isMovingTowardsPaddle) return;

        const collision = 
            this.ball.x + BALL_SIZE >= player.paddle.x &&
            this.ball.x <= player.paddle.x + PADDLE_WIDTH &&
            this.ball.y + BALL_SIZE >= player.paddle.y &&
            this.ball.y <= player.paddle.y + PADDLE_HEIGHT;

        if (!collision) return;

        // Handle collision (same logic for all paddles)
        const paddleCenter = player.paddle.y + PADDLE_HEIGHT / 2;
        const ballCenter = this.ball.y + BALL_SIZE / 2;
        const impact = (ballCenter - paddleCenter) / (PADDLE_HEIGHT / 2);
        const angle = impact * Math.PI / 4;
        const speed = Math.sqrt(this.ball.dx ** 2 + this.ball.dy ** 2) * 1.05;

        if (player.team === "left") {
            this.ball.dx = Math.abs(Math.cos(angle) * speed);
            this.ball.x = player.paddle.x + PADDLE_WIDTH;
        } else {
            this.ball.dx = -Math.abs(Math.cos(angle) * speed);
            this.ball.x = player.paddle.x - BALL_SIZE;
        }
        
        this.ball.dy = Math.sin(angle) * speed;

        // Position adjustment
        if (this.ball.y < player.paddle.y) {
            this.ball.y = player.paddle.y - BALL_SIZE;
        } else if (this.ball.y > player.paddle.y + PADDLE_HEIGHT) {
            this.ball.y = player.paddle.y + PADDLE_HEIGHT;
        }
    }

    public get winner() {
        return this.winner_;
    }

    public get state(): GameState {
        return {
            ball: this.ball,
            players: Object.fromEntries(this.players),
            score: Object.fromEntries(this.score),
            winner: this.winner_
        };
    }

    public setConnected(slot: PlayerSlot, value: boolean): void {
        const player = this.players.get(slot);
        if (player) player.connected = value;
    }

    private movePaddles(dt: number): void {
          for (const player of this.players.values()) {
            // Smooth paddle movement
            player.paddle.y += player.velocity * (dt / 1000);

              // Mode-specific boundary constraints
            const bounds = this.getPaddleBounds(player.slot);
            player.paddle.y = Math.max(bounds.min, Math.min(bounds.max, player.paddle.y));
        }
    }

    private getPaddleBounds(slot: PlayerSlot): { min: number; max: number } {
        if (this.game_mode === "pvp") {
            return { min: 0, max: HEIGHT - PADDLE_HEIGHT };
        } else {
            // 4-player mode: restrict paddle movement to their half
            if (slot === "top-left" || slot === "top-right") {
                return { min: 0, max: HEIGHT / 2 - PADDLE_HEIGHT };
            } else {
                return { min: HEIGHT / 2, max: HEIGHT - PADDLE_HEIGHT };
            }
        }
    }

      public applyMovement(slot: PlayerSlot, move: "up" | "down" | "stop"): void {
        const player = this.players.get(slot);
        if (!player)
            return;
        switch (move) {
            case "up":
                player.velocity = -PADDLE_SPEED;
                break;
            case "down":
                player.velocity = PADDLE_SPEED;
                break;
            case "stop":
                player.velocity = 0;
                break;
            default:
                break;
        }
    }

    private resetBall(to: "left" | "right"): void {
        const angle = Math.atan2(this.ball.dy, this.ball.dx);

        this.ball.y = Math.max(0, Math.min(HEIGHT - BALL_SIZE, this.ball.y));
        this.ball.x = WIDTH / 2 - BALL_SIZE / 2;

        if (to === "right") {
            this.ball.dx = -Math.abs(Math.cos(angle) * INITIAL_BALL_SPEED);
        } else {
            this.ball.dx = Math.abs(Math.cos(angle) * INITIAL_BALL_SPEED);
        }
        this.ball.dy = Math.sin(angle) * INITIAL_BALL_SPEED;
        this.paused = true;
        setTimeout(() => {
            this.paused = false;
        }, 1000);        
    }

    public get conf(): GameConf {
        return this.conf_;
    }

}