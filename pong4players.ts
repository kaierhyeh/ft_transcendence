const canvas = document.getElementById("pong") as HTMLCanvasElement;
const ctx = canvas.getContext("2d")!;

const PADDLE_WIDTH = 10;
const PADDLE_HEIGHT = 50;
const BALL_SIZE = 10;
const WIN_SCORE = 11;
const PADDLE_SPEED = 6;

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

// 1= up , 2 = down // (centre bas 75%, centre haut 25%)
let leftPaddle1: Paddle = { x: 20, y: canvas.height / 4 - PADDLE_HEIGHT / 2 };
let leftPaddle2: Paddle = { x: 20, y: (3 * canvas.height) / 4 - PADDLE_HEIGHT / 2 };
let rightPaddle1: Paddle = { x: canvas.width - 30, y: canvas.height / 4 - PADDLE_HEIGHT / 2 };
let rightPaddle2: Paddle = { x: canvas.width - 30, y: (3 * canvas.height) / 4 - PADDLE_HEIGHT / 2 };
let paused = false;

let angle = Math.random() * (Math.PI / 2) - Math.PI / 4;
let speed = 7;

let ball: Ball = { 
    x: canvas.width / 2 - BALL_SIZE / 2, 
    y: canvas.height / 2 - BALL_SIZE / 2, 
    dx: Math.cos(angle) * speed,
    dy: Math.sin(angle) * speed
};

let scoreLeft = 0;
let scoreRight = 0;

function drawRect(x: number, y: number, w: number, h: number) {
    ctx.fillStyle = "white";
    ctx.fillRect(x, y, w, h);
}

function drawBall(x: number, y: number, size: number) {
    ctx.fillStyle = "white";
    ctx.fillRect(x, y, size, size);
}

function drawCenterLine() {
    for (let i = 0; i < canvas.height; i += 20) {
        drawRect(canvas.width / 2 - 1, i, 2, 10);
    }
}

function drawScore() {
    ctx.font = "64px Bit5x3";
    ctx.fillStyle = "white";
    ctx.fillText(scoreLeft.toString(), canvas.width / 4, 50);
    ctx.fillText(scoreRight.toString(), 3 * canvas.width / 4, 50);
}

function moveBall() {
    ball.x += ball.dx;
    ball.y += ball.dy;

    if (ball.y <= 0 || ball.y + BALL_SIZE >= canvas.height) {
        if (ball.y <= 0)
            ball.y = 0;
        else
            ball.y = canvas.height - BALL_SIZE;
        ball.dy *= -1;
    }

    if (ball.dx < 0 && ball.x <= leftPaddle1.x + PADDLE_WIDTH &&
        ball.x + BALL_SIZE >= leftPaddle1.x &&
        ball.y + BALL_SIZE >= leftPaddle1.y &&
        ball.y <= leftPaddle1.y + PADDLE_HEIGHT) {
        
        const paddleCenter = leftPaddle1.y + PADDLE_HEIGHT / 2;
        const ballCenter = ball.y + BALL_SIZE / 2;
        const impact = (ballCenter - paddleCenter) / (PADDLE_HEIGHT / 2);
        const angle = impact * Math.PI / 4;
        const speed = Math.sqrt(ball.dx ** 2 + ball.dy ** 2) * 1.05;

        ball.dx = Math.abs(Math.cos(angle) * speed);
        ball.dy = Math.sin(angle) * speed;
        ball.x = leftPaddle1.x + PADDLE_WIDTH;
        if (ball.y < leftPaddle1.y) ball.y = leftPaddle1.y - BALL_SIZE;
        else if (ball.y > leftPaddle1.y + PADDLE_HEIGHT) ball.y = leftPaddle1.y + PADDLE_HEIGHT;
    }
    //same logic as first pong , duplicated for 2 paddle
    if (ball.dx < 0 && ball.x <= leftPaddle2.x + PADDLE_WIDTH &&
    ball.x + BALL_SIZE >= leftPaddle2.x &&
    ball.y + BALL_SIZE >= leftPaddle2.y &&
    ball.y <= leftPaddle2.y + PADDLE_HEIGHT) {
    
    const paddleCenter = leftPaddle2.y + PADDLE_HEIGHT / 2;
    const ballCenter = ball.y + BALL_SIZE / 2;
    const impact = (ballCenter - paddleCenter) / (PADDLE_HEIGHT / 2);
    const angle = impact * Math.PI / 4;
    const speed = Math.sqrt(ball.dx ** 2 + ball.dy ** 2) * 1.05;

    ball.dx = Math.abs(Math.cos(angle) * speed);
    ball.dy = Math.sin(angle) * speed;
    ball.x = leftPaddle2.x + PADDLE_WIDTH;
    if (ball.y < leftPaddle2.y)
        ball.y = leftPaddle2.y - BALL_SIZE;
    else if (ball.y > leftPaddle2.y + PADDLE_HEIGHT)
        ball.y = leftPaddle2.y + PADDLE_HEIGHT;
    }

    if (ball.dx > 0 && ball.x + BALL_SIZE >= rightPaddle1.x &&
        ball.x <= rightPaddle1.x + PADDLE_WIDTH &&
        ball.y + BALL_SIZE >= rightPaddle1.y &&
        ball.y <= rightPaddle1.y + PADDLE_HEIGHT) {

        const paddleCenter = rightPaddle1.y + PADDLE_HEIGHT / 2;
        const ballCenter = ball.y + BALL_SIZE / 2;
        const impact = (ballCenter - paddleCenter) / (PADDLE_HEIGHT / 2);
        const angle = impact * Math.PI / 4;
        const speed = Math.sqrt(ball.dx ** 2 + ball.dy ** 2) * 1.05;

        ball.dx = -Math.abs(Math.cos(angle) * speed);
        ball.dy = Math.sin(angle) * speed;
        ball.x = rightPaddle1.x - BALL_SIZE;
        if (ball.y < rightPaddle1.y)
            ball.y = rightPaddle1.y - BALL_SIZE;
        else if (ball.y > rightPaddle1.y + PADDLE_HEIGHT)
            ball.y = rightPaddle1.y + PADDLE_HEIGHT;
    }


    if (ball.dx > 0 && ball.x + BALL_SIZE >= rightPaddle2.x &&
        ball.x <= rightPaddle2.x + PADDLE_WIDTH &&
        ball.y + BALL_SIZE >= rightPaddle2.y &&
        ball.y <= rightPaddle2.y + PADDLE_HEIGHT) {

        const paddleCenter = rightPaddle2.y + PADDLE_HEIGHT / 2;
        const ballCenter = ball.y + BALL_SIZE / 2;
        const impact = (ballCenter - paddleCenter) / (PADDLE_HEIGHT / 2);
        const angle = impact * Math.PI / 4;
        const speed = Math.sqrt(ball.dx ** 2 + ball.dy ** 2) * 1.05;

        ball.dx = -Math.abs(Math.cos(angle) * speed);
        ball.dy = Math.sin(angle) * speed;
        ball.x = rightPaddle2.x - BALL_SIZE;
        if (ball.y < rightPaddle2.y)
            ball.y = rightPaddle2.y - BALL_SIZE;
        else if (ball.y > rightPaddle2.y + PADDLE_HEIGHT)
            ball.y = rightPaddle2.y + PADDLE_HEIGHT;
    }

    if (ball.x < 0) {
        scoreRight++;
        resetBall("right");
    }
    if (ball.x > canvas.width) {
        scoreLeft++;
        resetBall("left");
    }
}

