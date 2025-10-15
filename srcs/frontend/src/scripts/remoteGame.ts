import { showError } from './notifications.js';

interface PlayerData {
    paddle: { x: number; y: number };
}

interface RemoteGameState {
    players: {
        left?: PlayerData;
        right?: PlayerData;
        "top-left"?: PlayerData;
        "bottom-left"?: PlayerData;
        "top-right"?: PlayerData;
        "bottom-right"?: PlayerData;
        [key: string]: PlayerData | undefined;
    };
    ball: { x: number; y: number };
    score: { left: number; right: number };
    winner?: string;
}

let gameWebSocket: WebSocket | null = null;
let matchmakingWebSocket: WebSocket | null = null;
let keyDownHandler: ((event: KeyboardEvent) => void) | null = null;
let keyUpHandler: ((event: KeyboardEvent) => void) | null = null;
let gameDisconnected: boolean = false;

export function cleanupRemoteGame(): void {
    if (keyDownHandler !== null) {
        document.removeEventListener('keydown', keyDownHandler);
        keyDownHandler = null;
    }
    if (keyUpHandler !== null) {
        document.removeEventListener('keyup', keyUpHandler);
        keyUpHandler = null;
    }

    if (gameWebSocket !== null) {
        gameWebSocket.close(1000, "Page navigation");
        gameWebSocket = null;
    }
    if (matchmakingWebSocket !== null) {
        matchmakingWebSocket.close(1000, "Page navigation");
        matchmakingWebSocket = null;
    }

    gameDisconnected = false;
}

