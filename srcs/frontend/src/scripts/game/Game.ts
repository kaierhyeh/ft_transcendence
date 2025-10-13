import "./types.js";
import user from "../user/User.js";

const API_GAME_ENDPOINT = `${window.location.origin}/api/game`;
const API_MATCHMAKING_ENDPOINT = `${window.location.origin}/api/match`;

export class Game {

    async cleanup() {
        console.log("Cleaning up current game - WebSockets count:", websockets.length, "Game ID:", game_id, "Mode:", gameMode);
        
        if (aiInterval !== null) {
            clearInterval(aiInterval);
            aiInterval = null;
        }
        
        if (inputInterval !== null) {
            clearInterval(inputInterval);
            inputInterval = null;
        }

        // Close all WebSocket connections
        websockets.forEach((ws, index) => {
            if (ws && ws.readyState !== WebSocket.CLOSED) {
                console.log(`Closing WebSocket ${index} - current state:`, ws.readyState);
                ws.onopen = null;
                ws.onmessage = null;
                ws.onerror = null;
                ws.onclose = null;
                
                if (ws.readyState === WebSocket.OPEN || ws.readyState === WebSocket.CONNECTING) {
                    try {
                        ws.close(1000, "Cleanup");
                    } catch (e) {
                        console.error(`Error closing websocket ${index}:`, e);
                    }
                }
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

        if (ctx && canvas)
            ctx.clearRect(0, 0, canvas.width, canvas.height)
    }

    async setup(gameMode: GameMode, gameFormat: GameFormat, participants: GameParticipant[]) {
        
    }

    async run() {

    }
}

export default new Game();