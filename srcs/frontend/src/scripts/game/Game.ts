import "./types.js";
import user from "../user/User.js";

const API_GAME_ENDPOINT = `${window.location.origin}/api/game`;
const API_MATCHMAKING_ENDPOINT = `${window.location.origin}/api/match`;

interface GameConf {
    canvas_width: number;
    canvas_height: number;
    paddle_width: number;
    paddle_height: number;
    win_point: number;
    ball_size: number;
}

export class Game {
    private winner: Team | undefined;
    private game_id: number;
    private jwtTickets: string[];
    private gameConf: GameConf;

    constructor() {
        this.winner = undefined;
    }

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
        try {
            // 1. Create match through matchmaking service
            const matchResult = await this.createMatch(participants);
            
            this.game_id = matchResult.game_id;
            this.jwtTickets = matchResult.jwt_tickets;
            console.log(`${gameFormat === '1v1' ? '2-player' : '4-player'} match created with ID:`, game_id);
            console.log("JWT tickets received:", this.jwtTickets.length);
            
            // 2. Get game configuration
            const response = await fetch(API_GAME_ENDPOINT + `/${this.game_id}/conf`);
            if (!response.ok)
                throw new Error(`Failed to get game config: ${response.status}`);
            
            this.gameConf = await response.json() as GameConf;
            canvas.width = game_conf.canvas_width;
            canvas.height = game_conf.canvas_height;
            console.log(`${gameFormat === '1v1' ? '2-player' : '4-player'} game initialized:`, game_conf);
           
        } catch(error) {

        }
    }

    private async createMatch(particpants: GameParticipant[]) {

    }

    async run() {

    }

    get over(): boolean {
        return this.winner !== undefined;
    }
}

export default new Game();