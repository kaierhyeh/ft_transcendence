import { user } from './users.js';
import { showInfo } from './notifications.js'; 

let gameWebSocket: WebSocket | null = null;
let currentGameId: number | null = null;
let currentParticipantId: string | null = null;
let matchmakingWebSocket: WebSocket | null = null;

export default function initRemoteGame():void {
    console.log("create remote interface");
    createRemoteInterface();
}

function createRemoteInterface(): void {
    const btn2p = document.getElementById('remote-2p-btn') as HTMLButtonElement;
    const btn4p = document.getElementById('remote-4p-btn') as HTMLButtonElement;

    if (btn2p != null) btn2p.style.display = 'block';
    if (btn4p != null) btn4p.style.display = 'block';

    setupRemoteEvents();
}

function setupRemoteEvents(): void {
    const btn2p = document.getElementById('remote-2p-btn');
    const btn4p = document.getElementById('remote-4p-btn');

    if (btn2p != null) {
        btn2p.addEventListener('click', function() { joinQueue("2p"); });
    }

    if (btn4p != null) {
        btn4p.addEventListener('click', function() { joinQueue("4p");  });
    }
}

function generateParticipantId(): string {
    const timestamp = Date.now();
    const randomNumber = Math.random();
    return "remote_" + timestamp + "_" + randomNumber;
}

async function joinQueue(mode: "2p" | "4p"): Promise<void> {
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
        if (btn2p) {
            btn2p.disabled = false;
            btn2p.textContent = "Join 2 Players";
        }
        if (btn4p) {
            btn4p.disabled = false;
            btn4p.textContent = "Join 4 Players";
        }
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
    const wsUrl = protocol + '//' + host + '/game/matchmaking/ws?participant_id=' + currentParticipantId;
    
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
                console.log('MATCH TROUVÉ! game_id: ' + data.game_id);
                
                if (matchmakingWebSocket != null) {
                    matchmakingWebSocket.close();
                    matchmakingWebSocket = null;
                }
                
                const btn2p = document.getElementById('remote-2p-btn');
                const btn4p = document.getElementById('remote-4p-btn');
                
                if (btn2p != null) {
                    btn2p.textContent = 'Match found!';
                }
                if (btn4p != null) {
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
    };
    
    matchmakingWebSocket.onerror = function(error) {
        console.error('Erreur WebSocket matchmaking:', error);
        matchmakingWebSocket = null;
    };
}

function connectToGame(gameId: number): void {

    currentGameId = gameId;
    
    //ws/wss security, might need to add it on the other module
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
        
        document.addEventListener('keydown', onKeyPressed);
        document.addEventListener('keyup', onKeyReleased);
    };
    
    gameWebSocket.onmessage = function(event) {
        console.log("Msg from serveur:", event.data);
    };
    
    gameWebSocket.onclose = function(event) {
        console.log("websocket fermé :", event.code, event.reason);
    };
    
    gameWebSocket.onerror = function(error) {
        console.error("erreur de websocket :", error);
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

function matchFound(gameId: number): void {
    console.log("debug before show match found, game id is :", gameId);
    const button = document.getElementById('remote-2p-btn');
    if (button) {
        button.textContent = "Match found! Connecting...";
    }
    connectToGame(gameId);
}