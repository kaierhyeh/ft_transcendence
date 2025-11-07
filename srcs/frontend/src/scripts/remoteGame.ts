import { GameParticipant, Team } from './game/types.js';
import { generateParticipantId } from './game/utils.js';
import { showError } from './notifications.js';
import { ScoreChart } from './live_stats/ScoreChart.js';
import { ScoreDisplay } from './live_stats/ScoreDisplay.js';
import { ScoreTracker } from './live_stats/ScoreTracker.js';
import user from "./user/User.js";
import { PlayerSlot } from './user/types.js';
import { t } from './i18n/i18n.js';

const API_GAME_ENDPOINT = `${window.location.origin}/api/game`;


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
    ball: { x: number; y: number, dx: number, dy: number };
    score: { left: number; right: number };
    winner?: string;
}

let gameWebSocket: WebSocket | null = null;
let matchmakingWebSocket: WebSocket | null = null;
let keyDownHandler: ((event: KeyboardEvent) => void) | null = null;
let keyUpHandler: ((event: KeyboardEvent) => void) | null = null;
let gameDisconnected: boolean = false;
let myTeam: Team | null;
let mySlot: PlayerSlot | null;
let currentMovement: "up" | "down" | "stop" = "stop";
let inputInterval: number | null = null;

export function cleanupRemoteGame(): void {
    if (keyDownHandler !== null) {
        document.removeEventListener('keydown', keyDownHandler);
        keyDownHandler = null;
    }
    if (keyUpHandler !== null) {
        document.removeEventListener('keyup', keyUpHandler);
        keyUpHandler = null;
    }

    if (inputInterval !== null) {
        clearInterval(inputInterval);
        inputInterval = null;
    }
    currentMovement = "stop";

    if (gameWebSocket !== null) {
        gameWebSocket.close(1000, "Page navigation");
        gameWebSocket = null;
    }
    if (matchmakingWebSocket !== null) {
        matchmakingWebSocket.close(1000, "Page navigation");
        matchmakingWebSocket = null;
    }

    gameDisconnected = false;
    myTeam = null;
    mySlot = null;
}

