// AIController.ts
import type { GameSession } from "./GameSession.js";
import type { GameState, Ball } from "./types.js";
import { INPUT_INTERVAL_MS } from "./config.js";

export class AIController {
    private session: GameSession | null = null;
    private decisionInterval: number | null = null;
    private moveInterval: number | null = null;
    private AITarg: number = -1;
    private currentMove: 'up' | 'down' | 'stop' = 'stop';
    
    attachToSession(session: GameSession, playerIndex: number = 1): void {
        if (session.mode !== 'solo' || session.format !== '1v1') {
            console.warn("AI controller only works for solo 1v1 games");
            return;
        }
        
        this.session = session;
        
        // Decision making loop - once per second (simulates AI "seeing" the game)
        this.decisionInterval = setInterval(() => {
            this.makeDecision();
        }, 1000) as unknown as number;
        
        // Movement execution loop - sends the current decision continuously
        this.moveInterval = setInterval(() => {
            this.executeMove(playerIndex);
        }, INPUT_INTERVAL_MS) as unknown as number;
        
        console.log("AI controller attached - decision every 1000ms, execution every 50ms");
    }
    
    detach(): void {
        if (this.decisionInterval !== null) {
            clearInterval(this.decisionInterval);
            this.decisionInterval = null;
        }
        
        if (this.moveInterval !== null) {
            clearInterval(this.moveInterval);
            this.moveInterval = null;
        }
        
        this.session = null;
        this.AITarg = -1;
        this.currentMove = 'stop';
        
        console.log("AI controller detached");
    }
    
    /**
     * Makes a decision once per second - simulates AI "seeing" the game state
     * This is where the AI predicts where the ball will be
     */
    private makeDecision(): void {
        if (!this.session) return;
        
        const state = this.session.getState() as GameState | null;
        if (!state) return;
        
        const ball = state.ball;
        const config = this.session.config;
        
        // Only predict when ball is moving towards AI
        if (ball.dx < 0) {
            // Ball moving away - return to center
            this.AITarg = -1;
        } else {
            // Ball moving towards AI - predict where it will be
            this.AITarg = this.predictBallY(
                ball,
                state.players.right.paddle.x,
                config
            );
        }
        
        // console.log("AI decision: AITarg =", this.AITarg);
    }
    
    /**
     * Executes the current move decision continuously
     * This simulates holding down a key
     */
    private executeMove(playerIndex: number): void {
        if (!this.session) return;
        
        const state = this.session.getState() as GameState | null;
        if (!state) return;
        
        const paddle = state.players.right.paddle;
        const config = this.session.config;
        
        // Calculate what move to make based on current target
        if (this.AITarg === -1) {
            // Return to center
            const centerY = config.canvas_height / 2;
            if (paddle.y > centerY + 15) {
                this.currentMove = 'up';
            } else if (paddle.y < centerY - 15) {
                this.currentMove = 'down';
            } else {
                this.currentMove = 'stop';
            }
        } else {
            // Move towards predicted position
            const paddleCenter = paddle.y + (config.paddle_height / 2);
            const tolerance = config.paddle_height / 1.1;
            
            if (paddle.y > this.AITarg) {
                this.currentMove = 'up';
            } else if (paddle.y < this.AITarg - tolerance) {
                this.currentMove = 'down';
            } else {
                this.currentMove = 'stop';
            }
        }
        
        // Send the move to the server
        this.session.sendInput(playerIndex, this.currentMove);
    }
    
    /**
     * Predicts where the ball will be when it reaches the paddle's X position
     * Handles bounces off top and bottom walls
     */
    private predictBallY(
        ball: Ball, 
        paddleX: number, 
        config: GameSession['config']
    ): number {
        let { x, y, dx, dy } = ball;
        const { canvas_height, ball_size } = config;
        
        // Simulate ball movement until it reaches paddle X position
        while (true) {
            // Calculate time to reach paddle
            const t = (paddleX - x) / dx;
            const yPred = y + dy * t;
            
            // If prediction is within bounds, return it
            if (yPred >= 0 && yPred <= canvas_height - ball_size) {
                return yPred;
            }
            
            // Handle top wall bounce
            if (yPred < 0) {
                const timeToWall = -y / dy;
                x += dx * timeToWall;
                y = 0;
                dy = -dy;  // Reverse vertical direction
            } 
            // Handle bottom wall bounce
            else {
                const timeToWall = (canvas_height - ball_size - y) / dy;
                x += dx * timeToWall;
                y = canvas_height - ball_size;
                dy = -dy;  // Reverse vertical direction
            }
        }
    }
}