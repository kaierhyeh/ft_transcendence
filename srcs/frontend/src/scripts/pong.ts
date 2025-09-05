export function initPong() {
    const canvas = document.getElementById("pong") as HTMLCanvasElement;
    if (!canvas) return;
    const ctx = canvas.getContext("2d")!;

    const PADDLE_WIDTH = 10;
    const PADDLE_HEIGHT = 50;
    const BALL_SIZE = 10;
    const WIN_SCORE = 11;

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

    let leftPaddle: Paddle = { x: 20, y: canvas.height / 2 - PADDLE_HEIGHT / 2 };
    let rightPaddle: Paddle = { x: canvas.width - 30, y: canvas.height / 2 - PADDLE_HEIGHT / 2 };
    let AITarg = -1;
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
        ctx.font = "64px Bit5x3, monospace";
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

        if (ball.dx < 0 && ball.x <= leftPaddle.x + PADDLE_WIDTH &&
            ball.x + BALL_SIZE >= leftPaddle.x &&
            ball.y + BALL_SIZE >= leftPaddle.y &&
            ball.y <= leftPaddle.y + PADDLE_HEIGHT) {
            
            const paddleCenter = leftPaddle.y + PADDLE_HEIGHT / 2;
            const ballCenter = ball.y + BALL_SIZE / 2;
            const impact = (ballCenter - paddleCenter) / (PADDLE_HEIGHT / 2);
            const angle = impact * Math.PI / 4;
            const speed = Math.sqrt(ball.dx ** 2 + ball.dy ** 2) * 1.05;

            ball.dx = Math.abs(Math.cos(angle) * speed);
            ball.dy = Math.sin(angle) * speed;
            ball.x = leftPaddle.x + PADDLE_WIDTH;
            if (ball.y < leftPaddle.y) ball.y = leftPaddle.y - BALL_SIZE;
            else if (ball.y > leftPaddle.y + PADDLE_HEIGHT) ball.y = leftPaddle.y + PADDLE_HEIGHT;
        }

        if (ball.dx > 0 && ball.x + BALL_SIZE >= rightPaddle.x &&
            ball.x <= rightPaddle.x + PADDLE_WIDTH &&
            ball.y + BALL_SIZE >= rightPaddle.y &&
            ball.y <= rightPaddle.y + PADDLE_HEIGHT) {

            const paddleCenter = rightPaddle.y + PADDLE_HEIGHT / 2;
            const ballCenter = ball.y + BALL_SIZE / 2;
            const impact = (ballCenter - paddleCenter) / (PADDLE_HEIGHT / 2);
            const angle = impact * Math.PI / 4;
            const speed = Math.sqrt(ball.dx ** 2 + ball.dy ** 2) * 1.05;

            ball.dx = -Math.abs(Math.cos(angle) * speed);
            ball.dy = Math.sin(angle) * speed;
            ball.x = rightPaddle.x - BALL_SIZE;
            if (ball.y < rightPaddle.y) ball.y = rightPaddle.y - BALL_SIZE;
            else if (ball.y > rightPaddle.y + PADDLE_HEIGHT) ball.y = rightPaddle.y + PADDLE_HEIGHT;
        }

        if (ball.x < 0) {
            scoreRight++;
            resetBall("right")
        }
        if (ball.x > canvas.width) {
            scoreLeft++;
            resetBall("left")
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
        if (keys["w"] && leftPaddle.y > 0) leftPaddle.y -= 6;
        if (keys["s"] && leftPaddle.y + PADDLE_HEIGHT < canvas.height) leftPaddle.y += 6;

        //if (keys["ArrowUp"] && rightPaddle.y > 0) rightPaddle.y -= 6;
        //if (keys["ArrowDown"] && rightPaddle.y + PADDLE_HEIGHT < canvas.height) rightPaddle.y += 6;
    }

    function predictBallY(ball: Ball, paddleX: number): number {
        let {x, y, dx, dy} = ball;

        while (true) {
            const t = (paddleX - x) / dx;
            const yPred = y + dy * t;

            if (yPred >= 0 && yPred <= canvas.height - BALL_SIZE)
                return yPred;

            if (yPred < 0) {
                x += dx * (-y / dy);
                y = 0;
                dy = -dy;
            }
            else if (yPred > canvas.height - BALL_SIZE) {
                x += dx * (canvas.height - BALL_SIZE - y) / dy;
                y = canvas.height - BALL_SIZE;
                dy = -dy;
            }
        }
    }


    function    aiDecision() {
        if (ball.dx < 0)
            AITarg = -1;
        else
            AITarg = predictBallY(ball, rightPaddle.x);
    }

    function moveAIPaddle() {
        if (AITarg == -1)
        {
            if (rightPaddle.y > canvas.height / 2 + 3)
                rightPaddle.y -= 6;
            else if (rightPaddle.y < canvas.height / 2 - 3)
                rightPaddle.y += 6;
        }
        else
        {
            if (rightPaddle.y > AITarg)
                rightPaddle.y -= 6;
            else if (rightPaddle.y < AITarg - (PADDLE_HEIGHT / 1.1))
                rightPaddle.y += 6;
        }
    }

    function game() {
        ctx.clearRect(0, 0, canvas.width, canvas.height);

        drawCenterLine();
        drawRect(leftPaddle.x, leftPaddle.y, PADDLE_WIDTH, PADDLE_HEIGHT);
        drawRect(rightPaddle.x, rightPaddle.y, PADDLE_WIDTH, PADDLE_HEIGHT);
        drawBall(ball.x, ball.y, BALL_SIZE);
        drawScore();

        if (gameOver()) {
            ctx.font = "64px Bit5x3, monospace";
            ctx.fillStyle = "white";
            if (scoreLeft === WIN_SCORE)
                ctx.fillText("Player 1 win", canvas.width / 2 - 200, canvas.height / 2 + 32);
            else
                ctx.fillText("Player 2 win", canvas.width / 2 - 200, canvas.height / 2 + 32);
        }
        else if (!paused)
            moveBall();
        movePaddles();
        moveAIPaddle();
        requestAnimationFrame(game);
    }

    setInterval(aiDecision, 1000);
    game();
}