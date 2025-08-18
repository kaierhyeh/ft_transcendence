const canvas = document.getElementById("pong");
const ctx = canvas.getContext("2d");

const PADDLE_WIDTH = 10, PADDLE_HEIGHT = 50;
const BALL_SIZE = 10;
const WIN_SCORE = 11;

let leftPaddle = { x: 20, y: canvas.height / 2 - PADDLE_HEIGHT / 2 };
let rightPaddle = { x: canvas.width - 30, y: canvas.height / 2 - PADDLE_HEIGHT / 2 };

const angle = (Math.random() * (Math.PI / 2) - Math.PI / 4)
const speed = 7

let ball = { 
    x: canvas.width / 2 - BALL_SIZE / 2, 
    y: canvas.height / 2 - BALL_SIZE / 2, 
    dx: Math.cos(angle) * speed,
    dy: Math.sin(angle) * speed
};

let scoreLeft = 0, scoreRight = 0;

function drawRect(x, y, w, h) {
    ctx.fillStyle = "white";
    ctx.fillRect(x, y, w, h);
}
function drawBall(x, y, size) {
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
    ctx.fillText(scoreLeft, canvas.width / 4, 50);
    ctx.fillText(scoreRight, 3 * canvas.width / 4, 50);
}

function moveBall() {
    ball.x += ball.dx;
    ball.y += ball.dy;

    if (ball.y <= 0 || ball.y + BALL_SIZE >= canvas.height) {
        ball.dy *= -1;
    }

    if (ball.x <= leftPaddle.x + PADDLE_WIDTH &&
        ball.y + BALL_SIZE >= leftPaddle.y &&
        ball.y <= leftPaddle.y + PADDLE_HEIGHT) {
        
        let paddleCenter = leftPaddle.y + PADDLE_HEIGHT / 2;
        let ballCenter = ball.y + BALL_SIZE / 2;
        let impact = (ballCenter - paddleCenter) / (PADDLE_HEIGHT / 2);
        let angle = impact * Math.PI / 4;
        let speed = Math.sqrt(ball.dx * ball.dx + ball.dy * ball.dy) * 1.05;

        ball.dx = Math.abs(Math.cos(angle) * speed);
        ball.dy = Math.sin(angle) * speed;
        ball.x = leftPaddle.x + PADDLE_WIDTH;
    }

    if (ball.x + BALL_SIZE >= rightPaddle.x &&
        ball.y + BALL_SIZE >= rightPaddle.y &&
        ball.y <= rightPaddle.y + PADDLE_HEIGHT) {

        let paddleCenter = rightPaddle.y + PADDLE_HEIGHT / 2;
        let ballCenter = ball.y + BALL_SIZE / 2;
        let impact = (ballCenter - paddleCenter) / (PADDLE_HEIGHT / 2);
        let angle = impact * Math.PI / 4;
        let speed = Math.sqrt(ball.dx * ball.dx + ball.dy * ball.dy) * 1.05;

        ball.dx = -Math.abs(Math.cos(angle) * speed);
        ball.dy = Math.sin(angle) * speed;
        ball.x = rightPaddle.x - BALL_SIZE;
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

function resetBall(to) {
    let speed = 7;
    let angle = Math.atan2(ball.dy, ball.dx);
    ball.y = Math.max(0, Math.min(canvas.height - BALL_SIZE, ball.y));
    ball.x = canvas.width / 2 - BALL_SIZE / 2;

    if (to === "right") {
        ball.dx = -Math.abs(Math.cos(angle) * speed);
    } else {
        ball.dx = Math.abs(Math.cos(angle) * speed);
    }
    ball.dy = Math.sin(angle) * speed;
}

function gameOver() {
    return scoreLeft === WIN_SCORE || scoreRight === WIN_SCORE;
}

let keys = {};
document.addEventListener("keydown", e => { keys[e.key] = true; });
document.addEventListener("keyup", e => { keys[e.key] = false; });

function movePaddles() {
    if (keys["w"] && leftPaddle.y > 0) leftPaddle.y -= 6;
    if (keys["s"] && leftPaddle.y + PADDLE_HEIGHT < canvas.height) leftPaddle.y += 6;

    if (keys["ArrowUp"] && rightPaddle.y > 0) rightPaddle.y -= 6;
    if (keys["ArrowDown"] && rightPaddle.y + PADDLE_HEIGHT < canvas.height) rightPaddle.y += 6;
}

function game() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    drawCenterLine();
    drawRect(leftPaddle.x, leftPaddle.y, PADDLE_WIDTH, PADDLE_HEIGHT);
    drawRect(rightPaddle.x, rightPaddle.y, PADDLE_WIDTH, PADDLE_HEIGHT);
    drawBall(ball.x, ball.y, BALL_SIZE);
    drawScore();

    if (!gameOver()) {
        movePaddles();
        moveBall();
        requestAnimationFrame(game);
    } else {
        ctx.font = "64px Bit5x3";
        ctx.fillStyle = "white";
        if (scoreLeft == WIN_SCORE)
            ctx.fillText("Player 1 win", canvas.width / 2 - 200, canvas.height / 2 + 32);
        else
            ctx.fillText("Player 2 win", canvas.width / 2 - 200, canvas.height / 2 + 32)
    }
}

game();
