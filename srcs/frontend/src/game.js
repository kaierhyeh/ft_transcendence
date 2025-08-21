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
const WS_GAME_ENDPOINT = "wss://localhost:4443/api/game/ws";
const API_GAME_ENDPOINT = "https://localhost:4443/api/game";

let canvas = document.getElementById("game");
let ctx = canvas.getContext("2d");
let game_data;
let keys = {};
let ws;

// Event listeners
document.addEventListener("keydown", function (e) { keys[e.key] = true; });
document.addEventListener("keyup", function (e) { keys[e.key] = false; });

// WebSocket connection for real-time updates
function connectWebSocket() {
    console.log("Attempting to connect to:", WS_GAME_ENDPOINT);
    ws = new WebSocket(WS_GAME_ENDPOINT);
    
    ws.onopen = function() {
        console.log("WebSocket connected successfully");
        startInputSending();
    };
    
    ws.onmessage = function(event) {
        try {
            game_data = JSON.parse(event.data);
            draw();
        } catch (error) {
            console.error("Error parsing game data:", error);
        }
    };
    
    ws.onclose = function(event) {
        console.log("WebSocket disconnected. Code:", event.code, "Reason:", event.reason);
        if (game_data.ongoing) {
            // Try to reconnect after 3 seconds
            setTimeout(connectWebSocket, 3000);
        }
        else {
            const winner = document.getElementById("winner");
            if (winner.innerText.length == 0) {
                winner.innerText = "Player " + game_data.score.indexOf(game_data.win_point) + " won !";
            }
        }
    };
    
    ws.onerror = function(error) {
        console.error("WebSocket error:", error);
    };
}

// Fallback: use REST API if WebSocket fails
async function fallbackToREST() {
    console.log("Using REST API fallback");
    setInterval(async () => {
        try {
            await postUserInput();
            const response = await fetch(API_GAME_ENDPOINT + "/data");
            game_data = await response.json();
            draw();
        } catch (error) {
            console.error("REST API error:", error);
        }
    }, 100); // 10fps for REST fallback
}


// Send input periodically (much less frequent than rendering)
function startInputSending() {
    setInterval(() => {
        if (ws && ws.readyState === WebSocket.OPEN) {
            // Only send if there are active keys
            const activeKeys = Object.keys(keys).filter(key => keys[key]);
            if (activeKeys.length > 0) {
                const inputData = {};
                activeKeys.forEach(key => inputData[key] = true);
                ws.send(JSON.stringify(inputData));
            }
        }
    }, 50); // Send input 20 times per second (much better than 60!)
}

function draw() {
    if (!game_data) return;
    
    ctx.clearRect(0, 0, game_data.canvas_width, game_data.canvas_height);
    ctx.fillStyle = "white";
    
    // Draw paddle Player 0
    ctx.fillRect(game_data.players[0].paddleX, game_data.players[0].paddleY, game_data.paddle_width, game_data.paddle_height);
    
    // Draw paddle Player 1
    ctx.fillRect(game_data.players[1].paddleX, game_data.players[1].paddleY, game_data.paddle_width, game_data.paddle_height);

    // Draw ball
    ctx.fillRect(game_data.ballX, game_data.ballY, 10, 10);

    // Display score
    ctx.font = "48px Courier";
    // ctx.fillStyle = "white";
    console.log("score: " + game_data.score[0] + " - " + game_data.score[1]);
    ctx.fillText(game_data.score[0], game_data.canvas_width / 2 - 50, 50);
    ctx.fillText(game_data.score[1], game_data.canvas_width / 2 + 50, 50);
}

async function init() {
    try {
        // Get initial game data via REST API
        const response = await fetch(API_GAME_ENDPOINT + "/data");
        game_data = await response.json();
        
        canvas.width = game_data.canvas_width;
        canvas.height = game_data.canvas_height;
        
        console.log("Game initialized:", game_data);
        
        connectWebSocket();
        
    } catch (error) {
        console.error("Failed to initialize game:", error);
    }
}

init();
