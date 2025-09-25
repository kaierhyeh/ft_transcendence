import "./types.js";

export function initGame(): void {
    // --- Constants & State ---
    const API_GAME_ENDPOINT = `${window.location.origin}/api/game`;
    let isAI: boolean = true;
    let AITarg: number = -1;
    let gameStarted: boolean = false;
    let gameEnded: boolean = false;
    let game_state: GameState | null = null;
    let game_state_4p: GameState4p | null = null;
    let game_conf: GameConfig | null = null;
    let ws: WebSocket | null = null;
    let game_id: number | null = null;
    let gameMode: 'pvp' | 'multi' = 'pvp';
    let aiInterval: number | null = null;
    let inputInterval: number | null = null;
    const participant_ids: string[] = ["session_id_0", "session_id_1", "session_id_2", "session_id_3"];
    const keys: { [key: string]: boolean } = {};
    const input: InputMessage = { type: "input", participant_id: "", move: "" };
    const join: JoinMessage = { type: "join", participant_id: "" };

    // --- DOM Elements ---
    const canvas = document.getElementById("pong") as HTMLCanvasElement;
    if (!canvas) {
        console.error("Canvas element with id 'pong' not found.");
        return;
    }
    const ctx = canvas.getContext("2d") as CanvasRenderingContext2D;
    if (!ctx) {
        console.error("Unable to get 2D context from canvas.");
        return;
    }

    // --- Game System API ---
    (window as any).setAIMode = setAIMode;
    (window as any).gameSystem = {
        draw: draw,
        gameState: () => game_state,
        gameConfig: () => game_conf,
        setGameState: (state: any) => { game_state = state; },
        setGameConfig: (config: any) => { game_conf = config; },
        setGameStarted: (started: boolean) => { gameStarted = started; },
        startGame: startGame
    };

    // --- Event Listeners ---
    document.addEventListener("keydown", function (e: KeyboardEvent) {
        keys[e.key] = true;
        if (e.key === " " && gameEnded) {
            e.preventDefault();
            restartGame();
        }
    });
    document.addEventListener("keyup", function (e: KeyboardEvent) { keys[e.key] = false; });

    // --- UI Setup ---
    setTimeout(setupGameButtons, 100);
    draw();

    function setupGameButtons(): void {
        const onePlayerBtn = document.getElementById('one-player-btn') as HTMLButtonElement;
        const twoPlayersBtn = document.getElementById('two-players-btn') as HTMLButtonElement;
        const fourPlayersBtn = document.getElementById('four-players-btn') as HTMLButtonElement;
        
        if (onePlayerBtn) {
            onePlayerBtn.addEventListener('click', (e) => {
                e.preventDefault();
                e.stopPropagation();
                updateButtonStates('one');
                setAIMode(true);
            });
        }
        if (twoPlayersBtn) {
            twoPlayersBtn.addEventListener('click', (e) => {
                e.preventDefault();
                e.stopPropagation();
                updateButtonStates('two');
                setAIMode(false);
            });
        }
        if (fourPlayersBtn) {
            fourPlayersBtn.addEventListener('click', (e) => {
                e.preventDefault();
                e.stopPropagation();
                updateButtonStates('four');
                start4PlayerGame();
            });
        }
    }

    function updateButtonStates(activeButton: 'one' | 'two' | 'four'): void {
        const onePlayerBtn = document.getElementById('one-player-btn') as HTMLButtonElement;
        const twoPlayersBtn = document.getElementById('two-players-btn') as HTMLButtonElement;
        const fourPlayersBtn = document.getElementById('four-players-btn') as HTMLButtonElement;

        [onePlayerBtn, twoPlayersBtn, fourPlayersBtn].forEach(btn => {
            if (btn) btn.classList.remove('active');
        });

        switch (activeButton) {
            case 'one':
                if (onePlayerBtn) onePlayerBtn.classList.add('active');
                break;
            case 'two':
                if (twoPlayersBtn) twoPlayersBtn.classList.add('active');
                break;
            case 'four':
                if (fourPlayersBtn) fourPlayersBtn.classList.add('active');
                break;
        }
    }

    function cleanupCurrentGame(): void {
        console.log("Cleaning up current game - WS state:", ws?.readyState, "Game ID:", game_id);
        
        if (aiInterval) {
            console.log("Clearing AI interval");
            clearInterval(aiInterval);
            aiInterval = null;
        }
        if (inputInterval) {
            console.log("Clearing input interval");
            clearInterval(inputInterval);
            inputInterval = null;
        }

        if (ws && ws.readyState !== WebSocket.CLOSED) {
            console.log("Closing WebSocket");
            ws.close(1000, "Game mode changed");
            ws = null;
        }

        gameStarted = false;
        gameEnded = false;
        game_state = null;
        game_state_4p = null;
        game_conf = null;
        game_id = null;
        AITarg = -1;

        const winner = document.getElementById("winner.");
        if (winner) winner.innerText = "";

        if (ctx)
            ctx.clearRect(0, 0, canvas.width, canvas.height);
        
        console.log("Cleanup completed");
    }

    // --- Game Control Functions ---
    function setAIMode(mode: boolean): void {
        console.log("Setting AI mode to:", mode, "- Current gameStarted:", gameStarted);
        
        if (gameStarted || gameEnded || ws !== null) {
            console.log("Cleaning up current game before starting new one");
            cleanupCurrentGame();
        }
        
        isAI = mode;
        gameMode = 'pvp';
        startGame();
    }

    function start4PlayerGame(): void {
        console.log("Starting 4-player game");
        
        if (gameStarted || gameEnded || ws !== null) {
            console.log("Cleaning up current game before starting 4-player game");
            cleanupCurrentGame();
        }
        
        gameMode = 'multi';
        isAI = false;
        startGame();
    }

    function startGame(): void {
        gameStarted = true;
        gameEnded = false;
        run();
    }

    function restartGame(): void {
        if (gameEnded) {
            cleanupCurrentGame();
            startGame();
        }
    }

    // --- Networking ---
    function connectWebSocket(id: number | undefined): void {
        if (id === undefined) {
            console.error("Cannot connect WebSocket: game_id is null.");
            return;
        }
        const url = API_GAME_ENDPOINT + `/${id}/ws`;
        console.log("Attempting to connect to:", url);
        ws = new WebSocket(url);
        console.log(`websocket for /game/${id}/ws: `, ws);
        
        ws.onopen = function () {
            console.log("WebSocket connected successfully.");
            startInputSending();
            
            if (isAI) {
                aiInterval = setInterval(() => {
                    AIDecision();
                }, 1000);
            }
        };
        
        ws.onmessage = function (event: MessageEvent) {
            try {
                const message: GameStateMessage | GameStateMessage4p | ServerResponseMessage = JSON.parse(event.data);
                if (message.type === "game_state") {
                    if (gameMode === 'pvp') {
                        game_state = (message as GameStateMessage).data;
                        game_state_4p = null;
                    } else {
                        game_state_4p = (message as GameStateMessage4p).data;
                        game_state = null;
                    }
                    draw();
                } else if (message.type === "server_message")
                    handleServerMessage(message);
            } catch (error) {
                console.error("Error parsing game data:", error);
            }
        };
        
        ws.onclose = function (event: CloseEvent) {
            console.log("WebSocket disconnected. Code:", event.code, "Reason:", event.reason);
            
            if (event.code !== 1000) {
                if (aiInterval) {
                    clearInterval(aiInterval);
                    aiInterval = null;
                }
                if (inputInterval) {
                    clearInterval(inputInterval);
                    inputInterval = null;
                }
            }
            
            if (!game_state?.winner && event.code !== 1000)
                setTimeout(() => connectWebSocket(id), 3000);
            else if (game_state?.winner) {
                const winner = document.getElementById("winner.");
                if (winner && winner.innerText.length === 0)
                    winner.innerText = "Player " + game_state.winner + " won !";
            }
        };
        
        ws.onerror = function (error: Event) {
            console.error("WebSocket error:", error);
        };
    }

    function startInputSending(): void {
        if (ws && ws.readyState === WebSocket.OPEN) {
            console.log(`Sending join requests for ${gameMode === 'pvp' ? '2' : '4'} players.`);
            
            if (gameMode === 'pvp') {
                join.participant_id = participant_ids[0];
                ws.send(JSON.stringify(join));
                join.participant_id = participant_ids[1];
                ws.send(JSON.stringify(join));
            } else {
                participant_ids.forEach((id, index) => {
                    join.participant_id = id;
                    console.log(`Joining player ${index + 1}:`, join);
                    ws!.send(JSON.stringify(join));
                });
            }
        }

        inputInterval = setInterval(() => {
            if (ws && ws.readyState === WebSocket.OPEN) {
                if (gameMode === 'pvp') {
                    input.participant_id = participant_ids[0];
                    if (keys["w"]) input.move = "up";
                    else if (keys["s"]) input.move = "down";
                    else input.move = "stop";
                    ws.send(JSON.stringify(input));
                    
                    if (isAI) moveAIPaddle();
                    else {
                        input.participant_id = participant_ids[1];
                        if (keys["ArrowUp"]) input.move = "up";
                        else if (keys["ArrowDown"]) input.move = "down";
                        else input.move = "stop";
                    }
                    ws.send(JSON.stringify(input));
                } else {
                    input.participant_id = participant_ids[0];
                    if (keys["w"]) input.move = "up";
                    else if (keys["s"]) input.move = "down";
                    else input.move = "stop";
                    ws.send(JSON.stringify(input));

                    input.participant_id = participant_ids[1];
                    if (keys["a"]) input.move = "up";
                    else if (keys["z"]) input.move = "down";
                    else input.move = "stop";
                    ws.send(JSON.stringify(input));

                    input.participant_id = participant_ids[2];
                    if (keys["ArrowUp"]) input.move = "up";
                    else if (keys["ArrowDown"]) input.move = "down";
                    else input.move = "stop";
                    ws.send(JSON.stringify(input));

                    input.participant_id = participant_ids[3];
                    if (keys["o"]) input.move = "up";
                    else if (keys["l"]) input.move = "down";
                    else input.move = "stop";
                    ws.send(JSON.stringify(input));
                }
            }
        }, 50);
    }

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

    // --- AI Logic ---
    function predictBallY(ball: Ball, paddleX: number, canvas_width: number, canvas_height: number, ball_size: number): number {
        let { x, y, dx, dy } = ball;
        while (true) {
            const t = (paddleX - x) / dx;
            const yPred = y + dy * t;
            if (yPred >= 0 && yPred <= canvas_height - ball_size) return yPred;
            if (yPred < 0) {
                x += dx * (-y / dy);
                y = 0;
                dy = -dy;
            } else if (yPred > canvas_height - ball_size) {
                x += dx * (canvas_height - ball_size - y) / dy;
                y = canvas_height - ball_size;
                dy = -dy;
            }
        }
    }
    
    function AIDecision(): void {
        if (!game_state || !game_conf) return;
        const ball = game_state.ball;
        if (ball.dx < 0) AITarg = -1;
        else AITarg = predictBallY(ball, game_state.players.right.paddle.x, game_conf.canvas_width, game_conf.canvas_height, game_conf.ball_size);
    }
    
    function moveAIPaddle(): void {
        if (!game_state || !game_conf) return;
        const rightPaddle = game_state.players.right;
        input.participant_id = participant_ids[1];
        if (AITarg == -1) {
            if (rightPaddle.paddle.y > game_conf.canvas_height / 2 + 15) input.move = "up";
            else if (rightPaddle.paddle.y < game_conf.canvas_height / 2 - 15) input.move = "down";
            else input.move = "stop";
        } else {
            if (rightPaddle.paddle.y > AITarg) input.move = "up";
            else if (rightPaddle.paddle.y < AITarg - (game_conf.paddle_height / 1.1)) input.move = "down";
            else input.move = "stop";
        }
    }

    // --- Drawing ---
    function drawCenterLine(): void {
        if (!ctx || !game_conf) return;
        ctx.fillStyle = "white";
        for (let i = 0; i < game_conf.canvas_height; i += 20) {
            ctx.fillRect(game_conf.canvas_width / 2 - 1, i, 2, 10);
        }
    }
    
    function draw(): void {
        if (!ctx) return;
        const canvasWidth = game_conf?.canvas_width || canvas.width;
        const canvasHeight = game_conf?.canvas_height || canvas.height;
        ctx.clearRect(0, 0, canvasWidth, canvasHeight);
        
        if (!gameStarted) {
            ctx.fillStyle = "white";
            ctx.font = "32px Bit5x3, monospace";
            ctx.textAlign = "center";
            ctx.fillText("Select a game mode", canvasWidth / 2, canvasHeight / 2);
            ctx.textAlign = "left";
            return;
        }

        if (gameMode === 'pvp') {
            if (!game_state || !game_conf) return;
            ctx.fillStyle = "white";
            drawCenterLine();
            
            const left_player = game_state.players.left;
            const right_player = game_state.players.right;
            if (left_player) ctx.fillRect(left_player.paddle.x, left_player.paddle.y, game_conf.paddle_width, game_conf.paddle_height);
            if (right_player) ctx.fillRect(right_player.paddle.x, right_player.paddle.y, game_conf.paddle_width, game_conf.paddle_height);
            
            ctx.fillRect(game_state.ball.x, game_state.ball.y, game_conf.ball_size, game_conf.ball_size);
            
            ctx.font = "64px Bit5x3, monospace";
            ctx.fillStyle = "white";
            ctx.fillText(game_state.score.left.toString(), game_conf.canvas_width / 4, 50);
            ctx.fillText(game_state.score.right.toString(), 3 * game_conf.canvas_width / 4, 50);
            
            if (game_state.winner) {
                gameEnded = true;
                ctx.font = "32px Bit5x3, monospace";
                ctx.textAlign = "center";
                ctx.fillText(`Player ${game_state.winner} wins!`, game_conf.canvas_width / 2, game_conf.canvas_height / 2);
                ctx.font = "24px Bit5x3, monospace";
                ctx.fillText("Press SPACE to restart", game_conf.canvas_width / 2, game_conf.canvas_height / 2 + 50);
                ctx.textAlign = "left";
            }
        } else {
            if (!game_state_4p || !game_conf) return;
            ctx.fillStyle = "white";
            drawCenterLine();
            
            const players = game_state_4p.players;
            
            if (players["top-left"])
                ctx.fillRect(players["top-left"].paddle.x, players["top-left"].paddle.y, game_conf.paddle_width, game_conf.paddle_height);
            if (players["bottom-left"])
                ctx.fillRect(players["bottom-left"].paddle.x, players["bottom-left"].paddle.y, game_conf.paddle_width, game_conf.paddle_height);
            if (players["top-right"])
                ctx.fillRect(players["top-right"].paddle.x, players["top-right"].paddle.y, game_conf.paddle_width, game_conf.paddle_height);
            if (players["bottom-right"])
                ctx.fillRect(players["bottom-right"].paddle.x, players["bottom-right"].paddle.y, game_conf.paddle_width, game_conf.paddle_height);

            ctx.fillRect(game_state_4p.ball.x, game_state_4p.ball.y, game_conf.ball_size, game_conf.ball_size);

            ctx.font = "64px Bit5x3, monospace";
            ctx.fillText(game_state_4p.score.left.toString(), game_conf.canvas_width / 4, 50);
            ctx.fillText(game_state_4p.score.right.toString(), 3 * game_conf.canvas_width / 4, 50);
            
            ctx.font = "16px Bit5x3, monospace";
            ctx.fillText("Left Team: W/S (top) A/Z (bottom)", 20, game_conf.canvas_height - 60);
            ctx.fillText("Right Team: ↑/↓ (top) O/L (bottom)", 20, game_conf.canvas_height - 40);
            
            if (game_state_4p.winner) {
                gameEnded = true;
                ctx.font = "32px Bit5x3, monospace";
                ctx.textAlign = "center";
                ctx.fillText(`${game_state_4p.winner} team wins!`, game_conf.canvas_width / 2, game_conf.canvas_height / 2);
                ctx.font = "24px Bit5x3, monospace";
                ctx.fillText("Press SPACE to restart", game_conf.canvas_width / 2, game_conf.canvas_height / 2 + 50);
                ctx.textAlign = "left";
            }
        }
    }

    // --- Game Loop ---
    async function run(): Promise<void> {
        if (!canvas || !ctx) {
            console.error("Canvas or context not available.");
            return;
        }
        try {
            {
                let requestBody;
                if (gameMode === 'pvp') {
                    requestBody = {
                        type: "pvp",
                        participants: [
                            { user_id: 0, participant_id: participant_ids[0], is_ai: false },
                            { user_id: 1, participant_id: participant_ids[1], is_ai: isAI },
                        ],
                    } as CreateGameRequest;
                } else {
                    requestBody = {
                        type: "multi",
                        participants: [
                            { user_id: 0, participant_id: participant_ids[0] },
                            { user_id: 1, participant_id: participant_ids[1] },
                            { user_id: 2, participant_id: participant_ids[2] },
                            { user_id: 3, participant_id: participant_ids[3] }
                        ],
                    } as CreateGameRequest4p;
                }
                
                const response = await fetch(API_GAME_ENDPOINT + "/create", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify(requestBody)
                });
                const data: CreateGameResponse = await response.json();
                game_id = data.game_id;
                console.log(`${gameMode === 'pvp' ? '2-player' : '4-player'} game created with ID:`, game_id);
            }
            {
                const response = await fetch(API_GAME_ENDPOINT + `/${game_id}/conf`);
                game_conf = await response.json() as GameConfig;
                canvas.width = game_conf.canvas_width;
                canvas.height = game_conf.canvas_height;
                console.log(`${gameMode === 'pvp' ? '2-player' : '4-player'} game initialized:`, game_conf);
            }
            connectWebSocket(game_id);
        } catch (error) {
            console.error(`Failed to initialize ${gameMode === 'pvp' ? '2-player' : '4-player'} game:`, error);
        }
    }
}