export default function initRemoteGame(): void {
    let currentGameId: number | null = null;
    let currentParticipantId: string | null = null;
    let gameCanvas: HTMLCanvasElement | null = null;
    let gameContext: CanvasRenderingContext2D | null = null;
    let remotePartyMode: string = '';

    function resetRemoteUI(message?: string): void {
        if (matchmakingWebSocket !== null) {
            matchmakingWebSocket.close(1000, "UI Reset");
            matchmakingWebSocket = null;
        }
        if (gameWebSocket !== null) {
            gameWebSocket.close(1000, "UI Reset");
            gameWebSocket = null;
        }
        
        currentGameId = null;
        currentParticipantId = null;
        remotePartyMode = '';
        gameDisconnected = false;

        const btn2p = document.getElementById('remote-2p-btn') as HTMLButtonElement;
        const btn4p = document.getElementById('remote-4p-btn') as HTMLButtonElement;
        const btnCancel = document.getElementById('remote-cancel-btn') as HTMLButtonElement;

        if (btn2p !== null) {
            btn2p.disabled = false;
            btn2p.textContent = "2 Players Online";
        }
        if (btn4p !== null) {
            btn4p.disabled = false;
            btn4p.textContent = "4 Players Online";
        }
        if (btnCancel !== null) {
            btnCancel.style.display = 'none';
        }

        if (message !== undefined && message !== '') {
            showError(message);
        }
    }

    function createRemoteInterface(): void {
        const header = document.querySelector('.pong-header');
        if (header !== null) {
            header.classList.add('remote-mode');
        }

        setupRemoteEvents();
    }

    function setupRemoteEvents(): void {
        const btn2p = document.getElementById('remote-2p-btn');
        const btn4p = document.getElementById('remote-4p-btn');
        const btnCancel = document.getElementById('remote-cancel-btn');

        if (btn2p !== null) {
            btn2p.addEventListener('click', function() { 
                joinQueue("2p"); 
            });
        }

        if (btn4p !== null) {
            btn4p.addEventListener('click', function() { 
                joinQueue("4p"); 
            });
        }

        if (btnCancel !== null) {
            btnCancel.addEventListener('click', function() { 
                resetRemoteUI(); 
            });
        }
    }

    function generateParticipantId(): string {
        const timestamp = Date.now();
        const randomNumber = Math.random();
        return "remote_" + timestamp + "_" + randomNumber;
    }

    async function joinQueue(mode: "2p" | "4p"): Promise<void> {
        remotePartyMode = mode;
        
        const btn2p = document.getElementById('remote-2p-btn') as HTMLButtonElement;
        const btn4p = document.getElementById('remote-4p-btn') as HTMLButtonElement;

        if (btn2p !== null) {
            btn2p.disabled = true;
        }
        if (btn4p !== null) {
            btn4p.disabled = true;
        }

        let currentButton: HTMLButtonElement | null = null;
        if (mode === "2p") {
            currentButton = btn2p;
        } else {
            currentButton = btn4p;
        }

        if (currentButton !== null) {
            currentButton.textContent = "Joining...";
        }

        const participantId = generateParticipantId();
        currentParticipantId = participantId;

        try {
            const response = await fetch('/game/join', {
                method: 'POST',
                credentials: 'include',
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    mode: mode,
                    participant_id: participantId
                })
            });

            const data = await response.json();

            if (data.type === "game_ready") {
                if (currentButton !== null) {
                    currentButton.textContent = "Match found!";
                }
                connectToGame(data.game_id);
            } else if (data.type === "queue_joined") {
                if (currentButton !== null) {
                    currentButton.textContent = "Waiting...";
                }

                const btnCancel = document.getElementById('remote-cancel-btn') as HTMLButtonElement;
                if (btnCancel !== null) {
                    btnCancel.style.display = 'block';
                }

                openMatchmakingWebSocket();
            } else if (data.type === "error") {
                if (btn2p !== null) {
                    btn2p.disabled = false;
                    btn2p.textContent = "Join 2 Players";
                }
                if (btn4p !== null) {
                    btn4p.disabled = false;
                    btn4p.textContent = "Join 4 Players";
                }
            }
        } catch (error) {
            resetRemoteUI("Connection failed, please try again.");
        }
    }

    function openMatchmakingWebSocket(): void {
        if (matchmakingWebSocket !== null) {
            return;
        }

        let protocol = 'ws:';
        if (window.location.protocol === 'https:') {
            protocol = 'wss:';
        }

        const host = window.location.host;
        const wsUrl = protocol + '//' + host + '/game/ws?participant_id=' + currentParticipantId;

        matchmakingWebSocket = new WebSocket(wsUrl);

        matchmakingWebSocket.onopen = function() {
        };

        matchmakingWebSocket.onmessage = function(event) {
            try {
                const data = JSON.parse(event.data);

                if (data.type === 'game_ready') {
                    if (matchmakingWebSocket !== null) {
                        matchmakingWebSocket.close(1000, "Match found");
                        matchmakingWebSocket = null;
                    }

                    let currentButton: HTMLElement | null = null;
                    if (remotePartyMode === '2p') {
                        currentButton = document.getElementById('remote-2p-btn');
                    } else {
                        currentButton = document.getElementById('remote-4p-btn');
                    }

                    if (currentButton !== null) {
                        currentButton.textContent = 'Match found!';
                    }

                    connectToGame(data.game_id);
                }
            } catch (error) {
                console.error('Error parsing matchmaking message:', error);
            }
        };

        matchmakingWebSocket.onclose = function(event) {
            matchmakingWebSocket = null;

            if (event.code !== 1000 && event.code !== 1001) {
                resetRemoteUI("Connection closed. Please try again.");
            }
        };

        matchmakingWebSocket.onerror = function(error) {
            console.error('Matchmaking WebSocket error:', error);
            resetRemoteUI("Connection lost. Please try again.");
        };
    }

    function connectToGame(gameId: number): void {
        currentGameId = gameId;

        const btnCancel = document.getElementById('remote-cancel-btn') as HTMLButtonElement;
        if (btnCancel !== null) {
            btnCancel.style.display = 'none';
        }

        let protocol = 'ws:';
        if (window.location.protocol === 'https:') {
            protocol = 'wss:';
        }

        const host = window.location.host;
        const wsUrl = protocol + '//' + host + '/game/' + gameId + '/ws';

        gameWebSocket = new WebSocket(wsUrl);

        gameWebSocket.onopen = function() {
            const message = {
                type: "join",
                participant_id: currentParticipantId
            };

            if (gameWebSocket !== null) {
                gameWebSocket.send(JSON.stringify(message));
            }

            keyDownHandler = onKeyPressed;
            keyUpHandler = onKeyReleased;

            document.addEventListener('keydown', keyDownHandler);
            document.addEventListener('keyup', keyUpHandler);
        };

        gameWebSocket.onmessage = function(event) {
            try {
                const msg = JSON.parse(event.data);
                
                if (msg.type === "game_state") {
                    if (gameDisconnected === false) {
                        drawRemoteGame(msg.data);

                        if (msg.data.winner !== undefined && msg.data.winner !== null) {
                            handleGameEnd(" 🏆 WINNER 🏆 : " + msg.data.winner, " Select an online mode to retry");
                        }
                    }
                } else if (msg.type === "player_disconnected") {
                } else if (msg.type === "game_ended") {
                    if (msg.data.reason === "player_disconnected") {
                        handleGameEnd("Your opponent left the game! ", "Please select a new party");
                    }
                }
            } catch (error) {
                console.error("Error parsing:", error);
            }
        };

        gameWebSocket.onclose = function(event) {
            if (keyDownHandler !== null) {
                document.removeEventListener('keydown', keyDownHandler);
                keyDownHandler = null;
            }
            if (keyUpHandler !== null) {
                document.removeEventListener('keyup', keyUpHandler);
                keyUpHandler = null;
            }

            if (event.code !== 1000 && event.code !== 1001) {
                showError("Game ended unexpectedly.");
            }
        };

        gameWebSocket.onerror = function(error) {
            console.error("WebSocket error:", error);
            showError("Game connection lost.");
        };
    }

    function onKeyPressed(event: KeyboardEvent): void {
        if (gameDisconnected === true) {
            event.preventDefault();
            return;
        }

        if (gameWebSocket === null) {
            return;
        }
        if (gameWebSocket.readyState !== WebSocket.OPEN) {
            return;
        }

        let movement = "";
        if (event.key === 'w') {
            movement = "up";
        }
        if (event.key === 's') {
            movement = "down";
        }

        if (movement !== "") {
            event.preventDefault();

            const message = JSON.stringify({
                type: "input",
                participant_id: currentParticipantId,
                move: movement
            });
            gameWebSocket.send(message);
        }
    }

    function onKeyReleased(event: KeyboardEvent): void {
        if (gameWebSocket === null) {
            return;
        }
        if (gameWebSocket.readyState !== WebSocket.OPEN) {
            return;
        }

        let shouldStop = false;
        if (event.key === 'w') {
            shouldStop = true;
        }
        if (event.key === 's') {
            shouldStop = true;
        }

        if (shouldStop === true) {
            const message = JSON.stringify({
                type: "input",
                participant_id: currentParticipantId,
                move: "stop"
            });

            gameWebSocket.send(message);
        }
    }

    function drawRemoteGame(state: RemoteGameState): void {
        if (gameCanvas === null) {
            gameCanvas = document.getElementById("pong") as HTMLCanvasElement;
            if (gameCanvas === null) {
                return;
            }

            gameContext = gameCanvas.getContext("2d");
            if (gameContext === null) {
                return;
            }
        }
        if (gameContext === null) {
            return;
        }
        
        const ctx = gameContext;
        const canvas = gameCanvas;

        ctx.fillStyle = "black";
        ctx.fillRect(0, 0, canvas.width, canvas.height);

        ctx.setLineDash([5, 5]);
        ctx.beginPath();
        ctx.moveTo(canvas.width / 2, 0);
        ctx.lineTo(canvas.width / 2, canvas.height);
        ctx.strokeStyle = "white";
        ctx.stroke();
        ctx.setLineDash([]);

        let is4PlayerMode = false;
        if (state.players !== undefined && state.players !== null) {
            if (state.players["top-left"] !== undefined) {
                is4PlayerMode = true;
            }
        }
        
        ctx.fillStyle = "white";

        if (is4PlayerMode === true) {
            const positions = ["top-left", "bottom-left", "top-right", "bottom-right"];
            for (let i = 0; i < positions.length; i = i + 1) {
                const player = state.players[positions[i]];
                if (player !== undefined && player.paddle !== undefined) {
                    ctx.fillRect(player.paddle.x, player.paddle.y, 10, 50);
                }
            }
        } else {
            if (state.players.left !== undefined && state.players.left.paddle !== undefined) {
                const paddle = state.players.left.paddle;
                ctx.fillRect(paddle.x, paddle.y, 10, 50);
            }
            if (state.players.right !== undefined && state.players.right.paddle !== undefined) {
                const paddle = state.players.right.paddle;
                ctx.fillRect(paddle.x, paddle.y, 10, 50);
            }
        }

        if (state.ball !== undefined) {
            ctx.fillRect(state.ball.x - 5, state.ball.y - 5, 10, 10);
        }

        ctx.font = "40px Arial";
        ctx.fillStyle = "white";
        ctx.textAlign = "center";

        let leftScore = 0;
        let rightScore = 0;

        if (state.score !== undefined && state.score.left !== undefined) {
            leftScore = state.score.left;
        }
        if (state.score !== undefined && state.score.right !== undefined) {
            rightScore = state.score.right;
        }

        ctx.fillText(leftScore.toString(), canvas.width / 4, 50);
        ctx.fillText(rightScore.toString(), (3 * canvas.width) / 4, 50);

        if (state.winner !== undefined) {
            ctx.font = "60px Arial";
            ctx.fillText("WINNER: " + state.winner, canvas.width / 2, canvas.height / 2);
        }
    }

    function drawEndGameMessage(message: string, subtitle?: string): void {
        const canvas = document.getElementById("pong") as HTMLCanvasElement;
        if (canvas === null) {
            return;
        }

        const ctx = canvas.getContext("2d");
        if (ctx === null) {
            return;
        }

        ctx.fillStyle = "black";
        ctx.fillRect(0, 0, canvas.width, canvas.height);

        ctx.fillStyle = "white";
        ctx.textAlign = "center";

        ctx.font = "48px Arial";
        ctx.fillText(message, canvas.width / 2, canvas.height / 2 - 20);

        if (subtitle !== undefined) {
            ctx.font = "32px Arial";
            ctx.fillText(subtitle, canvas.width / 2, canvas.height / 2 + 40);
        }
    }

    function handleGameEnd(message: string, subtitle?: string): void {
        gameDisconnected = true;
        drawEndGameMessage(message, subtitle);

        if (gameWebSocket !== null) {
            gameWebSocket.close(1000, "Game ended");
            gameWebSocket = null;
        }
        if (keyDownHandler !== null) {
            document.removeEventListener('keydown', keyDownHandler);
            keyDownHandler = null;
        }
        if (keyUpHandler !== null) {
            document.removeEventListener('keyup', keyUpHandler);
            keyUpHandler = null;
        }

        setTimeout(function() {
            const canvas = document.getElementById("pong") as HTMLCanvasElement;
            if (canvas !== null) {
                const ctx = canvas.getContext("2d");
                if (ctx !== null) {
                    ctx.fillStyle = "black";
                    ctx.fillRect(0, 0, canvas.width, canvas.height);
                }
            }
            resetRemoteUI();
        }, 3000);
    }

    createRemoteInterface();
}