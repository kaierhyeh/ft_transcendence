/* add merge user and uncomment the nxt line*/
// import { user } from './users.js';
import { showError } from './notifications.js'; 

let gameWebSocket: WebSocket | null = null;
let currentGameId: number | null = null;
let currentParticipantId: string | null = null;
let matchmakingWebSocket: WebSocket | null = null;
let gameCanvas: HTMLCanvasElement | null = null;
let gameContext: CanvasRenderingContext2D | null = null;
let remotePartyMode: string = '';
let keyDownHandler: any = null;
let keyUpHandler: any = null; 

export default function initRemoteGame():void {
    console.log("create remote interface");
    createRemoteInterface();
}

function resetRemoteUI(message?: string): void {
    if (matchmakingWebSocket != null) {
        matchmakingWebSocket.close();
        matchmakingWebSocket = null;
    }
    if (gameWebSocket != null) {
        gameWebSocket.close();
        gameWebSocket = null;
    }
    currentGameId = null;
    currentParticipantId = null;
    remotePartyMode = '';

    const btn2p = document.getElementById('remote-2p-btn') as HTMLButtonElement;
    const btn4p = document.getElementById('remote-4p-btn') as HTMLButtonElement;
    const btnCancel = document.getElementById('remote-cancel-btn') as HTMLButtonElement;

    if (btn2p != null) {
        btn2p.disabled = false;
        btn2p.textContent = "Join 2 Players";
    }
    if (btn4p != null) {
        btn4p.disabled = false;
        btn4p.textContent = "Join 4 Players";
    }
    if (btnCancel != null) {
        btnCancel.style.display = 'none';
    }

    if (message != null && message !== '') {
        showError(message);
    }
}

function createRemoteInterface(): void {
    const btn2p = document.getElementById('remote-2p-btn') as HTMLButtonElement;
    const btn4p = document.getElementById('remote-4p-btn') as HTMLButtonElement;
    const btnCancel = document.getElementById('remote-cancel-btn') as HTMLButtonElement;

    if (btn2p != null) btn2p.style.display = 'block';
    if (btn4p != null) btn4p.style.display = 'block';
    if (btnCancel != null) btnCancel.style.display = 'none';

    setupRemoteEvents();
}

function setupRemoteEvents(): void {
    const btn2p = document.getElementById('remote-2p-btn');
    const btn4p = document.getElementById('remote-4p-btn');
    const btnCancel = document.getElementById('remote-cancel-btn');

    if (btn2p != null) {
        btn2p.addEventListener('click', function() { joinQueue("2p"); });
    }

    if (btn4p != null) {
        btn4p.addEventListener('click', function() { joinQueue("4p");  });
    }

    if (btnCancel != null) {
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
    
    if (btn2p) btn2p.disabled = true;
    if (btn4p) btn4p.disabled = true;
    
    let buttonId;
    if (mode === "2p") {
        buttonId = "remote-2p-btn";
    } else {
        buttonId = "remote-4p-btn";
    }
    
    const participantId = generateParticipantId();
    currentParticipantId = participantId;
    
    const button = document.getElementById(buttonId);
    if (button != null) {
        button.textContent = "Joining...";
    }
    
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
        console.log("Réponse complète du serveur:", data);
        
        if (data.type === "game_ready") {
            console.log("Match found, game_id =", data.game_id);
            connectToGame(data.game_id);
        } else if (data.type === "queue_joined") {
            console.log("En attente dans la queue, position:", data.position);
            if (button != null) {
                button.textContent = "Waiting...";
            }

            const btnCancel = document.getElementById('remote-cancel-btn') as HTMLButtonElement;
            if (btnCancel != null) {
                btnCancel.style.display = 'block';
            }

            openMatchmakingWebSocket();
        } else if (data.type === "error") {
            console.log("Erreur:", data.message);
            if (btn2p) {
                btn2p.disabled = false;
                btn2p.textContent = "Join 2 Players";
            }
            if (btn4p) {
                btn4p.disabled = false;
                btn4p.textContent = "Join 4 Players";
            }
        }
    } catch (error) {
        console.log("Connection error:", error);
        resetRemoteUI("Connection failed , please try again.");
    }
}

function openMatchmakingWebSocket(): void {
    if (matchmakingWebSocket != null) {
        return;
    }
    
    let protocol = 'ws:';
    if (window.location.protocol === 'https:') {
        protocol = 'wss:';
    }
    
    const host = window.location.host;
    const wsUrl = protocol + '//' + host + '/game/ws?participant_id=' + currentParticipantId;
    
    console.log('Ouverture WebSocket matchmaking: ' + wsUrl);
    
    matchmakingWebSocket = new WebSocket(wsUrl);
    
    matchmakingWebSocket.onopen = function() {
        console.log('WebSocket matchmaking connectée');
    };
    
    matchmakingWebSocket.onmessage = function(event) {
        console.log('Message matchmaking reçu:', event.data);
        
        try {
            const data = JSON.parse(event.data);
            
            if (data.type === 'game_ready') {
                console.log('Match found, game_id: ' + data.game_id);
                
                if (matchmakingWebSocket != null) {
                    matchmakingWebSocket.close(1000, "Match found");
                    matchmakingWebSocket = null;
                }

                const btn2p = document.getElementById('remote-2p-btn');
                const btn4p = document.getElementById('remote-4p-btn');

                if (remotePartyMode === '2p' && btn2p != null) {
                    btn2p.textContent = 'Match found!';
                } else if (remotePartyMode === '4p' && btn4p != null) {
                    btn4p.textContent = 'Match found!';
                }
                
                connectToGame(data.game_id);
            }
        } catch (error) {
            console.error('Erreur parsing message matchmaking:', error);
        }
    };
    
    matchmakingWebSocket.onclose = function(event) {
        console.log('WebSocket matchmaking fermée: ' + event.code + ' ' + event.reason);
        matchmakingWebSocket = null;

        if (event.code !== 1000 && event.code !== 1001) {
            resetRemoteUI("Connection closed. Please try again.");
        }
    };

    matchmakingWebSocket.onerror = function(error) {
        console.error('Erreur WebSocket matchmaking:', error);
        resetRemoteUI("Connection lost. Please try again.");
    };
}