export default function initRemoteGame(): void {
    let currentGameId: number | null = null;
    let currentParticipantId: string | null = null;
    let gameCanvas: HTMLCanvasElement | null = null;
    let gameContext: CanvasRenderingContext2D | null = null;
    let remotePartyFormat: string = '';


    let btn1v1: HTMLButtonElement | null = null;
    let btn2v2: HTMLButtonElement | null = null;
    let btnCancel: HTMLButtonElement | null = null;

    const scoreTracker = new ScoreTracker(); // Follows the Observer Pattern (also known as Pub/Sub Pattern)
    const scoreChart = new ScoreChart();
    const scoreDisplay = new ScoreDisplay();

    // Initialize score display if elements exist
    if (document.getElementById('pong-score-chart')) {
        scoreChart.initialize('pong-score-chart');
        scoreDisplay.initialize();
        
        // Subscribe to updates
        scoreTracker.onUpdate((data) => {
            scoreChart.update(data);
            scoreDisplay.update(data);
        });
    }

    // Global reset function for button
    (window as any).resetGameData = () => {
        scoreTracker.resetAll();
    };

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
        remotePartyFormat = '';
        gameDisconnected = false;

        if (btn1v1 !== null) {
            btn1v1.disabled = false;
            btn1v1.textContent = t("remote1v1");
        }
        if (btn2v2 !== null) {
            btn2v2.disabled = false;
            btn2v2.textContent = t("remote2v2");
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
        } else {
            console.error('Pong header element not found');
        }

        btn1v1 = document.getElementById('remote-1v1-btn') as HTMLButtonElement;
        btn2v2 = document.getElementById('remote-2v2-btn') as HTMLButtonElement;
        btnCancel = document.getElementById('remote-cancel-btn') as HTMLButtonElement;

        if (btnCancel !== null) {
            btnCancel.style.display = 'none';
        }
        
        setupRemoteEvents();
    }

    function setupRemoteEvents(): void {
        if (btn1v1 !== null) {
            btn1v1.addEventListener('click', function() {
                joinQueue("1v1");
            });
        } else {
            console.error('Remote 1v1 button not found');
        }

        if (btn2v2 !== null) {
            btn2v2.addEventListener('click', function() {
                joinQueue("2v2");
            });
        } else {
            console.error('Remote 2v2 button not found');
        }

        if (btnCancel !== null) {
            btnCancel.addEventListener('click', function() {
                resetRemoteUI();
            });
        } else {
            console.error('Remote cancel button not found');
        }
    }

    async function joinQueue(format: "1v1" | "2v2"): Promise<void> {
        remotePartyFormat = format;

        scoreTracker.resetGame();

        if (btn1v1 !== null) {
            btn1v1.disabled = true;
        }
        if (btn2v2 !== null) {
            btn2v2.disabled = true;
        }

        let currentButton: HTMLButtonElement | null = null;
        if (format === "1v1") {
            currentButton = btn1v1;
        } else {
            currentButton = btn2v2;
        }

        if (currentButton !== null) {
            currentButton.textContent = t("joining");
        }

        const isAuthenticated = await user.ensureAuthenticated();
        
        currentParticipantId = generateParticipantId();
        const participant: GameParticipant = {
            type: isAuthenticated ? "registered" : "guest",
            user_id: user.user_id ?? undefined,
            participant_id: currentParticipantId
        };

        try {
            const response = await fetch(`${API_GAME_ENDPOINT}/join`, {
                method: 'POST',
                credentials: 'include',
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    format: format,
                    participant
                })
            });

            const data = await response.json();

            if (data.type === "game_ready") {
                if (currentButton !== null) {
                    currentButton.textContent = t("matchFound");
                }
                myTeam = data.team;
                mySlot = data.slot;
                connectToGame(data.game_id);
            } else if (data.type === "queue_joined") {
                if (currentButton !== null) {
                    currentButton.textContent = t("waiting");
                }

                if (btnCancel !== null) {
                    btnCancel.style.display = 'block';
                }

                openMatchmakingWebSocket();
            } else if (data.type === "error") {
                if (btn1v1 !== null) {
                    btn1v1.disabled = false;
                    btn1v1.textContent = t("remote1v1");
                }
                if (btn2v2 !== null) {
                    btn2v2.disabled = false;
                    btn2v2.textContent = t("remote2v2");
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
        const wsUrl = protocol + '//' + host + '/api/game/ws?participant_id=' + currentParticipantId;

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

                    let currentButton: HTMLButtonElement | null = null;
                    if (remotePartyFormat === '1v1') {
                        currentButton = btn1v1;
                    } else {
                        currentButton = btn2v2;
                    }

                    if (currentButton !== null) {
                        currentButton.textContent = t("matchFound");
                    }
                    myTeam = data.team;
                    mySlot = data.slot;
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

        if (btnCancel !== null) {
            btnCancel.style.display = 'none';
        }

        let protocol = 'ws:';
        if (window.location.protocol === 'https:') {
            protocol = 'wss:';
        }

        const host = window.location.host;
        const wsUrl = protocol + '//' + host + '/api/game/' + gameId + '/ws';

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

            // Start input interval (50ms like local InputController)
            currentMovement = "stop";
            inputInterval = window.setInterval(() => {
                if (gameWebSocket !== null && gameWebSocket.readyState === WebSocket.OPEN) {
                    const message = JSON.stringify({
                        type: "input",
                        move: currentMovement
                    });
                    gameWebSocket.send(message);
                }
            }, 50);
        };

        gameWebSocket.onmessage = function(event) {
            try {
                const msg = JSON.parse(event.data);
                
                if (msg.type === "game_state") {
                    if (gameDisconnected === false) {
                        drawRemoteGame(msg.data);

                        if (msg.data.winner !== undefined && msg.data.winner !== null) {
                            let winnerTeam = msg.data.winner as string;
                            let resultMessage: string;
                            if (myTeam !== null)
                                resultMessage = (myTeam === winnerTeam) ? t("youWin") : t("youLose");
                            else
                                resultMessage = t("winner") + winnerTeam;		// TO_TRANSLATE ???
                            handleGameEnd(resultMessage, " " + t("selectAnOnlineGame"));
                        }
                    }
                } else if (msg.type === "player_disconnected") {
                } else if (msg.type === "game_ended") {
                    if (msg.data.reason === "player_disconnected") {
                        console.log(msg);
                        console.log("Disconnected player:", msg.data.disconnected_player, " - My team:", myTeam);
                        const disconnectingTeam = msg.data.disconnected_player.team;
                        const whoLeft = disconnectingTeam === myTeam ? t("teammateLeft") : t("opponentLeft");
                        handleGameEnd(whoLeft, " " + t("selectNewParty"));
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

            if (inputInterval !== null) {
                clearInterval(inputInterval);
                inputInterval = null;
            }
            currentMovement = "stop";

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

        let movement: "up" | "down" | "" = "";
        if (event.key === 'w') {
            movement = "up";
        }
        if (event.key === 's') {
            movement = "down";
        }

        if (movement !== "") {
            event.preventDefault();
            currentMovement = movement;
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
            currentMovement = "stop";
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

        if (mySlot !== null) {
            ctx.font = "20px Bit5x3, monospace";
            ctx.fillStyle = "white";
            ctx.textAlign = "center";
            let positionText = "";
            if (mySlot === "left") {
                positionText = t("positionLeft");
            } else if (mySlot === "right") {
                positionText = t("positionRight");
            } else if (mySlot === "top-left") {
                positionText = t("positionTopLeft");
            } else if (mySlot === "bottom-left") {
                positionText = t("positionBottomLeft");
            } else if (mySlot === "top-right") {
                positionText = t("positionTopRight");
            } else if (mySlot === "bottom-right") {
                positionText = t("positionBottomRight");
            }
            if (positionText !== "") {
                ctx.fillText(positionText, canvas.width / 2, 20);
            }
        }

        let is2v2layerFormat = false;
        if (state.players !== undefined && state.players !== null) {
            if (state.players["top-left"] !== undefined) {
                is2v2layerFormat = true;
            }
        }
        
        ctx.fillStyle = "white";

        if (is2v2layerFormat === true) {
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

        ctx.font = "64px Bit5x3, monospace";
        ctx.fillStyle = "white";
        ctx.textAlign = "center";

        // Get ball direction from server
        const ballDx = state.ball.dx;


        let leftScore = 0;
        let rightScore = 0;

        if (state.score !== undefined && state.score.left !== undefined) {
            leftScore = state.score.left;
        }
        if (state.score !== undefined && state.score.right !== undefined) {
            rightScore = state.score.right;
        }

        scoreTracker.update(leftScore, rightScore, ballDx);

        ctx.fillText(leftScore.toString(), canvas.width / 4, 50);
        ctx.fillText(rightScore.toString(), (3 * canvas.width) / 4, 50);

        if (state.winner !== undefined) {
            ctx.font = "32px Bit5x3, monospace";
            let displayText = "";
            if (myTeam !== null)
                displayText = (myTeam === state.winner) ? t("youWin") : t("youLose");
            else
                displayText = t("winner") + state.winner;
            ctx.fillText(displayText, canvas.width / 2, canvas.height / 2);
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

        ctx.font = "32px Bit5x3, monospace";
        ctx.fillText(message, canvas.width / 2, canvas.height / 2 - 20);

        if (subtitle !== undefined) {
            ctx.font = "24px Bit5x3, monospace";
            ctx.fillText(subtitle, canvas.width / 2, canvas.height / 2 + 40);
        }
    }

    function adjustCanvasToViewport(): void {
        const canvas = document.getElementById('pong') as HTMLCanvasElement | null;
        const wrapper = document.querySelector('.pong-game-wrapper') as HTMLElement | null;
        if (!canvas || !wrapper) return;

        const top = wrapper.getBoundingClientRect().top;
        const availableHeight = Math.max(160, window.innerHeight - top - 64);

        canvas.style.maxHeight = availableHeight + 'px';
        canvas.style.height = 'auto';
        canvas.style.width = 'auto';
    }

    function debounce(fn: () => void, ms: number) {
        let t: number | undefined;
        return () => {
            if (t) window.clearTimeout(t);
            t = window.setTimeout(fn, ms) as unknown as number;
        };
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

    const debouncedCanvasUpdate = debounce(() => {
        adjustCanvasToViewport();
    }, 120);
    window.addEventListener('resize', debouncedCanvasUpdate);
    setTimeout(() => {
        adjustCanvasToViewport();
    }, 200);
}