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
    if (user === undefined) {
        console.log("User disconnected during waiting line");
        return ""; // RETURN ATTENTION 
        /////IMPORTANT ICI /////
        //Check server code how we trow error for empty id"
    }
    
    const timestamp = Date.now();
    const randomNumber = Math.random();
    return user.userId + "_" + timestamp + "_" + randomNumber;
}

/*//reuse for websocket later!!!
function showRemoteStatus(message: string, buttonId: string): void {
    const element = document.getElementById(buttonId);
    if (element != null) {
        element.textContent = message;
    }
}

function joinQueue(mode: "2p" | "4p"): void {

    const participantId = generateParticipantId(); // <- ft teest to create, check more into id

    try {
        const response = await fetch('', {
            method:
            headers:,
            body:
                mode: mode,
                participant_id: participantId
            })
        });

        const data = await response.json();

        */
async function joinQueue(mode: "2p" | "4p"): Promise<void> {
    let buttonId;
    if (mode === "2p") {
        buttonId = "remote-2p-btn";
    } else {
        buttonId = "remote-4p-btn";
    }

    if (user === undefined) {
        console.log("User not connected");
        return;
    }

    const participantId = generateParticipantId();
    currentParticipantId = participantId;
    
    const button = document.getElementById(buttonId);
    if (button != null) {
        button.textContent = "Joining...";
    }

    try {
        const response = await fetch('/game/remoteMatchmaking/join', {
            method: 'POST',
            credentials: 'include',
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                mode: mode,
                participant_id: participantId
            })
        });

        const data = await response.json();

        if (data.success) {
    console.log("Success!");
    
    if (data.type === "game_ready") {
        console.log("Match found , game_id = ", data.game_id);
        //here call connect game later
    } else if (data.type === "queue_joined") {
        if (button != null) {
            button.textContent = `Waiting...`;
        }
        //here maybe listen  connexion?later
    }
    return;
}
        console.log("Error:", data.error);
        if (button != null) {
            if (mode === "2p") {
               button.textContent = "Join 2P";
            } else {
                button.textContent = "Join 4P";
            }
        }
        return;

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
    };
    
    gameWebSocket.onmessage = (event) => {
        console.log("Message reçu du serveur:", event.data);
    };
    
    gameWebSocket.onclose = (event) => {
        console.log("WebSocket fermé:", event.code, event.reason);
    };
    
    gameWebSocket.onerror = (error) => {
        console.error("Erreur WebSocket:", error);
    };
}

//ADD A WAY TO DEAL WITH EVENTS TOUCH