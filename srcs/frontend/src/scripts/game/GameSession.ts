// GameSession.ts
import type { GameConfig, GameState, GameState4p, GameParticipant, GameMode, GameFormat, Team } from "./types.js";
import { createMatch, getGameConfig } from "./api.js";

const API_GAME_ENDPOINT = `${window.location.origin}/api/game`;

export interface GameSession {
    readonly gameId: number;
    readonly mode: GameMode;
    readonly format: GameFormat;
    readonly config: GameConfig;
    
    // State accessors
    getState(): GameState | GameState4p | null;
    isOver(): boolean;
    getWinner(): Team | null;
    
    // Control
    sendInput(playerIndex: number, move: 'up' | 'down' | 'stop'): void;
    onStateUpdate(callback: (state: GameState | GameState4p) => void): void;
    onGameOver(callback: (winner: Team) => void): void;
    
    // Cleanup
    cleanup(): Promise<void>;
}

export async function createGameSession(
    mode: GameMode,
    format: GameFormat,
    participants: GameParticipant[]
): Promise<GameSession> {
    // 1. Create match
    const matchResult = await createMatch(mode, format, participants);
    const { game_id, jwt_tickets } = matchResult;
    
    console.log(`Game session ${game_id} created (${mode}, ${format})`);
    
    // 2. Get config
    const config = await getGameConfig(game_id);
    
    // 3. Setup WebSockets
    const websockets: WebSocket[] = [];
    const numPlayers = format === '1v1' ? 2 : 4;
    
    let currentState: GameState | GameState4p | null = null;
    let winner: Team | null = null;
    
    const stateUpdateCallbacks: Array<(state: GameState | GameState4p) => void> = [];
    const gameOverCallbacks: Array<(winner: Team) => void> = [];
    
    // Create WebSocket connections
    for (let i = 0; i < numPlayers; i++) {
        const ws = new WebSocket(`${API_GAME_ENDPOINT}/${game_id}/ws`);
        websockets.push(ws);
        
        await new Promise<void>((resolve, reject) => {
            ws.onopen = () => {
                ws.send(JSON.stringify({ type: "join", ticket: jwt_tickets[i] }));
                resolve();
            };
            ws.onerror = (error) => reject(error);
            setTimeout(() => reject(new Error(`WebSocket ${i} timeout`)), 5000);
        });
        
        ws.onmessage = (event: MessageEvent) => {
            try {
                const message = JSON.parse(event.data);
                
                if (message.type === "game_state") {
                    currentState = message.data;
                    stateUpdateCallbacks.forEach(cb => cb(currentState!));
                    
                    // Check for winner (backend sends 'left' or 'right')
                    const newWinner = currentState?.winner;
                    if (newWinner && !winner) {
                        winner = newWinner;
                        gameOverCallbacks.forEach(cb => cb(winner!));
                    }
                }
            } catch (error) {
                console.error(`Failed to parse message from WS ${i}:`, error);
            }
        };
        
        ws.onclose = (event) => {
            console.log(`WebSocket ${i} closed:`, event.code, event.reason);
        };
        
        ws.onerror = (error) => {
            console.error(`WebSocket ${i} error:`, error);
        };
    }
    
    // Return fully initialized session
    return {
        gameId: game_id,
        mode,
        format,
        config,
        
        getState() {
            return currentState;
        },
        
        isOver() {
            return winner !== null;
        },
        
        getWinner() {
            return winner;
        },
        
        sendInput(playerIndex: number, move: 'up' | 'down' | 'stop') {
            if (playerIndex < 0 || playerIndex >= websockets.length) {
                console.warn(`Invalid player index: ${playerIndex}`);
                return;
            }
            
            const ws = websockets[playerIndex];
            if (ws && ws.readyState === WebSocket.OPEN) {
                ws.send(JSON.stringify({ type: "input", move }));
            }
        },
        
        onStateUpdate(callback) {
            stateUpdateCallbacks.push(callback);
        },
        
        onGameOver(callback) {
            gameOverCallbacks.push(callback);
            // If game already over, call immediately
            if (winner) {
                callback(winner);
            }
        },
        
        async cleanup() {
            console.log(`Cleaning up game session ${game_id}`);
            
            // Close all WebSockets
            const closePromises = websockets.map((ws, index) => {
                return new Promise<void>((resolve) => {
                    if (ws.readyState === WebSocket.CLOSED) {
                        resolve();
                        return;
                    }
                    
                    ws.onclose = () => resolve();
                    ws.close(1000, "Cleanup");
                    
                    // Timeout fallback
                    setTimeout(() => resolve(), 1000);
                });
            });
            
            await Promise.all(closePromises);
            websockets.length = 0;
            
            console.log(`Game session ${game_id} cleaned up`);
        }
    };
}