function resetBall(to: "left" | "right") {
    const speed = 7;
    const angle = Math.atan2(ball.dy, ball.dx);

    ball.y = Math.max(0, Math.min(canvas.height - BALL_SIZE, ball.y));
    ball.x = canvas.width / 2 - BALL_SIZE / 2;

    if (to === "right") {
        ball.dx = -Math.abs(Math.cos(angle) * speed);
    } else {
        ball.dx = Math.abs(Math.cos(angle) * speed);
    }
    ball.dy = Math.sin(angle) * speed;
    
    paused = true;
    setTimeout(() => {
        paused = false;
    }, 1000);
}

function gameOver(): boolean {
    return scoreLeft === WIN_SCORE || scoreRight === WIN_SCORE;
}


const keys: Record<string, boolean> = {};
document.addEventListener("keydown", e => { keys[e.key] = true; });
document.addEventListener("keyup", e => { keys[e.key] = false; });

function movePaddles() {

    if (keys["w"] && leftPaddle1.y > 0)
        leftPaddle1.y -= PADDLE_SPEED;

    if (keys["s"] && leftPaddle1.y + PADDLE_HEIGHT < canvas.height / 2)
        leftPaddle1.y += PADDLE_SPEED;

    if (keys["a"] && leftPaddle2.y > canvas.height / 2)
        leftPaddle2.y -= PADDLE_SPEED;

    if (keys["z"] && leftPaddle2.y + PADDLE_HEIGHT < canvas.height)
        leftPaddle2.y += PADDLE_SPEED;

    if (keys["ArrowUp"] && rightPaddle1.y > 0)
        rightPaddle1.y -= PADDLE_SPEED;

    if (keys["ArrowDown"] && rightPaddle1.y + PADDLE_HEIGHT < canvas.height / 2)
        rightPaddle1.y += PADDLE_SPEED;
    
    if (keys["o"] && rightPaddle2.y > canvas.height / 2)
        rightPaddle2.y -= PADDLE_SPEED;

    if (keys["l"] && rightPaddle2.y + PADDLE_HEIGHT < canvas.height)
        rightPaddle2.y += PADDLE_SPEED;
}

function game() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);


    drawCenterLine();
    drawRect(leftPaddle1.x, leftPaddle1.y, PADDLE_WIDTH, PADDLE_HEIGHT);
    drawRect(leftPaddle2.x, leftPaddle2.y, PADDLE_WIDTH, PADDLE_HEIGHT);
    drawRect(rightPaddle1.x, rightPaddle1.y, PADDLE_WIDTH, PADDLE_HEIGHT);
    drawRect(rightPaddle2.x, rightPaddle2.y, PADDLE_WIDTH, PADDLE_HEIGHT);
    drawBall(ball.x, ball.y, BALL_SIZE);
    drawScore();

    if (gameOver()) {
        ctx.font = "64px Bit5x3";
        ctx.fillStyle = "white";
        if (scoreLeft === WIN_SCORE) {
            ctx.fillText("Player 1 Wins!", canvas.width / 2 - 220, canvas.height / 2 + 32);
        } else {
            ctx.fillText("Player 2 Wins!", canvas.width / 2 - 220, canvas.height / 2 + 32);
        }
    } else if (!paused) {
        moveBall();
    }
    
    movePaddles();
    
    requestAnimationFrame(game);
}

game();