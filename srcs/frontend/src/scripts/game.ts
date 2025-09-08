// Type definitions
interface Player {
    paddle_coord: number;
}

interface Ball {
    x: number;
    y: number;
}

interface Score {
    left: number;
    right: number;
}

interface Players {
    left: Player;
    right: Player;
}

interface GameState {
    players: Players;
    ball: Ball;
    score: Score;
    winner?: number;
}

interface GameConfig {
    canvas_width: number;
    canvas_height: number;
    paddle_width: number;
    paddle_height: number;
    ball_size: number;
}

interface InputMessage {
    type: "input";
    ticket: string;
    move: "up" | "down" | "stop" | "";
}

interface JoinMessage {
    type: "join";
    ticket: string;
}

interface ServerMessage {
    level: "info" | "warning" | "error";
    message: string;
}

interface GameStateMessage {
    type: "game_state";
    data: GameState;
}

interface ServerResponseMessage {
    type: "server_message";
    level: "info" | "warning" | "error";
    message: string;
}

interface CreateGameResponse {
    game_id: number;
}

interface Participant {
    player_id: number;
    match_ticket: string;
}

interface CreateGameRequest {
    type: "pvp";
    participants: Participant[];
}

export function initGame(): void {
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

const canvas = document.getElementById("pong") as HTMLCanvasElement;
if (!canvas) {
    console.error("Canvas element with id 'pong' not found");
    return;
}
const ctx = canvas.getContext("2d");
if (!ctx) {
    console.error("Unable to get 2D context from canvas");
    return;
}

let game_state: GameState | null = null;
let game_conf: GameConfig | null = null;
const keys: { [key: string]: boolean } = {};
const input: InputMessage = {
    type: "input",
    ticket: "",
    move: ""
};
const join: JoinMessage = {
    type: "join",
    ticket: ""
};
let ws: WebSocket | null = null;
const match_tickets: string[] = [
    "session_id_0",
    "session_id_1"
];
let game_id: number | null = null;

// Event listeners
document.addEventListener("keydown", function (e: KeyboardEvent) { keys[e.key] = true; });
document.addEventListener("keyup", function (e: KeyboardEvent) { keys[e.key] = false; });

function handleServerMessage(message: ServerMessage): void {
    switch (message.level) {
        case "info":
            console.info(`[Server] ${message.message}`);
            break;
        case "warning":
            console.warn(`[Server Warning] ${message.message}`);
            // You could show a subtle notification here
            break;
        case "error":
            console.error(`[Server Error] ${message.message}`);
            // You could show an error notification here
            break;
    }
}

// WebSocket connection for real-time updates
function connectWebSocket(id: number | undefined): void {
    if (id === undefined) {
        console.error("Cannot connect WebSocket: game_id is null");
        return;
    }
    
    const url = API_GAME_ENDPOINT + `/${id}/ws`;
    console.log("Attempting to connect to:", url);
    ws = new WebSocket(url);

    console.log(`websocket for /game/${id}/ws: `, ws);
    
    ws.onopen = function() {
        console.log("WebSocket connected successfully");
        startInputSending();
    };
    
    ws.onmessage = function(event: MessageEvent) {
        try {
            const message: GameStateMessage | ServerResponseMessage = JSON.parse(event.data);
            
            if (message.type === "game_state") {
                game_state = message.data;
                draw();
            } else if (message.type === "server_message") {
                handleServerMessage(message);
            }
        } catch (error) {
            console.error("Error parsing game data:", error);
        }
    };
    
    ws.onclose = function(event: CloseEvent) {
        console.log("WebSocket disconnected. Code:", event.code, "Reason:", event.reason);
        if (!game_state?.winner) {
            // Try to reconnect after 3 seconds
            setTimeout(connectWebSocket, 3000);
        }
        else {
            const winner = document.getElementById("winner");
            if (winner && winner.innerText.length === 0) {
                winner.innerText = "Player " + game_state.winner + " won !";
            }
        }
    };
    
    ws.onerror = function(error: Event) {
        console.error("WebSocket error:", error);
    };
}


// Send input periodically (much less frequent than rendering)
function startInputSending(): void {
    if (ws && ws.readyState === WebSocket.OPEN) {
        console.log("Sending join requests for both players");
        join.ticket = match_tickets[0];
        console.log(join);
        ws.send(JSON.stringify(join));
        join.ticket = match_tickets[1];
        console.log(join);
        ws.send(JSON.stringify(join));
    }

    setInterval(() => {
        if (ws && ws.readyState === WebSocket.OPEN) {
            // Left player (w/s)
            input.ticket = match_tickets[0];
            if (keys["w"]) {
                input.move = "up";
            } else if (keys["s"]) {
                input.move = "down";
            } else {
                input.move = "stop";
            }
            ws.send(JSON.stringify(input));

            // Right player (ArrowUp/ArrowDown)
            input.ticket = match_tickets[1];
            if (keys["ArrowUp"]) {
                input.move = "up";
            } else if (keys["ArrowDown"]) {
                input.move = "down";
            } else {
                input.move = "stop";
            }
            ws.send(JSON.stringify(input));
        }
    }, 50); // Send input 20 times per second (much better than 60!)
}

function draw(): void {
    if (!game_state || !ctx || !game_conf) return;
    //  console.log(game_state)
    
    ctx.clearRect(0, 0, game_conf.canvas_width, game_conf.canvas_height);
    ctx.fillStyle = "white";
    
    const left_player = game_state.players.left;
    const right_player = game_state.players.right;
    // Draw paddle Player 0
    if (left_player)
        ctx.fillRect(0, left_player.paddle_coord, game_conf.paddle_width, game_conf.paddle_height);
    
    // Draw paddle Player 1
    if (right_player)
        ctx.fillRect(game_conf.canvas_width - game_conf.ball_size, right_player.paddle_coord, game_conf.paddle_width, game_conf.paddle_height);

    // Draw ball
    ctx.fillRect(game_state.ball.x, game_state.ball.y, game_conf.ball_size, game_conf.ball_size);

    // Display score
    ctx.font = "48px Courier";
    // ctx.fillStyle = "white";
    // console.log("score: " + game_state.score[0] + " - " + game_state.score[1]);
    ctx.fillText(game_state.score.left.toString(), game_conf.canvas_width / 2 - 50, 50);
    ctx.fillText(game_state.score.right.toString(), game_conf.canvas_width / 2 + 50, 50);
}

async function run(): Promise<void> {
    if (!canvas || !ctx) {
        console.error("Canvas or context not available");
        return;
    }
    
    try {
        // Get initial game data via REST API
        {
            const response = await fetch(API_GAME_ENDPOINT + "/create", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                },
                body: JSON.stringify({
                    type: "pvp",
                    participants: [
                        { player_id: 0, match_ticket: match_tickets[0] },
                        { player_id: 1, match_ticket: match_tickets[1] },
                    ]
                } as CreateGameRequest)
            });
            const data: CreateGameResponse = await response.json();
            game_id = data.game_id;
            console.log(game_id);
        }
        {
            const response = await fetch(API_GAME_ENDPOINT + `/${game_id}/conf`);
            game_conf = await response.json() as GameConfig;
            
            canvas.width = game_conf.canvas_width;
            canvas.height = game_conf.canvas_height;
            
            console.log("Game initialized:", game_conf);
        }
        
        connectWebSocket(game_id);
        
    } catch (error) {
        console.error("Failed to initialize game:", error);
    }
}

run();
}