//global variable needed for all maybe change to kind of class later
//ball
let ball_pos_X = 100;
let ball_pos_Y = 100;
const BALL_SIZE = 20;

let ball_speed_X = 3;
let ball_speed_Y = 2;
// Board
const BOARD_WIDTH = 800;
const BOARD_HEIGHT = 400;
const BOARD_CENTER = BOARD_WIDTH / 2;

//paddle
let left_paddle_pos = 160;    
let right_paddle_pos = 160;  
const PADDLE_WIDTH = 15; 
const PADDLE_HEIGHT = 80;
const PADDLE_OFFSET = 20;
const PADDLE_SPEED = 6;
//keyboard
let keys = {};
//score
let p1_score = 0;
let p2_score = 0;

//graphic
const COLORS = {
    background: 'black',
    line: 'grey',
    ball: 'pink',
    paddle: 'blue',
    score: 'green'
};

function clearCanvas(ctx)
{
    ctx.fillStyle = COLORS.background;
    ctx.fillRect(0, 0, BOARD_WIDTH, BOARD_HEIGHT);
}

function drawCenterLine(ctx)
{
    ctx.strokeStyle = COLORS.line;
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(BOARD_CENTER, 0);
    ctx.lineTo(BOARD_CENTER, BOARD_HEIGHT);
    ctx.stroke();
}
//draws functions
function drawBall(ctx, x, y)
{
    ctx.fillStyle = COLORS.ball;
    ctx.fillRect(x, y, BALL_SIZE, BALL_SIZE);
}

function drawPaddles(ctx)
{
    ctx.fillStyle = COLORS.paddle;
    //left paddle
    ctx.fillRect(PADDLE_OFFSET, left_paddle_pos, PADDLE_WIDTH, PADDLE_HEIGHT);
    //right paddle
    ctx.fillRect(BOARD_WIDTH - PADDLE_OFFSET - PADDLE_WIDTH, right_paddle_pos, PADDLE_WIDTH, PADDLE_HEIGHT);
}

function drawScore(ctx)
{
    ctx.fillStyle = COLORS.score;
    ctx.font = '48px Arial';
    ctx.textAlign = 'center';
    
    // p1 left
    ctx.fillText(p1_score, BOARD_CENTER - 80, 60);
    // p2 right
    ctx.fillText(p2_score, BOARD_CENTER + 80, 60);
}

function drawGame(ctx)
{
    clearCanvas(ctx);
    drawCenterLine(ctx);
    drawBall(ctx, ball_pos_X, ball_pos_Y);
    drawPaddles(ctx);
    drawScore(ctx);
    console.log('balle pos atm : ', ball_pos_X, ball_pos_Y);
}

function checkKeyboardEvents()
{
    //press
    document.addEventListener('keydown', function(event) {
        keys[event.key] = true;
    });
    //release
    document.addEventListener('keyup', function(event) {
        keys[event.key] = false;
    });
}
function checkPaddleCollision()
{
    // left
    if (ball_pos_X <= PADDLE_OFFSET + PADDLE_WIDTH &&
        ball_pos_X >= PADDLE_OFFSET &&
        ball_pos_Y + BALL_SIZE >= left_paddle_pos &&
        ball_pos_Y <= left_paddle_pos + PADDLE_HEIGHT)
    {    
        ball_speed_X = -ball_speed_X;
        ball_pos_X = PADDLE_OFFSET + PADDLE_WIDTH;
    }
    
    let right_paddle_X = BOARD_WIDTH - PADDLE_OFFSET - PADDLE_WIDTH;
    if (ball_pos_X + BALL_SIZE >= right_paddle_X &&
        ball_pos_X <= right_paddle_X + PADDLE_WIDTH &&
        ball_pos_Y + BALL_SIZE >= right_paddle_pos &&
        ball_pos_Y <= right_paddle_pos + PADDLE_HEIGHT)
    {
        ball_speed_X = -ball_speed_X;
        ball_pos_X = right_paddle_X - BALL_SIZE;
    }
}

function updatePaddles()
{
    // left paddle W et S
    if (keys['w']) {
        if (left_paddle_pos > 0) {
            left_paddle_pos -= PADDLE_SPEED;
        }
    }
    if (keys['s']) {
        if (left_paddle_pos < BOARD_HEIGHT - PADDLE_HEIGHT) {
            left_paddle_pos += PADDLE_SPEED;
        }
    }
    // right paddle arrow up et down 
    if (keys['ArrowUp']) {
        if (right_paddle_pos > 0) {
            right_paddle_pos -= PADDLE_SPEED;
        }
    }
    if (keys['ArrowDown']) {
        if (right_paddle_pos < BOARD_HEIGHT - PADDLE_HEIGHT) {
            right_paddle_pos += PADDLE_SPEED;
        }
    }
}

function checkCollisions()
{
    checkPaddleCollision();
    // <- 
   /* if (ball_pos_X <= 0)
    {
        ball_speed_X = -ball_speed_X;
        ball_pos_X = 0;
    }
    // ->
    if (ball_pos_X >= BOARD_WIDTH - BALL_SIZE)
    {
        ball_speed_X = -ball_speed_X;
        ball_pos_X = BOARD_WIDTH - BALL_SIZE;
    }*/

    // <- goal
    if (ball_pos_X <= 0)
    {
        p2_score++;
        ball_pos_X = BOARD_WIDTH / 2;
        ball_pos_Y = BOARD_HEIGHT / 2;
        ball_speed_X = 4;
        ball_speed_Y = 3;
    }

    //-> goal
    if (ball_pos_X >= BOARD_WIDTH - BALL_SIZE)
    {
        p1_score++;
        ball_pos_X = BOARD_WIDTH / 2;
        ball_pos_Y = BOARD_HEIGHT / 2;
        ball_speed_X = -4;
        ball_speed_Y = -3;
    }
    // up
    if (ball_pos_Y <= 0)
    {
        ball_speed_Y = -ball_speed_Y;
        ball_pos_Y = 0;
    }
    // down
    if (ball_pos_Y >= BOARD_HEIGHT - BALL_SIZE)
    {
        ball_speed_Y = -ball_speed_Y;
        ball_pos_Y = BOARD_HEIGHT - BALL_SIZE;
    }
}

function updateBall()
{
    ball_pos_X += ball_speed_X;
    ball_pos_Y += ball_speed_Y;
    checkCollisions();
}

function gameLoop()
{
    updatePaddles();
    updateBall();
    
    const canvas = document.getElementById('pongBoard');
    const ctx = canvas.getContext('2d');
    drawGame(ctx);
    //fonction du navigateur(60fps)
    requestAnimationFrame(gameLoop);
}

function initGame() {
    const canvas = document.getElementById('pongBoard');
    const ctx = canvas.getContext('2d');

    checkKeyboardEvents();
    drawGame(ctx);
    gameLoop();
}