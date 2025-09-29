import { user } from './users.js';

let gameWebSocket: WebSocket | null = null;
let currentGameId: number | null = null;
let currentParticipantId: string | null = null;

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
        //2line for test to remove
        console.log("Réponse complète du serveur:", data);
        console.log("Status de la réponse:", response.status);
    if (data.type === "game_ready") {
        console.log("Match found, game_id =", data.game_id);
        connectToGame(data.game_id);
    } else if (data.type === "queue_joined") {
        console.log("En attente dans la queue, position:", data.position);
        if (button != null) {
            button.textContent = "Waiting...";
        }
    } else {
        console.log("Réponse inattendue:", data);
    }
    } catch (error) {
        console.log("Connection error:", error);
        if (button != null) {
            if (mode === "2p") {
                button.textContent = "Join 2P";
            } else {
                button.textContent = "Join 4P";
            }
        }
    }
}

function connectToGame(gameId: number): void {
    currentGameId = gameId;
    
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const host = window.location.host;
    const wsUrl = `${protocol}//${host}/game/${gameId}/ws`;
    
    console.log(`Connexion WebSocket vers: ${wsUrl}`);
    
    gameWebSocket = new WebSocket(wsUrl);
    
    gameWebSocket.onopen = () => {
        console.log(`Connecté au jeu ${gameId}`);
        
        gameWebSocket!.send(JSON.stringify({
            type: "join",
            participant_id: currentParticipantId
        }));
        document.addEventListener('keydown', onKeyPressed);
        document.addEventListener('keyup', onKeyReleased);
    };
    
    gameWebSocket.onmessage = (event) => {
        console.log("Msg from serveur:", event.data);
    };
    
    gameWebSocket.onclose = (event) => {
        console.log("WebSocket fermé:", event.code, event.reason);
    };
    
    gameWebSocket.onerror = (error) => {
        console.error("Erreur WebSocket:", error);
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
        event.preventDefault(); //stop page scrolling 
        
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