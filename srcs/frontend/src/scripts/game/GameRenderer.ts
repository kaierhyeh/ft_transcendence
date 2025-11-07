// GameRenderer.ts
// Handles pure game rendering on canvas - no UI message display
import type { GameSession } from "./GameSession.js";
import type { GameConfig, GameState, GameState2v2 } from "./types.js";
import { t } from "../i18n/i18n.js";

export class GameRenderer {
    private canvas: HTMLCanvasElement;
    private ctx: CanvasRenderingContext2D;
    private animationFrameId: number | null = null;
    private showRestartHint: boolean = true;  // Controls restart message visibility

    constructor(canvasId: string = "pong", showRestartHint: boolean = true) {
        const canvas = document.getElementById(canvasId) as HTMLCanvasElement;
        if (!canvas) {
            throw new Error(`Canvas element with id '${canvasId}' not found`);
        }

        const ctx = canvas.getContext("2d");
        if (!ctx) {
            throw new Error("Unable to get 2D context from canvas");
        }

        this.canvas = canvas;
        this.ctx = ctx;
        this.showRestartHint = showRestartHint;
    }
    
    attachToSession(session: GameSession): void {
        // Resize canvas to match game config
        this.canvas.width = session.config.canvas_width;
        this.canvas.height = session.config.canvas_height;

        // Start render loop
        const render = () => {
            const state = session.getState();

            if (session.format === '1v1') {
                this.draw1v1(state as GameState | null, session.config, session.isOver());
            } else {
                this.draw2v2(state as GameState2v2 | null, session.config, session.isOver());
            }

            this.animationFrameId = requestAnimationFrame(render);
        };
        
        render();
    }

    detach(): void {
        if (this.animationFrameId !== null) {
            cancelAnimationFrame(this.animationFrameId);
            this.animationFrameId = null;
        }
        this.clear();
    }

    clear(): void {
        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
    }

    private draw1v1(state: GameState | null, config: GameConfig, isOver: boolean): void {
        if (!state) {
            // No state yet - just clear canvas (messages handled by GameMessenger)
            this.clear();
            return;
        }

        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
        this.ctx.fillStyle = "white";
        
        // Center line
        this.drawCenterLine(config);

        // Paddles
        const { left, right } = state.players;
        this.ctx.fillRect(left.paddle.x, left.paddle.y, config.paddle_width, config.paddle_height);
        this.ctx.fillRect(right.paddle.x, right.paddle.y, config.paddle_width, config.paddle_height);

        // Ball
        this.ctx.fillRect(state.ball.x, state.ball.y, config.ball_size, config.ball_size);

        // Score
        this.ctx.font = "64px Bit5x3, monospace";
        this.ctx.fillText(state.score.left.toString(), config.canvas_width / 4, 50);
        this.ctx.fillText(state.score.right.toString(), 3 * config.canvas_width / 4, 50);

        // Winner overlay (skip if showRestartHint is false - arena mode handles it separately)
        if (isOver && state.winner && this.showRestartHint) {
            this.ctx.font = "32px Bit5x3, monospace";
            this.ctx.textAlign = "center";

			const winnerTranslated = state.winner === 'left' ? t("left") : t("right");
            this.ctx.fillText(`${winnerTranslated.toUpperCase()} ${t("playerWins")}`, config.canvas_width / 2, config.canvas_height / 2);
            this.ctx.font = "24px Bit5x3, monospace";
            this.ctx.fillText(t("pressSpaceToRestart"), config.canvas_width / 2, config.canvas_height / 2 + 50);

            this.ctx.textAlign = "left";
        }
    }

    private draw2v2(state: GameState2v2 | null, config: GameConfig, isOver: boolean): void {
        if (!state) {
            // No state yet - just clear canvas (messages handled by GameMessenger)
            this.clear();
            return;
        }

        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
        this.ctx.fillStyle = "white";

        this.drawCenterLine(config);

        // Draw all paddles
        const positions: Array<keyof GameState2v2['players']> = ['top-left', 'bottom-left', 'top-right', 'bottom-right'];
        positions.forEach(pos => {
            const player = state.players[pos];
            if (player) {
                this.ctx.fillRect(player.paddle.x, player.paddle.y, config.paddle_width, config.paddle_height);
            }
        });

        // Ball
        this.ctx.fillRect(state.ball.x, state.ball.y, config.ball_size, config.ball_size);

        // Score
        this.ctx.font = "64px Bit5x3, monospace";
        this.ctx.fillText(state.score.left.toString(), config.canvas_width / 4, 50);
        this.ctx.fillText(state.score.right.toString(), 3 * config.canvas_width / 4, 50);

        // Controls hint
        this.ctx.font = "16px Bit5x3, monospace";
        this.ctx.fillText(t("controlLeft2"), 20, config.canvas_height - 60);
        this.ctx.fillText(t("controlRight2"), 20, config.canvas_height - 40);

        // Winner
        // Winner (skip if showRestartHint is false - arena mode handles it separately)
        if (isOver && state.winner && this.showRestartHint) {
            this.ctx.font = "32px Bit5x3, monospace";
            this.ctx.textAlign = "center";
			const winnerTranslated = state.winner === 'left' ? t("leftTeam") : t("rightTeam");
            this.ctx.fillText(`${winnerTranslated.toUpperCase()} ${t("teamWins")}`, config.canvas_width / 2, config.canvas_height / 2);
            this.ctx.font = "24px Bit5x3, monospace";
            this.ctx.fillText(t("pressSpaceToRestart"), config.canvas_width / 2, config.canvas_height / 2 + 50);
            this.ctx.textAlign = "left";
        }
    }

    private drawCenterLine(config: GameConfig): void {
        for (let i = 0; i < config.canvas_height; i += 20) {
            this.ctx.fillRect(config.canvas_width / 2 - 1, i, 2, 10);
        }
    }
}