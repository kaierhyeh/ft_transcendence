// Type definitions
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
    dx: number;
    dy: number;
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
    is_ai: boolean;
}

interface CreateGameRequest {
    type: "pvp";
    participants: Participant[];
}

export function initGame(): void {

    const API_GAME_ENDPOINT = `${window.location.origin}/api/game`;
    let isAI: boolean = true;
    let AITarg: number = -1;
    let gameStarted: boolean = false;
    let gameEnded: boolean = false;

    function setAIMode(mode: boolean): void {
        isAI = mode;
        console.log("AI mode set to:", mode);

        const onePlayerBtn = document.getElementById('one-player-btn') as HTMLElement;
        const twoPlayersBtn = document.getElementById('two-players-btn') as HTMLElement;

        if (onePlayerBtn && twoPlayersBtn) {
            onePlayerBtn.classList.remove('active');
            twoPlayersBtn.classList.remove('active');

            if (mode) {
                onePlayerBtn.classList.add('active');
            } else {
                twoPlayersBtn.classList.add('active');
            }
        }

        if (gameStarted || gameEnded) {
            gameStarted = false;
            gameEnded = false;
            game_state = null;

            const winner = document.getElementById("winner.");
            if (winner)
                winner.innerText = "";
            if (ws)
                ws.close();
        }

        startGame();
    }

    function startGame(): void {
        gameStarted = true;
        gameEnded = false;
        run();
    }

    function restartGame(): void {
        if (gameEnded) {
            gameStarted = false;
            gameEnded = false;
            game_state = null;

            if (ws)
                ws.close();

            startGame();
        }
    }

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

    function setupGameButtons(): void {
        const onePlayerBtn = document.getElementById('one-player-btn') as HTMLButtonElement;
        if (onePlayerBtn) {
            onePlayerBtn.addEventListener('click', (e) => {
                e.preventDefault();
                e.stopPropagation();
                setAIMode(true);
            });
        }

        const twoPlayersBtn = document.getElementById('two-players-btn') as HTMLButtonElement;
        if (twoPlayersBtn) {
            twoPlayersBtn.addEventListener('click', (e) => {
                e.preventDefault();
                e.stopPropagation();
                setAIMode(false);
            });
        }
    }

    setTimeout(setupGameButtons, 100);

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

    let game_state: GameState | null = null;
    let game_conf: GameConfig | null = null;
    draw();

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
    const participant_ids: string[] = [
        "session_id_0",
        "session_id_1"
    ];
    let game_id: number | null = null;

    document.addEventListener("keydown", function (e: KeyboardEvent) {
        keys[e.key] = true;

        if (e.key === " " && gameEnded) {
            e.preventDefault();
            restartGame();
        }
    });
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

            setInterval(() => {
                if (isAI)
                    AIDecision();
            }, 1000);
        };

        ws.onmessage = function (event: MessageEvent) {
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

        ws.onclose = function (event: CloseEvent) {
            console.log("WebSocket disconnected. Code:", event.code, "Reason:", event.reason);
            if (!game_state?.winner) {
                setTimeout(connectWebSocket, 3000);
            }
            else {
                const winner = document.getElementById("winner.");
                if (winner && winner.innerText.length === 0) {
                    winner.innerText = "Player " + game_state.winner + " won !";
                }
            }
        };

        ws.onerror = function (error: Event) {
            console.error("WebSocket error:", error);
        };
    }


    function startInputSending(): void {
        if (ws && ws.readyState === WebSocket.OPEN) {
            console.log("Sending join requests for both players.");
            join.participant_id = participant_ids[0];
            console.log(join);
            ws.send(JSON.stringify(join));
            join.participant_id = participant_ids[1];
            console.log(join);
            ws.send(JSON.stringify(join));
        }

        setInterval(() => {
            if (ws && ws.readyState === WebSocket.OPEN) {
                input.participant_id = participant_ids[0];
                if (keys["w"]) {
                    input.move = "up";
                } else if (keys["s"]) {
                    input.move = "down";
                } else {
                    input.move = "stop";
                }
                ws.send(JSON.stringify(input));

                if (isAI)
                    moveAIPaddle();
                else {
                    input.participant_id = participant_ids[1];
                    if (keys["ArrowUp"])
                        input.move = "up";
                    else if (keys["ArrowDown"])
                        input.move = "down";
                    else
                        input.move = "stop";
                }
                ws.send(JSON.stringify(input));
            }
        }, 50);
    }

    function predictBallY(ball: Ball, paddleX: number, canvas_width: number, canvas_height: number, ball_size: number): number {
        let { x, y, dx, dy } = ball;

        while (true) {
            const t = (paddleX - x) / dx;
            const yPred = y + dy * t;

            if (yPred >= 0 && yPred <= canvas_height - ball_size)
                return yPred;

            if (yPred < 0) {
                x += dx * (-y / dy);
                y = 0;
                dy = -dy;
            }
            else if (yPred > canvas_height - ball_size) {
                x += dx * (canvas_height - ball_size - y) / dy;
                y = canvas_height - ball_size;
                dy = -dy;
            }
        }
    }

    function AIDecision(): void {
        if (!game_state || !game_conf) return;

        const ball = game_state.ball;

        if (ball.dx < 0)
            AITarg = -1;
        else
            AITarg = predictBallY(ball, game_state.players.right.paddle.x, game_conf.canvas_width, game_conf.canvas_height, game_conf.ball_size);
    }

    function moveAIPaddle(): void {
        if (!game_state || !game_conf) return;

        const rightPaddle = game_state.players.right;

        input.participant_id = participant_ids[1];

        if (AITarg == -1) {
            if (rightPaddle.paddle.y > game_conf.canvas_height / 2 + 15) {
                input.move = "up";
            } else if (rightPaddle.paddle.y < game_conf.canvas_height / 2 - 15) {
                input.move = "down";
            } else {
                input.move = "stop";
            }
        } else {
            if (rightPaddle.paddle.y > AITarg) {
                input.move = "up";
            } else if (rightPaddle.paddle.y < AITarg - (game_conf.paddle_height / 1.1)) {
                input.move = "down";
            } else {
                input.move = "stop";
            }
        }
    }

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

        if (!game_state || !game_conf) return;

        ctx.fillStyle = "white";

        drawCenterLine();

        const left_player = game_state.players.left;
        const right_player = game_state.players.right;
        if (left_player)
            ctx.fillRect(left_player.paddle.x, left_player.paddle.y, game_conf.paddle_width, game_conf.paddle_height);

        if (right_player)
            ctx.fillRect(right_player.paddle.x, right_player.paddle.y, game_conf.paddle_width, game_conf.paddle_height);

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
    }

    async function run(): Promise<void> {
        if (!canvas || !ctx) {
            console.error("Canvas or context not available.");
            return;
        }

        try {
            {
                const response = await fetch(API_GAME_ENDPOINT + "/create", {
                    method: "POST",
                    headers: {
                        "Content-Type": "application/json",
                    },
                    body: JSON.stringify({
                        type: "pvp",
                        participants: [
                            { user_id: 0, participant_id: participant_ids[0], is_ai: false },
                            { user_id: 1, participant_id: participant_ids[1], is_ai: isAI},
                        ],
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
}