function connectToGame(gameId: number): void {

    currentGameId = gameId;
    
    let protocol = 'ws:';
    if (window.location.protocol === 'https:')  
        protocol = 'wss:';

    const host = window.location.host;
    const wsUrl = protocol + '//' + host + '/game/' + gameId + '/ws';
    
     console.log('connexion websocket vers lurl : ' + wsUrl);
    
    gameWebSocket = new WebSocket(wsUrl);
    
    gameWebSocket.onopen = function() {
        console.log('Connecté au jeu ' + gameId);
        
        const message = {
            type: "join",
            participant_id: currentParticipantId
        };
        const jsonMessage = JSON.stringify(message);
        
        if (gameWebSocket != null) {
            gameWebSocket.send(jsonMessage);
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
                drawRemoteGame(msg.data);
            }
        } catch (error) {
         console.error("Erreur parsing:", error);
        }
    };
    
    gameWebSocket.onclose = function(event) {
        console.log("websocket fermé :", event.code, event.reason);

        if (keyDownHandler != null) {
            document.removeEventListener('keydown', keyDownHandler);
            keyDownHandler = null;
        }
        if (keyUpHandler != null) {
            document.removeEventListener('keyup', keyUpHandler);
            keyUpHandler = null;
        }

        if (event.code !== 1000 && event.code !== 1001) {
            showError("Game ended unexpectedly.");
        }
    };

    gameWebSocket.onerror = function(error) {
        console.error("erreur de websocket :", error);
        showError("Game connection lost.");
    };
}

function onKeyPressed(event: KeyboardEvent): void {
    if (gameWebSocket == null) {
        return;
    }
    if (gameWebSocket.readyState != WebSocket.OPEN) {
        return;
    }
    let movement = "";
    if (event.key == 'ArrowUp') {
        movement = "up";
    }
    if (event.key == 'ArrowDown') {
        movement = "down";
    }
    
    if (movement != "") {
        event.preventDefault();
        
        const message = JSON.stringify({
            type: "input",
            participant_id: currentParticipantId,
            move: movement
        });
        console.log("Message envoyé au serveur:", message);
        gameWebSocket.send(message);
        console.log("debug check mouv " + movement);
    }
}

function onKeyReleased(event: KeyboardEvent): void {
    if (gameWebSocket == null) {
        return;
    }
    if (gameWebSocket.readyState != WebSocket.OPEN) {
        return;
    }

    let shouldStop = false;
    if (event.key == 'ArrowUp') {
        shouldStop = true;
    }
    if (event.key == 'ArrowDown') {
        shouldStop = true;
    }
    
    if (shouldStop) {
        const message = JSON.stringify({
            type: "input",
            participant_id: currentParticipantId,
            move: "stop"
        });
        
        gameWebSocket.send(message);
        console.log("debug: stop bracket");
    }
}

function drawRemoteGame(state: any): void {
    if (gameCanvas == null) {
        gameCanvas = document.getElementById("pong") as HTMLCanvasElement;
        if (gameCanvas == null) return;
        
        gameContext = gameCanvas.getContext("2d");
        if (gameContext == null) return;
    }
    if (gameContext == null) return;
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
    if (state.players) {
        if (state.players["top-left"]) {
            is4PlayerMode = true;
        }
    }
    ctx.fillStyle = "white";
    
    if (is4PlayerMode) {
        const positions = ["top-left", "bottom-left", "top-right", "bottom-right"];
        for (let i = 0; i < positions.length; i++) {
            const player = state.players[positions[i]];
            if (player && player.paddle) {
                ctx.fillRect(player.paddle.x, player.paddle.y, 10, 50);
            }
        }
    } else {
        if (state.players.left) {
            const paddle = state.players.left.paddle;
            ctx.fillRect(paddle.x, paddle.y, 10, 50);
        }
        if (state.players.right) {
            const paddle = state.players.right.paddle;
            ctx.fillRect(paddle.x, paddle.y, 10, 50);
        }
    }
    if (state.ball) {
        ctx.fillRect(state.ball.x - 5, state.ball.y - 5, 10, 10);
    }
    
    ctx.font = "40px Arial";
    ctx.fillStyle = "white";
    ctx.textAlign = "center";
    
    let leftScore = 0;
    let rightScore = 0;
    
    if (state.score && state.score.left) {
        leftScore = state.score.left;
    }
    if (state.score && state.score.right) {
        rightScore = state.score.right;
    }
    
    ctx.fillText(leftScore.toString(), canvas.width / 4, 50);
    ctx.fillText(rightScore.toString(), (3 * canvas.width) / 4, 50);
    
    if (state.winner) {
        ctx.font = "60px Arial";
        ctx.fillText(" 🏆 WINNER 🏆  :  " + state.winner, canvas.width / 2, canvas.height / 2);
    }
}