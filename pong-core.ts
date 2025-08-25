
import { Paddle, Ball, GameConfig, GameState, BallDirection } from './pong-types.js';

const DEFAULT_CONFIG: GameConfig = {
    paddleWidth: 10,
    paddleHeight: 50,
    ballSize: 10,
    winScore: 11,
    paddleSpeed: 6,
    initialBallSpeed: 7
};


let canvas: HTMLCanvasElement;
let ctx: CanvasRenderingContext2D;

function initCanvas(canvasId: string): void {
    canvas = document.getElementById(canvasId) as HTMLCanvasElement;
    ctx = canvas.getContext("2d")!;
}


function drawRect(x: number, y: number, w: number, h: number): void {
    ctx.fillStyle = "white";
    ctx.fillRect(x, y, w, h);
}

function drawBall(ball: Ball, config: GameConfig): void {
    ctx.fillStyle = "white";
    ctx.fillRect(ball.x, ball.y, config.ballSize, config.ballSize);
}

function drawCenterLine(): void {
    for (let i = 0; i < canvas.height; i += 20) {
        drawRect(canvas.width / 2 - 1, i, 2, 10);
    }
}

function drawScore(scoreLeft: number, scoreRight: number): void {
    ctx.font = "64px Bit5x3";
    ctx.fillStyle = "white";
    ctx.fillText(scoreLeft.toString(), canvas.width / 4, 50);
    ctx.fillText(scoreRight.toString(), 3 * canvas.width / 4, 50);
}

function drawPaddle(paddle: Paddle, config: GameConfig): void {
    drawRect(paddle.x, paddle.y, config.paddleWidth, config.paddleHeight);
}

function drawGameOver(scoreLeft: number, scoreRight: number, config: GameConfig): void {
    ctx.font = "64px Bit5x3";
    ctx.fillStyle = "white";
    if (scoreLeft === config.winScore)
        ctx.fillText("Player 1 win", canvas.width / 2 - 200, canvas.height / 2 + 32);
    else
        ctx.fillText("Player 2 win", canvas.width / 2 - 200, canvas.height / 2 + 32);
}


function initializeBall(config: GameConfig): Ball {
    const angle = Math.random() * (Math.PI / 2) - Math.PI / 4;
    const speed = config.initialBallSpeed;
    
    return {
        x: canvas.width / 2 - config.ballSize / 2,
        y: canvas.height / 2 - config.ballSize / 2,
        dx: Math.cos(angle) * speed,
        dy: Math.sin(angle) * speed
    };
}

function updateBallPosition(ball: Ball, config: GameConfig): void {
    ball.x += ball.dx;
    ball.y += ball.dy;

    if (ball.y <= 0 || ball.y + config.ballSize >= canvas.height) {
        if (ball.y <= 0)
            ball.y = 0;
        else
            ball.y = canvas.height - config.ballSize;
        ball.dy *= -1;
    }
}

function checkPaddleCollision(ball: Ball, paddle: Paddle, config: GameConfig): boolean {
    return ball.x + config.ballSize >= paddle.x &&
           ball.x <= paddle.x + config.paddleWidth &&
           ball.y + config.ballSize >= paddle.y &&
           ball.y <= paddle.y + config.paddleHeight;
}

function handlePaddleCollision(ball: Ball, paddle: Paddle, config: GameConfig, isLeftSide: boolean): void {
    const paddleCenter = paddle.y + config.paddleHeight / 2;
    const ballCenter = ball.y + config.ballSize / 2;
    const impact = (ballCenter - paddleCenter) / (config.paddleHeight / 2);
    const angle = impact * Math.PI / 4;
    const speed = Math.sqrt(ball.dx ** 2 + ball.dy ** 2) * 1.05;

    if (isLeftSide) {
        ball.dx = Math.abs(Math.cos(angle) * speed);
        ball.x = paddle.x + config.paddleWidth;
    } else {
        ball.dx = -Math.abs(Math.cos(angle) * speed);
        ball.x = paddle.x - config.ballSize;
    }
    
    ball.dy = Math.sin(angle) * speed;
    
    // check adjustement position
    if (ball.y < paddle.y) ball.y = paddle.y - config.ballSize;
    else if (ball.y > paddle.y + config.paddleHeight) ball.y = paddle.y + config.paddleHeight;
}

function resetBall(ball: Ball, to: BallDirection, config: GameConfig): void {
    const speed = config.initialBallSpeed;
    const angle = Math.atan2(ball.dy, ball.dx);

    ball.y = Math.max(0, Math.min(canvas.height - config.ballSize, ball.y));
    ball.x = canvas.width / 2 - config.ballSize / 2;

    if (to === "right") {
        ball.dx = -Math.abs(Math.cos(angle) * speed);
    } else {
        ball.dx = Math.abs(Math.cos(angle) * speed);
    }
    ball.dy = Math.sin(angle) * speed;
}


function isGameOver(scoreLeft: number, scoreRight: number, config: GameConfig): boolean {
    return scoreLeft === config.winScore || scoreRight === config.winScore;
}

function updatePaddlePosition(paddle: Paddle, upKey: string, downKey: string, keys: Record<string, boolean>, config: GameConfig, minY: number = 0, maxY?: number): void {
    const effectiveMaxY = maxY ?? canvas.height - config.paddleHeight;
    
    if (keys[upKey] && paddle.y > minY) {
        paddle.y -= config.paddleSpeed;
    }
    if (keys[downKey] && paddle.y < effectiveMaxY) {
        paddle.y += config.paddleSpeed;
    }
}

function clearCanvas(): void {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
}


function initializeKeyboardInput(): Record<string, boolean> {
    const keys: Record<string, boolean> = {};
    
    document.addEventListener("keydown", e => { keys[e.key] = true; });
    document.addEventListener("keyup", e => { keys[e.key] = false; });
    
    return keys;
}


export {
    DEFAULT_CONFIG,

    initCanvas,
    initializeKeyboardInput,
    initializeBall,

    drawRect,
    drawBall,
    drawCenterLine,
    drawScore,
    drawPaddle,
    drawGameOver,
    clearCanvas,

    updateBallPosition,
    checkPaddleCollision,
    handlePaddleCollision,
    resetBall,

    isGameOver,
    updatePaddlePosition
};