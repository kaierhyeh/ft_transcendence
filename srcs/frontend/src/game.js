// var canvas = document.getElementById("game");
// var ctx = canvas.getContext("2d");
// var WIDTH = canvas.width;
// var HEIGHT = canvas.height;
// var PADDLE_WIDTH = 10;
// var PADDLE_HEIGHT = 80;
// var paddleY = HEIGHT / 2 - PADDLE_HEIGHT / 2;
// var PADDLE_SPEED = 4;
// var BALL_SIZE = 10;
// var BALL_SPEED = 3;
// var MAX_BOUNCE_ANGLE = Math.PI / 4;
// var ballX = WIDTH / 2 - BALL_SIZE / 2;
// var ballY = HEIGHT / 2 - BALL_SIZE / 2;
// var ballVX = BALL_SPEED;
// var ballVY = BALL_SPEED / 2;
// var keys = {};
// document.addEventListener("keydown", function (e) { return keys[e.key] = true; });
// document.addEventListener("keyup", function (e) { return keys[e.key] = false; });
// function update() {
//     if (keys["ArrowUp"] && paddleY > 0)
//         paddleY -= PADDLE_SPEED;
//     if (keys["ArrowDown"] && paddleY < HEIGHT - PADDLE_HEIGHT)
//         paddleY += PADDLE_SPEED;
//     ballX += ballVX;
//     ballY += ballVY;
//     if (ballY <= 0 || ballY + BALL_SIZE >= HEIGHT)
//         ballVY = -ballVY;
//     if (ballVX < 0 &&
//         ballX <= PADDLE_WIDTH &&
//         ballY + BALL_SIZE >= paddleY &&
//         ballY <= paddleY + PADDLE_HEIGHT) {
//         var relativeIntersectY = (paddleY + PADDLE_HEIGHT / 2) - (ballY + BALL_SIZE / 2);
//         var normalizedIntersectY = relativeIntersectY / (PADDLE_HEIGHT / 2);
//         var bounceAngle = normalizedIntersectY * MAX_BOUNCE_ANGLE;
//         ballVX = BALL_SPEED * Math.cos(bounceAngle);
//         ballVY = -BALL_SPEED * Math.sin(bounceAngle);
//     }
//     if (ballX <= 0 || ballX + BALL_SIZE >= WIDTH)
//         ballVX = -ballVX;
// }
// function draw() {
//     ctx.clearRect(0, 0, WIDTH, HEIGHT);
//     ctx.fillStyle = "white";
//     ctx.fillRect(0, paddleY, PADDLE_WIDTH, PADDLE_HEIGHT);
//     ctx.fillRect(ballX, ballY, BALL_SIZE, BALL_SIZE);
// }
// function loop() {
//     update();
//     draw();
//     requestAnimationFrame(loop);
// }
// loop();



// Global variables
const API_GAME_ENDPOINT = "https://localhost:4443/api/game";

let canvas = document.getElementById("game");
let ctx = canvas.getContext("2d");
let game_data;
let keys = {};

// Event listeners
document.addEventListener("keydown", function (e) {return keys[e.key] = true; });
document.addEventListener("keyup", function (e) { return keys[e.key] = false; });

async function getGameData() {
    const url = API_GAME_ENDPOINT + "/data";
    try {
        const response = await fetch(url);
        if (!response.ok) {
            throw new Error(`Response status: ${response.status}`);
        }

        return await response.json();
    } catch (error) {
        return error;
    }
}

async function postUserInput() {
    if (Object.keys(keys).length === 0)
        return ;
    const url = API_GAME_ENDPOINT + "/input";
    await fetch(url, {
        method: "POST",
        body: JSON.stringify(keys),
        headers: {
            "Content-type": "application/json; charset=UTF-8"
        }
    });
}

function draw() {
    if (!game_data) return; // Safety check
    ctx.clearRect(0, 0, game_data.canvas_width, game_data.canvas_height);
    ctx.fillStyle = "black";
    ctx.fillRect(0, game_data.paddleY, game_data.paddle_width, game_data.paddle_height);
}

async function init() {
    try {
        game_data = await getGameData();
        canvas.width = game_data.canvas_width;
        canvas.height = game_data.canvas_height;
        console.log("Game initialized:", game_data);
    } catch (error) {
        console.error("Failed to initialize game:", error);
    }
}

async function gameLoop() {
    try {
        await postUserInput();
        game_data = await getGameData();
        draw();
    } catch (error) {
        console.error("Game loop error:", error);
    }
    
    // Use requestAnimationFrame for smooth animation (60fps max)
    requestAnimationFrame(gameLoop);
}

async function main() {
    await init();
    gameLoop();
}

main();
