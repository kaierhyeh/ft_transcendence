import "./types.js";

export function initGame(): void {
    // --- Constants & State ---
    const API_GAME_ENDPOINT = `${window.location.origin}/api/game`;
    const API_MATCHMAKING_ENDPOINT = `${window.location.origin}/api/match`;
    let isAI: boolean = true;
    let AITarg: number = -1;
    let gameStarted: boolean = false;
    let gameEnded: boolean = false;
    let game_state: GameState | null = null;
    let game_state_4p: GameState4p | null = null;
    let game_conf: GameConfig | null = null;
    let websockets: WebSocket[] = [];  // Array of websockets, one per player
    let game_id: number | null = null;
    let gameMode: 'pvp' | 'multi' = 'pvp';
    let jwtTickets: string[] = [];  // Store JWT tickets for each player
    let aiInterval: number | null = null;
    let inputInterval: number | null = null;
    const keys: { [key: string]: boolean } = {};

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

    // --- Matchmaking Service API ---
    async function createMatch(participants: any[]): Promise<{ game_id: number; jwt_tickets: string[] }> {
        try {
            const response = await fetch(`${API_MATCHMAKING_ENDPOINT}/make`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    mode: gameMode === 'multi' ? 'multi' : 'pvp',
                    participants: participants
                })
            });

            if (!response.ok) {
                throw new Error(`Matchmaking failed: ${response.status}`);
            }

            return await response.json();
        } catch (error) {
            console.error('Failed to create match:', error);
            throw error;
        }
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
        console.log("Cleaning up current game - WebSockets count:", websockets.length, "Game ID:", game_id);
        
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

        // Close all WebSocket connections
        websockets.forEach((ws, index) => {
            if (ws && ws.readyState !== WebSocket.CLOSED) {
                console.log(`Closing WebSocket ${index}`);
                ws.close(1000, "Game mode changed");
            }
        });
        websockets = [];

        gameStarted = false;
        gameEnded = false;
        game_state = null;
        game_state_4p = null;
        game_conf = null;
        game_id = null;
        jwtTickets = [];
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
        
        if (gameStarted || gameEnded || websockets.length > 0) {
            console.log("Cleaning up current game before starting new one");
            cleanupCurrentGame();
        }
        
        isAI = mode;
        gameMode = 'pvp';
        startGame();
    }

    function start4PlayerGame(): void {
        console.log("Starting 4-player game");
        
        if (gameStarted || gameEnded || websockets.length > 0) {
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
    function connectWebSockets(id: number | undefined): void {
        if (id === undefined) {
            console.error("Cannot connect WebSocket: game_id is null.");
            return;
        }
        
        const numPlayers = gameMode === 'pvp' ? 2 : 4;
        console.log(`Creating ${numPlayers} WebSocket connections for game ${id}`);
        
        // Create WebSocket connections for each player
        for (let i = 0; i < numPlayers; i++) {
            const url = API_GAME_ENDPOINT + `/${id}/ws`;
            console.log(`Connecting WebSocket ${i} to:`, url);
            
            const ws = new WebSocket(url);
            websockets.push(ws);
            
            ws.onopen = function () {
                console.log(`WebSocket ${i} connected successfully.`);
                
                // Send join message with JWT ticket
                const joinMessage = {
                    type: "join",
                    ticket: jwtTickets[i]
                };
                ws.send(JSON.stringify(joinMessage));
                
                // Start AI logic if this is an AI player (index 1 for PvP mode)
                if (isAI && gameMode === 'pvp' && i === 1) {
                    AIDecision();
                    aiInterval = setInterval(() => {
                        AIDecision();
                        moveAIPaddle(i);
                    }, 100);
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
                    } else if (message.type === "server_message") {
                        handleServerMessage(message);
                    }
                } catch (error) {
                    console.error(`Failed to parse WebSocket ${i} message:`, error);
                }
            };
            
            ws.onclose = function (event: CloseEvent) {
                console.log(`WebSocket ${i} disconnected. Code:`, event.code, "Reason:", event.reason);
                
                if (event.code !== 1000) {
                    console.log(`WebSocket ${i} connection interrupted:`, {
                        code: event.code,
                        reason: event.reason,
                        wasClean: event.wasClean
                    });
                }
                
                // Check if game finished
                if (gameMode === 'pvp' && game_state?.winner) {
                    console.log("Game finished with winner:", game_state.winner);
                    gameEnded = true;
                    const winner = document.getElementById("winner.");
                    if (winner && winner.innerText.length === 0)
                        winner.innerText = "Player " + game_state.winner + " won !";
                } else if (gameMode === 'multi' && game_state_4p?.winner) {
                    console.log("4P Game finished with winner:", game_state_4p.winner);
                    gameEnded = true;
                }
            };
            
            ws.onerror = function (error: Event) {
                console.error(`WebSocket ${i} error:`, error);
            };
        }
        
        // Start input sending after all WebSockets are created
        setTimeout(() => startInputSending(), 500);
    }

    function startInputSending(): void {
        console.log(`Starting input sending for ${websockets.length} WebSocket connections`);
        
        inputInterval = setInterval(() => {
            if (gameMode === 'pvp') {
                // Player 1 (Human) - WebSocket 0
                if (websockets[0] && websockets[0].readyState === WebSocket.OPEN) {
                    let move = "stop";
                    if (keys["w"]) move = "up";
                    else if (keys["s"]) move = "down";
                    
                    const inputMessage = {
                        type: "input",
                        move: move
                    };
                    websockets[0].send(JSON.stringify(inputMessage));
                }
                
                // Player 2 (AI or Human) - WebSocket 1
                if (websockets[1] && websockets[1].readyState === WebSocket.OPEN) {
                    let move = "stop";
                    if (isAI) {
                        // AI movement is handled in moveAIPaddle function called by AI interval
                        return; 
                    } else {
                        // Human player 2 controls
                        if (keys["ArrowUp"]) move = "up";
                        else if (keys["ArrowDown"]) move = "down";
                    }
                    
                    const inputMessage = {
                        type: "input",
                        move: move
                    };
                    websockets[1].send(JSON.stringify(inputMessage));
                }
            } else {
                // 4-player mode - each WebSocket handles one player
                const keyMappings = [
                    { up: "w", down: "s" },      // Player 1
                    { up: "a", down: "z" },      // Player 2
                    { up: "ArrowUp", down: "ArrowDown" }, // Player 3
                    { up: "o", down: "l" }       // Player 4
                ];
                
                websockets.forEach((ws, index) => {
                    if (ws && ws.readyState === WebSocket.OPEN) {
                        let move = "stop";
                        const mapping = keyMappings[index];
                        if (keys[mapping.up]) move = "up";
                        else if (keys[mapping.down]) move = "down";
                        
                        const inputMessage = {
                            type: "input",
                            move: move
                        };
                        ws.send(JSON.stringify(inputMessage));
                    }
                });
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
    
    function moveAIPaddle(playerIndex: number): void {
        if (!game_state || !game_conf) return;
        if (playerIndex >= websockets.length) return;
        
        const ws = websockets[playerIndex];
        if (!ws || ws.readyState !== WebSocket.OPEN) return;
        
        const rightPaddle = game_state.players.right;
        let move = "stop";
        
        if (AITarg == -1) {
            if (rightPaddle.paddle.y > game_conf.canvas_height / 2 + 15) move = "up";
            else if (rightPaddle.paddle.y < game_conf.canvas_height / 2 - 15) move = "down";
        } else {
            if (rightPaddle.paddle.y > AITarg) move = "up";
            else if (rightPaddle.paddle.y < AITarg - (game_conf.paddle_height / 1.1)) move = "down";
        }
        
        const inputMessage = {
            type: "input",
            move: move
        };
        ws.send(JSON.stringify(inputMessage));
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

    // Create participants array based on game mode and AI setting
    function createParticipantsArray() {
        if (gameMode === 'pvp') {
            const participants = [
                {
                    type: "guest",        // Player 1 is always a guest user
                    user_id: undefined    // No user_id for guest users
                }
            ];
            
            // Player 2 is either AI or another guest
            if (isAI) {
                participants.push({
                    type: "ai",
                    user_id: undefined
                });
            } else {
                participants.push({
                    type: "guest",
                    user_id: undefined
                });
            }
            
            return participants;
        } else {
            // 4-player mode - all guest users for now
            return [
                { type: "guest", user_id: undefined },
                { type: "guest", user_id: undefined },
                { type: "guest", user_id: undefined },
                { type: "guest", user_id: undefined }
            ];
        }
    }

    // --- Game Loop ---
    async function run(): Promise<void> {
        if (!canvas || !ctx) {
            console.error("Canvas or context not available.");
            return;
        }
        try {
            // 1. Create match through matchmaking service
            const participants = createParticipantsArray();
            const matchResult = await createMatch(participants);
            
            game_id = matchResult.game_id;
            jwtTickets = matchResult.jwt_tickets;
            console.log(`${gameMode === 'pvp' ? '2-player' : '4-player'} match created with ID:`, game_id);
            console.log("JWT tickets received:", jwtTickets.length);
            console.log("Tickets:", jwtTickets);
            
            // 2. Get game configuration
            const response = await fetch(API_GAME_ENDPOINT + `/${game_id}/conf`);
            game_conf = await response.json() as GameConfig;
            canvas.width = game_conf.canvas_width;
            canvas.height = game_conf.canvas_height;
            console.log(`${gameMode === 'pvp' ? '2-player' : '4-player'} game initialized:`, game_conf);
            
            // 3. Connect WebSockets with JWT authentication
            connectWebSockets(game_id);
        } catch (error) {
            console.error(`Failed to initialize ${gameMode === 'pvp' ? '2-player' : '4-player'} game:`, error);
        }
    }
}