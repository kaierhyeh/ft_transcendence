// Type definitions for 4-player game
interface Paddle {
    x: number;
    y: number;
}

interface Player {
    paddle: Paddle;
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
    "top-left"?: Player;
    "bottom-left"?: Player;
    "top-right"?: Player;
    "bottom-right"?: Player;
}

interface GameState {
    players: Players;
    ball: Ball;
    score: Score;
    winner?: string;
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
    participant_id: string;
    move: "up" | "down" | "stop" | "";
}

interface JoinMessage {
    type: "join";
    participant_id: string;
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
    user_id: number;
    participant_id: string;
}

interface CreateGameRequest {
    type: "multi"; // Changed from "pvp" to "multi"
    participants: Participant[];
}

export function initGame4p(): void {

// Global variables
const API_GAME_ENDPOINT = `${window.location.origin}/api/game`;

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
    participant_id: "",
    move: ""
};
const join: JoinMessage = {
    type: "join",
    participant_id: ""
};
let ws: WebSocket | null = null;

// 4-player participant IDs
const participant_ids: string[] = [
    "session_id_0", // top-left
    "session_id_1", // bottom-left  
    "session_id_2", // top-right
    "session_id_3"  // bottom-right
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
            break;
        case "error":
            console.error(`[Server Error] ${message.message}`);
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
            setTimeout(() => connectWebSocket(id), 3000);
        }
        else {
            const winner = document.getElementById("winner");
            if (winner && winner.innerText.length === 0) {
                winner.innerText = game_state.winner + " team won !";
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
        console.log("Sending join requests for all 4 players");
        // Send join requests for all players
        participant_ids.forEach((id, index) => {
            join.participant_id = id;
            console.log(`Joining player ${index + 1}:`, join);
            ws!.send(JSON.stringify(join));
        });
    }

    setInterval(() => {
        if (ws && ws.readyState === WebSocket.OPEN) {
            // Top-left player (w/s)
            input.participant_id = participant_ids[0];
            if (keys["w"]) {
                input.move = "up";
            } else if (keys["s"]) {
                input.move = "down";
            } else {
                input.move = "stop";
            }
            ws.send(JSON.stringify(input));

            // Bottom-left player (a/z) 
            input.participant_id = participant_ids[1];
            if (keys["a"]) {
                input.move = "up";
            } else if (keys["z"]) {
                input.move = "down";
            } else {
                input.move = "stop";
            }
            ws.send(JSON.stringify(input));

            // Top-right player (ArrowUp/ArrowDown)
            input.participant_id = participant_ids[2];
            if (keys["ArrowUp"]) {
                input.move = "up";
            } else if (keys["ArrowDown"]) {
                input.move = "down";
            } else {
                input.move = "stop";
            }
            ws.send(JSON.stringify(input));

            // Bottom-right player (o/l)
            input.participant_id = participant_ids[3];
            if (keys["o"]) {
                input.move = "up";
            } else if (keys["l"]) {
                input.move = "down";
            } else {
                input.move = "stop";
            }
            ws.send(JSON.stringify(input));
        }
    }, 50); // Send input 20 times per second
}

function drawCenterLine(): void {
    if (!ctx || !game_conf) return;
    
    ctx.fillStyle = "white";
    for (let i = 0; i < game_conf.canvas_height; i += 20) {
        ctx.fillRect(game_conf.canvas_width / 2 - 1, i, 2, 10);
    }
}

function draw(): void {
    if (!game_state || !ctx || !game_conf) return;
    
    ctx.clearRect(0, 0, game_conf.canvas_width, game_conf.canvas_height);
    ctx.fillStyle = "white";
    
    // Draw center line
    drawCenterLine();
    
    // Draw all paddles
    const players = game_state.players;
    
    if (players["top-left"]) {
        ctx.fillRect(
            players["top-left"].paddle.x, 
            players["top-left"].paddle.y, 
            game_conf.paddle_width, 
            game_conf.paddle_height
        );
    }
    
    if (players["bottom-left"]) {
        ctx.fillRect(
            players["bottom-left"].paddle.x, 
            players["bottom-left"].paddle.y, 
            game_conf.paddle_width, 
            game_conf.paddle_height
        );
    }
    
    if (players["top-right"]) {
        ctx.fillRect(
            players["top-right"].paddle.x, 
            players["top-right"].paddle.y, 
            game_conf.paddle_width, 
            game_conf.paddle_height
        );
    }
    
    if (players["bottom-right"]) {
        ctx.fillRect(
            players["bottom-right"].paddle.x, 
            players["bottom-right"].paddle.y, 
            game_conf.paddle_width, 
            game_conf.paddle_height
        );
    }

    // Draw ball
    ctx.fillRect(game_state.ball.x, game_state.ball.y, game_conf.ball_size, game_conf.ball_size);

    // Display score (team-based)
    ctx.font = "64px Bit5x3, monospace";
    ctx.fillText(game_state.score.left.toString(), game_conf.canvas_width / 4, 50);
    ctx.fillText(game_state.score.right.toString(), 3 * game_conf.canvas_width / 4, 50);
    
    // Display controls
    ctx.font = "16px Bit5x3, monospace";
    ctx.fillText("Left Team: W/S (top) A/Z (bottom)", 20, game_conf.canvas_height - 60);
    ctx.fillText("Right Team: ↑/↓ (top) O/L (bottom)", 20, game_conf.canvas_height - 40);
}

async function run(): Promise<void> {
    if (!canvas || !ctx) {
        console.error("Canvas or context not available");
        return;
    }
    
    try {
        // Create 4-player game via REST API
        {
            const response = await fetch(API_GAME_ENDPOINT + "/create", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                },
                body: JSON.stringify({
                    type: "multi", // Changed to "multi" for 4-player
                    participants: [
                        { user_id: 0, participant_id: participant_ids[0] }, // top-left
                        { user_id: 1, participant_id: participant_ids[1] }, // bottom-left
                        { user_id: 2, participant_id: participant_ids[2] }, // top-right
                        { user_id: 3, participant_id: participant_ids[3] }  // bottom-right
                    ]
                } as CreateGameRequest)
            });
            const data: CreateGameResponse = await response.json();
            game_id = data.game_id;
            console.log("4-player game created with ID:", game_id);
        }
        
        // Get game configuration
        {
            const response = await fetch(API_GAME_ENDPOINT + `/${game_id}/conf`);
            game_conf = await response.json() as GameConfig;
            
            canvas.width = game_conf.canvas_width;
            canvas.height = game_conf.canvas_height;
            
            console.log("4-player game initialized:", game_conf);
        }
        
        connectWebSocket(game_id);
        
    } catch (error) {
        console.error("Failed to initialize 4-player game:", error);
    }
}

run();
}