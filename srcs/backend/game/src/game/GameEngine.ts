import { GameFormat } from "../schemas";
import { PlayerSlot, Team } from "../types";
import { SessionPlayerMap } from "./GameSession";

const PADDLE_WIDTH: number = 10;
const PADDLE_HEIGHT: number = 50;

const INITIAL_BALL_SPEED: number = 420; // pixel / s
let PADDLE_SPEED: number = 350; // pixel / s

const WIDTH: number = 800;
const HEIGHT: number = 750;

const VERTICAL_EDGE_X_TOLERANCE: number = 8;

const WIN_POINT: number = 7;
const BALL_SIZE: number = 10;
const MAX_BALL_SPEED: number = PADDLE_SPEED * 2; // pixel/s

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
    team: Team;
}

type Score = Map<Team, number>;

interface GameFormatConfig {
    paddlePositions: Partial<Record<PlayerSlot, Paddle>>;
}

const GAME_MODE_CONFIGS: Record<GameFormat, GameFormatConfig> = {
    "1v1": {
        paddlePositions: {
            left: { x: 20, y: HEIGHT / 2 - PADDLE_HEIGHT / 2 },
            right: { x: WIDTH - 30, y: HEIGHT / 2 - PADDLE_HEIGHT / 2 }
        }
    },
    "2v2": {
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
    score: { [key: string]: number };
    winner: Team | undefined;
}

export class GameEngine {
    private game_format: GameFormat;
    private mode_config: GameFormatConfig;
    private conf_: GameConf;
    private ball: Ball;
    private players: Map<PlayerSlot, Player>;
    private winner_: Team | undefined;
    private score: Score;
    private lastDelta: number = 16.67;
    private started: boolean = false;
    private paused_: boolean = true;

    constructor(game_mode: GameFormat, session_players: SessionPlayerMap) {
        this.game_format = game_mode;
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
                paddle: { x: paddle.x, y: paddle.y },
                velocity: 0,
                team: p.team
            });
        });
        const maxAngle = Math.atan2((HEIGHT * 2) / 3, WIDTH / 2);
        const angle = (Math.random() * 2 - 1) * maxAngle;

        this.ball = {
            x: WIDTH / 2,
            y: HEIGHT / 2,
            dx: Math.cos(angle) * INITIAL_BALL_SPEED,
            dy: Math.sin(angle) * INITIAL_BALL_SPEED
        };
        this.score = new Map();
        this.score.set("left", 0);
        this.score.set("right", 0);
        
    }
    
    private get paused(): boolean {
        if (!this.started) {
            this.started = true;
            setTimeout(() => {
                this.paused_ = false;
            }, 1000);
        }
        return this.paused_;
    }

    public update(delta: number): void {
        this.lastDelta = delta;

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
        const isBallMovingTowardsPaddle =
            (player.team === "left" && this.ball.dx < 0) ||
            (player.team === "right" && this.ball.dx > 0);

        if (!isBallMovingTowardsPaddle) return;

        const deltaSeconds = this.lastDelta / 1000;
        const prevBallX = this.ball.x - this.ball.dx * deltaSeconds;
        const prevBallY = this.ball.y - this.ball.dy * deltaSeconds;

        const ballEdge = {
            x: player.team === "left" ? this.ball.x + BALL_SIZE : this.ball.x,
            y: this.ball.y
        };
        const collision =
            ballEdge.x >= player.paddle.x &&
            ballEdge.x <= player.paddle.x + PADDLE_WIDTH &&
            ballEdge.y + BALL_SIZE >= player.paddle.y &&
            ballEdge.y <= player.paddle.y + PADDLE_HEIGHT;

        let continuousCollision = false;
        if (!collision) {
            if (player.team === "left") {
                const ballCrossedPaddleX = 
                    prevBallX > player.paddle.x + PADDLE_WIDTH &&
                    this.ball.x <= player.paddle.x + PADDLE_WIDTH;
                
                if (ballCrossedPaddleX) {
                    const t = (player.paddle.x + PADDLE_WIDTH - prevBallX) / (this.ball.x - prevBallX);
                    const intersectY = prevBallY + t * (this.ball.y - prevBallY);
                    
                    continuousCollision = 
                        intersectY + BALL_SIZE >= player.paddle.y &&
                        intersectY <= player.paddle.y + PADDLE_HEIGHT;
                }
            } else {
                const ballCrossedPaddleX = 
                    prevBallX + BALL_SIZE < player.paddle.x &&
                    this.ball.x + BALL_SIZE >= player.paddle.x;
                
                if (ballCrossedPaddleX) {
                    const t = (player.paddle.x - (prevBallX + BALL_SIZE)) / ((this.ball.x + BALL_SIZE) - (prevBallX + BALL_SIZE));
                    const intersectY = prevBallY + t * (this.ball.y - prevBallY);
                    
                    continuousCollision = 
                        intersectY + BALL_SIZE >= player.paddle.y &&
                        intersectY <= player.paddle.y + PADDLE_HEIGHT;
                }
            }
        }

        if (!collision && !continuousCollision) {
            const crossedTop = (prevBallY + BALL_SIZE <= player.paddle.y) && (this.ball.y + BALL_SIZE >= player.paddle.y) && (this.ball.dy > 0);
            const crossedBottom = (prevBallY >= player.paddle.y + PADDLE_HEIGHT) && (this.ball.y <= player.paddle.y + PADDLE_HEIGHT) && (this.ball.dy < 0);

            const ballLeft = this.ball.x;
            const ballRight = this.ball.x + BALL_SIZE;
            const horizNear = (ballRight >= (player.paddle.x - VERTICAL_EDGE_X_TOLERANCE)) && (ballLeft <= (player.paddle.x + PADDLE_WIDTH + VERTICAL_EDGE_X_TOLERANCE));

            if ((crossedTop || crossedBottom) && horizNear)
                this.ball.dy = -this.ball.dy;

            return;
        }

        const paddleCenter = player.paddle.y + PADDLE_HEIGHT / 2;
        const ballCenter = this.ball.y + BALL_SIZE / 2;
        const impact = Math.max(-1, Math.min(1, (ballCenter - paddleCenter) / (PADDLE_HEIGHT / 2)));
        const angle = impact * Math.PI / 4;
        const currentSpeed = Math.sqrt(this.ball.dx ** 2 + this.ball.dy ** 2);
        
        let speed: number;
        if (this.game_format === "2v2")
            speed = currentSpeed * 1.05;
        else
            speed = Math.min(currentSpeed * 1.05, MAX_BALL_SPEED);

        if (player.team === "left") {
            this.ball.dx = Math.abs(Math.cos(angle) * speed);
            this.ball.x = player.paddle.x + PADDLE_WIDTH;
        } else {
            this.ball.dx = -Math.abs(Math.cos(angle) * speed);
            this.ball.x = player.paddle.x - BALL_SIZE;
        }

        this.ball.dy = Math.sin(angle) * speed;
        if (this.ball.y < player.paddle.y) {
            this.ball.y = player.paddle.y - BALL_SIZE;
        } else if (this.ball.y + BALL_SIZE > player.paddle.y + PADDLE_HEIGHT) {
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

    private movePaddles(dt: number): void {
        for (const player of this.players.values()) {
            player.paddle.y += player.velocity * (dt / 1000);

            const bounds = this.getPaddleBounds(player.slot);
            player.paddle.y = Math.max(bounds.min, Math.min(bounds.max, player.paddle.y));
        }
    }

    private getPaddleBounds(slot: PlayerSlot): { min: number; max: number } {
        if (this.game_format === "1v1") {
            return { min: 0, max: HEIGHT - PADDLE_HEIGHT };
        } else {
            if (slot === "top-left" || slot === "top-right") {
                return { min: 0, max: HEIGHT / 2 - PADDLE_HEIGHT };
            } else {
                return { min: HEIGHT / 2, max: HEIGHT - PADDLE_HEIGHT };
            }
        }
    }

    public applyMovement(slot: PlayerSlot, move: "up" | "down" | "stop"): void {
        const player = this.players.get(slot);
        let speed = PADDLE_SPEED;
        if (this.game_format == "2v2")
            speed /= 2;
        if (!player)
            return;
        switch (move) {
            case "up":
                player.velocity = -speed;
                break;
            case "down":
                player.velocity = speed;
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
        this.paused_ = true;
        setTimeout(() => {
            this.paused_ = false;
        }, 1000);
    }

    public get conf(): GameConf {
        return this.conf_;
    }

}