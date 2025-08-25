
import { Paddle, Ball, GameConfig, GameState } from './pong-types.js';
import * as Core from './pong-core.js';


let gameState: GameState;
let leftPaddle: Paddle;
let rightPaddle: Paddle;
let config: GameConfig;

function initGame(): void {
    Core.initCanvas("pong");
    
    config = Core.DEFAULT_CONFIG;
    
    leftPaddle = { 
        x: 20, 
        y: (window.innerHeight || 400) / 2 - config.paddleHeight / 2 
    };
    
    rightPaddle = { 
        x: (window.innerWidth || 800) - 30, 
        y: (window.innerHeight || 400) / 2 - config.paddleHeight / 2 
    };
    
    gameState = {
        ball: Core.initializeBall(config),
        paused: false,
        scoreLeft: 0,
        scoreRight: 0,
        keys: Core.initializeKeyboardInput()
    };
}

function handleCollisions(): void {

    if (gameState.ball.dx < 0 && Core.checkPaddleCollision(gameState.ball, leftPaddle, config)) {
        Core.handlePaddleCollision(gameState.ball, leftPaddle, config, true);
    }

    if (gameState.ball.dx > 0 && Core.checkPaddleCollision(gameState.ball, rightPaddle, config)) {
        Core.handlePaddleCollision(gameState.ball, rightPaddle, config, false);
    }
}

function handleGoals(): void {
    if (gameState.ball.x < 0) {
        gameState.scoreRight++;
        Core.resetBall(gameState.ball, "right", config);
        pauseGame();
    }
    if (gameState.ball.x > window.innerWidth || gameState.ball.x > 800) {
        gameState.scoreLeft++;
        Core.resetBall(gameState.ball, "left", config);
        pauseGame();
    }
}


function pauseGame(): void {
    gameState.paused = true;
    setTimeout(() => {
        gameState.paused = false;
    }, 1000);
}


function updatePaddles(): void {

    Core.updatePaddlePosition(leftPaddle, "w", "s", gameState.keys, config);
    Core.updatePaddlePosition(rightPaddle, "ArrowUp", "ArrowDown", gameState.keys, config);
}

function render(): void {
    Core.clearCanvas();
    
    Core.drawCenterLine();
    Core.drawPaddle(leftPaddle, config);
    Core.drawPaddle(rightPaddle, config);
    Core.drawBall(gameState.ball, config);
    Core.drawScore(gameState.scoreLeft, gameState.scoreRight);

    if (Core.isGameOver(gameState.scoreLeft, gameState.scoreRight, config)) {
        Core.drawGameOver(gameState.scoreLeft, gameState.scoreRight, config);
    }
}

function update(): void {
    if (!Core.isGameOver(gameState.scoreLeft, gameState.scoreRight, config) && !gameState.paused) {
        Core.updateBallPosition(gameState.ball, config);
        handleCollisions();
        handleGoals();
    }
    updatePaddles();
}


function gameLoop(): void {
    update();
    render();
    requestAnimationFrame(gameLoop);
}

function startGame(): void {
    initGame();
    gameLoop();
}

export { startGame };