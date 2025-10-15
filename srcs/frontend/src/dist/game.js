import "./types.js";
export function initGame() {
    // --- Constants & State ---
    const API_GAME_ENDPOINT = `${window.location.origin}/api/game`;
    let isAI = true;
    let AITarg = -1;
    let gameStarted = false;
    let gameEnded = false;
    let game_state = null;
    let game_state_4p = null;
    let game_conf = null;
    let ws = null;
    let game_id = null;
    let gameMode = 'pvp';
    let aiInterval = null;
    let inputInterval = null;
    const participant_ids = ["session_id_0", "session_id_1", "session_id_2", "session_id_3"];
    const keys = {};
    const input = { type: "input", participant_id: "", move: "" };
    const join = { type: "join", participant_id: "" };
    let isTransitioning = false;
    // --- DOM Elements ---
    const canvas = document.getElementById("pong");
    if (!canvas) {
        console.error("Canvas element with id 'pong' not found.");
        return;
    }
    const ctx = canvas.getContext("2d");
    if (!ctx) {
        console.error("Unable to get 2D context from canvas.");
        return;
    }
    // --- Game System API ---
    window.setAIMode = setAIMode;
    window.gameSystem = {
        draw: draw,
        gameState: () => game_state,
        gameConfig: () => game_conf,
        setGameState: (state) => { game_state = state; },
        setGameConfig: (config) => { game_conf = config; },
        setGameStarted: (started) => { gameStarted = started; },
        startGame: startGame
    };
    // --- Event Listeners ---
    const handleKeyDown = (e) => {
        keys[e.key] = true;
        if (e.key === " " && gameEnded && !isTransitioning) {
            e.preventDefault();
            restartGame();
        }
    };
    const handleKeyUp = (e) => {
        keys[e.key] = false;
    };
    document.addEventListener("keydown", handleKeyDown);
    document.addEventListener("keyup", handleKeyUp);
    // --- UI Setup ---
    setTimeout(setupGameButtons, 100);
    draw();
    function setupGameButtons() {
        const onePlayerBtn = document.getElementById('one-player-btn');
        const twoPlayersBtn = document.getElementById('two-players-btn');
        const fourPlayersBtn = document.getElementById('four-players-btn');
        if (onePlayerBtn) {
            onePlayerBtn.addEventListener('click', (e) => {
                e.preventDefault();
                e.stopPropagation();
                if (isTransitioning)
                    return;
                updateButtonStates('one');
                setAIMode(true);
            });
        }
        if (twoPlayersBtn) {
            twoPlayersBtn.addEventListener('click', (e) => {
                e.preventDefault();
                e.stopPropagation();
                if (isTransitioning)
                    return;
                updateButtonStates('two');
                setAIMode(false);
            });
        }
        if (fourPlayersBtn) {
            fourPlayersBtn.addEventListener('click', (e) => {
                e.preventDefault();
                e.stopPropagation();
                if (isTransitioning)
                    return;
                updateButtonStates('four');
                start4PlayerGame();
            });
        }
    }
    function updateButtonStates(activeButton) {
        const onePlayerBtn = document.getElementById('one-player-btn');
        const twoPlayersBtn = document.getElementById('two-players-btn');
        const fourPlayersBtn = document.getElementById('four-players-btn');
        [onePlayerBtn, twoPlayersBtn, fourPlayersBtn].forEach(btn => {
            if (btn)
                btn.classList.remove('active');
        });
        switch (activeButton) {
            case 'one':
                if (onePlayerBtn)
                    onePlayerBtn.classList.add('active');
                break;
            case 'two':
                if (twoPlayersBtn)
                    twoPlayersBtn.classList.add('active');
                break;
            case 'four':
                if (fourPlayersBtn)
                    fourPlayersBtn.classList.add('active');
                break;
        }
    }
    function cleanupCurrentGame() {
        console.log("WS state:", ws?.readyState, "Game ID:", game_id, "Mode:", gameMode);
        if (aiInterval !== null) {
            clearInterval(aiInterval);
            aiInterval = null;
        }
        if (inputInterval !== null) {
            clearInterval(inputInterval);
            inputInterval = null;
        }
        if (ws !== null) {
            console.log("Closing WebSocket - current state:", ws.readyState);
            ws.onopen = null;
            ws.onmessage = null;
            ws.onerror = null;
            ws.onclose = null;
            if (ws.readyState === WebSocket.OPEN || ws.readyState === WebSocket.CONNECTING) {
                try {
                    ws.close(1000, "Cleanup");
                }
                catch (e) {
                    console.error("Error closing websocket:", e);
                }
            }
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
        if (winner)
            winner.innerText = "";
        if (ctx && canvas)
            ctx.clearRect(0, 0, canvas.width, canvas.height);
    }
    // --- Game Control Functions ---
    async function setAIMode(mode) {
        if (isTransitioning) {
            console.log("Already transitioning, ignoring request");
            return;
        }
        isTransitioning = true;
        cleanupCurrentGame();
        await new Promise(resolve => setTimeout(resolve, 100));
        isAI = mode;
        gameMode = 'pvp';
        console.log("Starting new game - AI:", isAI, "Mode:", gameMode);
        await startGame();
        isTransitioning = false;
    }
    async function start4PlayerGame() {
        if (isTransitioning) {
            console.log("Already transitioning, ignoring request");
            return;
        }
        isTransitioning = true;
        cleanupCurrentGame();
        await new Promise(resolve => setTimeout(resolve, 100));
        gameMode = 'multi';
        isAI = false;
        console.log("Starting new 4-player game");
        await startGame();
        isTransitioning = false;
    }
    async function startGame() {
        gameStarted = true;
        gameEnded = false;
        await run();
    }
    async function restartGame() {
        if (!gameEnded || isTransitioning) {
            console.log("Cannot restart - gameEnded:", gameEnded, "isTransitioning:", isTransitioning);
            return;
        }
        isTransitioning = true;
        const savedMode = gameMode;
        const savedAI = isAI;
        cleanupCurrentGame();
        await new Promise(resolve => setTimeout(resolve, 100));
        gameMode = savedMode;
        isAI = savedAI;
        console.log("Restarting with mode:", gameMode, "AI:", isAI);
        await startGame();
        isTransitioning = false;
    }
    // --- Networking ---
    function connectWebSocket(id) {
        if (id === undefined) {
            console.error("Cannot connect WebSocket: game_id is null.");
            return;
        }
        if (ws !== null) {
            console.warn("WebSocket already exists, cleaning up first");
            if (ws.readyState === WebSocket.OPEN || ws.readyState === WebSocket.CONNECTING)
                ws.close(1000, "Reconnecting");
            ws = null;
        }
        const url = API_GAME_ENDPOINT + `/${id}/ws`;
        console.log("Connecting WebSocket:", url);
        ws = new WebSocket(url);
        ws.onopen = function () {
            startInputSending();
            if (isAI && gameMode === 'pvp') {
                console.log("Starting AI interval");
                if (aiInterval !== null)
                    clearInterval(aiInterval);
                aiInterval = setInterval(() => {
                    AIDecision();
                }, 1000);
            }
        };
        ws.onmessage = function (event) {
            try {
                const message = JSON.parse(event.data);
                if (message.type === "game_state") {
                    if (gameMode === 'pvp') {
                        game_state = message.data;
                        game_state_4p = null;
                    }
                    else {
                        game_state_4p = message.data;
                        game_state = null;
                    }
                    draw();
                }
                else if (message.type === "server_message")
                    handleServerMessage(message);
            }
            catch (error) {
                console.error("Error parsing game data:", error);
            }
        };
        ws.onclose = function (event) {
            console.log("WebSocket CLOSED - Code:", event.code, "Reason:", event.reason);
            if (event.code !== 1000) {
                if (aiInterval !== null) {
                    clearInterval(aiInterval);
                    aiInterval = null;
                }
                if (inputInterval !== null) {
                    clearInterval(inputInterval);
                    inputInterval = null;
                }
                if (!game_state?.winner && !game_state_4p?.winner && gameStarted && !gameEnded) {
                    console.log("Attempting reconnect in 3s...");
                    setTimeout(() => {
                        if (gameStarted && !gameEnded && game_id)
                            connectWebSocket(game_id);
                    }, 3000);
                }
            }
            if (gameMode === 'pvp' && game_state?.winner) {
                gameEnded = true;
                const winner = document.getElementById("winner.");
                if (winner && winner.innerText.length === 0)
                    winner.innerText = "Player " + game_state.winner + " won!";
            }
            else if (gameMode === 'multi' && game_state_4p?.winner) {
                gameEnded = true;
                const winner = document.getElementById("winner.");
                if (winner && winner.innerText.length === 0)
                    winner.innerText = game_state_4p.winner + " team won!";
            }
        };
        ws.onerror = function (error) {
            console.error("WebSocket ERROR:", error);
        };
    }
    function startInputSending() {
        if (inputInterval !== null) {
            console.log("Clearing existing input interval before starting new one");
            clearInterval(inputInterval);
            inputInterval = null;
        }
        if (!ws || ws.readyState !== WebSocket.OPEN) {
            console.error("Cannot start input sending - WebSocket not open");
            return;
        }
        console.log(`Starting input sending for ${gameMode} mode`);
        try {
            if (gameMode === 'pvp') {
                console.log("Sending join for 2 players");
                join.participant_id = participant_ids[0];
                ws.send(JSON.stringify(join));
                join.participant_id = participant_ids[1];
                ws.send(JSON.stringify(join));
            }
            else {
                console.log("Sending join for 4 players");
                participant_ids.forEach((id, index) => {
                    join.participant_id = id;
                    ws.send(JSON.stringify(join));
                });
            }
        }
        catch (error) {
            console.error("Error sending join messages:", error);
            return;
        }
        inputInterval = setInterval(() => {
            if (!ws || ws.readyState !== WebSocket.OPEN) {
                console.log("WebSocket not open, stopping input interval");
                if (inputInterval !== null) {
                    clearInterval(inputInterval);
                    inputInterval = null;
                }
                return;
            }
            try {
                if (gameMode === 'pvp') {
                    input.participant_id = participant_ids[0];
                    if (keys["w"])
                        input.move = "up";
                    else if (keys["s"])
                        input.move = "down";
                    else
                        input.move = "stop";
                    ws.send(JSON.stringify(input));
                    input.participant_id = participant_ids[1];
                    if (isAI)
                        moveAIPaddle();
                    else {
                        if (keys["ArrowUp"])
                            input.move = "up";
                        else if (keys["ArrowDown"])
                            input.move = "down";
                        else
                            input.move = "stop";
                    }
                    ws.send(JSON.stringify(input));
                }
                else {
                    input.participant_id = participant_ids[0];
                    if (keys["w"])
                        input.move = "up";
                    else if (keys["s"])
                        input.move = "down";
                    else
                        input.move = "stop";
                    ws.send(JSON.stringify(input));
                    input.participant_id = participant_ids[1];
                    if (keys["a"])
                        input.move = "up";
                    else if (keys["z"])
                        input.move = "down";
                    else
                        input.move = "stop";
                    ws.send(JSON.stringify(input));
                    input.participant_id = participant_ids[2];
                    if (keys["ArrowUp"])
                        input.move = "up";
                    else if (keys["ArrowDown"])
                        input.move = "down";
                    else
                        input.move = "stop";
                    ws.send(JSON.stringify(input));
                    input.participant_id = participant_ids[3];
                    if (keys["o"])
                        input.move = "up";
                    else if (keys["l"])
                        input.move = "down";
                    else
                        input.move = "stop";
                    ws.send(JSON.stringify(input));
                }
            }
            catch (error) {
                console.error("Error sending input:", error);
            }
        }, 50);
        console.log("Input interval started:", inputInterval);
    }
    function handleServerMessage(message) {
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
    function predictBallY(ball, paddleX, canvas_width, canvas_height, ball_size) {
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
    function AIDecision() {
        if (!game_state || !game_conf || gameMode !== 'pvp')
            return;
        const ball = game_state.ball;
        if (ball.dx < 0)
            AITarg = -1;
        else
            AITarg = predictBallY(ball, game_state.players.right.paddle.x, game_conf.canvas_width, game_conf.canvas_height, game_conf.ball_size);
    }
    function moveAIPaddle() {
        if (!game_state || !game_conf || gameMode !== 'pvp')
            return;
        const rightPaddle = game_state.players.right;
        input.participant_id = participant_ids[1];
        if (AITarg === -1) {
            if (rightPaddle.paddle.y > game_conf.canvas_height / 2 + 15)
                input.move = "up";
            else if (rightPaddle.paddle.y < game_conf.canvas_height / 2 - 15)
                input.move = "down";
            else
                input.move = "stop";
        }
        else {
            if (rightPaddle.paddle.y > AITarg)
                input.move = "up";
            else if (rightPaddle.paddle.y < AITarg - (game_conf.paddle_height / 1.1))
                input.move = "down";
            else
                input.move = "stop";
        }
    }
    // --- Drawing ---
    function drawCenterLine() {
        if (!ctx || !game_conf)
            return;
        ctx.fillStyle = "white";
        for (let i = 0; i < game_conf.canvas_height; i += 20) {
            ctx.fillRect(game_conf.canvas_width / 2 - 1, i, 2, 10);
        }
    }
    function draw() {
        if (!ctx)
            return;
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
            if (!game_state || !game_conf)
                return;
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
        else {
            if (!game_state_4p || !game_conf)
                return;
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
    async function run() {
        if (!canvas || !ctx) {
            console.error("Canvas or context not available.");
            return;
        }
        try {
            let requestBody;
            if (gameMode === 'pvp') {
                requestBody = {
                    type: "pvp",
                    participants: [
                        { user_id: 0, participant_id: participant_ids[0], is_ai: false },
                        { user_id: 1, participant_id: participant_ids[1], is_ai: isAI },
                    ],
                };
            }
            else {
                requestBody = {
                    type: "multi",
                    participants: [
                        { user_id: 0, participant_id: participant_ids[0] },
                        { user_id: 1, participant_id: participant_ids[1] },
                        { user_id: 2, participant_id: participant_ids[2] },
                        { user_id: 3, participant_id: participant_ids[3] }
                    ],
                };
            }
            const response = await fetch(API_GAME_ENDPOINT + "/create", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(requestBody)
            });
            if (!response.ok)
                throw new Error(`Failed to create game: ${response.status}`);
            const data = await response.json();
            game_id = data.game_id;
            console.log(`Game created with ID: ${game_id}`);
            const configResponse = await fetch(API_GAME_ENDPOINT + `/${game_id}/conf`);
            if (!configResponse.ok)
                throw new Error(`Failed to get game config: ${configResponse.status}`);
            game_conf = await configResponse.json();
            canvas.width = game_conf.canvas_width;
            canvas.height = game_conf.canvas_height;
            connectWebSocket(game_id);
        }
        catch (error) {
            console.error(`Failed to initialize game:`, error);
            gameStarted = false;
            gameEnded = true;
        }
    }
}
//# sourceMappingURL=game.js.map