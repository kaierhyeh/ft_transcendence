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
let game_state;
let keys = {};
const input = {
    type: "input",
    session_id: "",
    move: ""
}
let ws;
let session_ids = [
    "session_id_0",
    "session_id_1"
]

// Event listeners
document.addEventListener("keydown", function (e) { keys[e.key] = true; });
document.addEventListener("keyup", function (e) { keys[e.key] = false; });

// WebSocket connection for real-time updates
function connectWebSocket() {
    const url = API_GAME_ENDPOINT + "/ws";
    console.log("Attempting to connect to:", url);
    ws = new WebSocket(url);
    
    ws.onopen = function() {
        console.log("WebSocket connected successfully");
        startInputSending();
    };
    
    ws.onmessage = function(event) {
        try {
            game_state = JSON.parse(event.data);
            draw();
        } catch (error) {
            console.error("Error parsing game data:", error);
        }
    };
    
    ws.onclose = function(event) {
        console.log("WebSocket disconnected. Code:", event.code, "Reason:", event.reason);
        if (game_state.ongoing) {
            // Try to reconnect after 3 seconds
            setTimeout(connectWebSocket, 3000);
        }
        else {
            const winner = document.getElementById("winner");
            if (winner.innerText.length == 0) {
                winner.innerText = "Player " + game_state.score.indexOf(game_properties.win_point) + " won !";
            }
        }
    };
    
    ws.onerror = function(error) {
        console.error("WebSocket error:", error);
    };
}

// Send input periodically (much less frequent than rendering)
function startInputSending() {
    setInterval(() => {
        if (ws && ws.readyState === WebSocket.OPEN) {
            // Only send if there are active keys
            const activeKeys = Object.keys(keys).filter(key => keys[key]);
            if (activeKeys.length > 0) {
                    // console.log(input);
                const inputData = {};
                activeKeys.forEach(key => inputData[key] = true);
                if (inputData["w"] || inputData["s"]) {
                    input.session_id = session_ids[0];
                    input.move = inputData["w"] ? "up" : "down";
                    // console.log(input);
                    ws.send(JSON.stringify(input));
                }
                if (inputData["ArrowUp"] || inputData["ArrowDown"]) {
                    input.session_id = session_ids[1];
                    input.move = inputData["ArrowUp"] ? "up" : "down";
                    // console.log(input);
                    ws.send(JSON.stringify(input));
                }
            }
        }
    }, 50); // Send input 20 times per second (much better than 60!)
}

function draw() {
    if (!game_state) return;
     console.log(game_state)
    
    ctx.clearRect(0, 0, game_properties.canvas_width, game_properties.canvas_height);
    ctx.fillStyle = "white";
    
    // Draw paddle Player 0
    ctx.fillRect(0, game_state.paddle_y[0], game_properties.paddle_width, game_properties.paddle_height);
    
    // Draw paddle Player 1
    ctx.fillRect(game_properties.canvas_width - game_properties.ball_size, game_state.paddle_y[1], game_properties.paddle_width, game_properties.paddle_height);

    // Draw ball
    ctx.fillRect(game_state.ball.x, game_state.ball.y, game_properties.ball_size, game_properties.ball_size);

    // Display score
    ctx.font = "48px Courier";
    // ctx.fillStyle = "white";
    // console.log("score: " + game_state.score[0] + " - " + game_state.score[1]);
    ctx.fillText(game_state.score[0], game_properties.canvas_width / 2 - 50, 50);
    ctx.fillText(game_state.score[1], game_properties.canvas_width / 2 + 50, 50);
}

async function run() {
    try {
        // Get initial game data via REST API
        {
            const response = await fetch(API_GAME_ENDPOINT + "/properties");
            game_properties = await response.json();
            
            canvas.width = game_properties.canvas_width;
            canvas.height = game_properties.canvas_height;
            
            console.log("Game initialized:", game_properties);

        }    
        {
            await fetch(API_GAME_ENDPOINT + "/start", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                },
                body: JSON.stringify(
                    { session_id: session_ids[0] }
                )
            });
        }
        {
            await fetch(API_GAME_ENDPOINT + "/start", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                },
                body: JSON.stringify(
                    { session_id: session_ids[1] }
                )
            });
        }
        
        
        connectWebSocket();
        
    } catch (error) {
        console.error("Failed to initialize game:", error);
    }
}

run();
