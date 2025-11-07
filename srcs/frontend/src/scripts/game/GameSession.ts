// GameSession.ts
import type { GameConfig, GameState, GameState2v2, GameParticipant, GameMode, GameFormat, Team, PlayerSlot } from "./types.js";
import { createMatch, getGameConfig } from "./api.js";

const API_GAME_ENDPOINT = `${window.location.origin}/api/game`;

export interface PlayerAssignment {
    team: Team;
    slot: PlayerSlot;
    username?: string;
}

export interface GameEndedInfo {
    reason: "player_disconnected" | "game_over";
    disconnected_player?: {
        team: Team;
        slot: PlayerSlot;
        username?: string;
    };
}

export interface GameSession {
    readonly gameId: number;
    readonly mode: GameMode;
    readonly format: GameFormat;
    readonly config: GameConfig;
    readonly online: boolean;
    
    // State accessors
    getState(): GameState | GameState2v2 | null;
    isOver(): boolean;
    getWinner(): Team | null;
    getMyTeam(): Team | null;
    getMySlot(): PlayerSlot | null;
    
    // Control
    sendInput(playerIndex: number, move: 'up' | 'down' | 'stop'): void;
    onStateUpdate(callback: (state: GameState | GameState2v2) => void): void;
    onGameOver(callback: (winner: Team, myTeam: Team | null) => void): void;
    onPlayerAssigned(callback: (assignment: PlayerAssignment) => void): void;
    onGameEnded(callback: (info: GameEndedInfo) => void): void;
    onGameStarted(callback: () => void): void;
    
    // Cleanup
    cleanup(): Promise<void>;
}

export async function createGameSession(
    mode: GameMode,
    format: GameFormat,
    participants: GameParticipant[],
    online: boolean = false,
    game_id: number | null = null
): Promise<GameSession> {
    if (!game_id) {
        // 1. Create match
        const result = await createMatch(mode, format, participants);
        console.log(`Game session ${game_id} created (${mode}, ${format})`);
        game_id = result.game_id;
    }
    
    // 2. Get config
    const config = await getGameConfig(game_id);
    
    // 3. Setup WebSockets
    const websockets: WebSocket[] = [];
    const numPlayers = format === '1v1' ? (online ? 1 : 2) : 4;
    
    let currentState: GameState | GameState2v2 | null = null;
    let winner: Team | null = null;
    let myTeam: Team | null = null;
    let mySlot: PlayerSlot | null = null;
    let gameStarted: boolean = false;
    
    const stateUpdateCallbacks: Array<(state: GameState | GameState2v2) => void> = [];
    const gameOverCallbacks: Array<(winner: Team, myTeam: Team | null) => void> = [];
    const playerAssignedCallbacks: Array<(assignment: PlayerAssignment) => void> = [];
    const gameEndedCallbacks: Array<(info: GameEndedInfo) => void> = [];
    const gameStartedCallbacks: Array<() => void> = [];
    
    // Create WebSocket connections
    for (let i = 0; i < numPlayers; i++) {
        const ws = new WebSocket(`${API_GAME_ENDPOINT}/${game_id}/ws`);
        websockets.push(ws);
        
        // Set up message handler BEFORE opening to catch early messages
        ws.onmessage = (event: MessageEvent) => {
            try {
                const message = JSON.parse(event.data);
                
                // console.log(`[WS ${i}] Received message:`, message.type, message);
                
                if (message.type === "player_assigned") {
                    myTeam = message.team;
                    mySlot = message.slot;
                    const assignment: PlayerAssignment = {
                        team: message.team,
                        slot: message.slot,
                        username: message.username
                    };
                    console.log(`[WS ${i}] Player assigned:`, assignment);
                    playerAssignedCallbacks.forEach(cb => cb(assignment));
                }
                else if (message.type === "game_state") {
                    currentState = message.data;
                    
                    // Trigger game started on first state
                    if (!gameStarted) {
                        gameStarted = true;
                        console.log(`[WS ${i}] Game started!`);
                        gameStartedCallbacks.forEach(cb => cb());
                    }
                    
                    stateUpdateCallbacks.forEach(cb => cb(currentState!));
                    
                    // Check for winner (backend sends 'left' or 'right')
                    const newWinner = currentState?.winner;
                    if (newWinner && !winner) {
                        winner = newWinner;
                        console.log(`[WS ${i}] Game over! Winner:`, winner);
                        gameOverCallbacks.forEach(cb => cb(winner!, myTeam));
                    }
                }
                else if (message.type === "game_ended") {
                    const info: GameEndedInfo = {
                        reason: message.data.reason,
                        disconnected_player: message.data.disconnected_player
                    };
                    console.log(`[WS ${i}] Game ended:`, info);
                    gameEndedCallbacks.forEach(cb => cb(info));
                }
            } catch (error) {
                console.error(`Failed to parse message from WS ${i}:`, error);
            }
        };
        
        await new Promise<void>((resolve, reject) => {
            ws.onopen = () => {
                console.log(`[WS ${i}] Connected, sending join message`);
                ws.send(JSON.stringify({ type: "join", participant_id: participants[i].participant_id }));
                resolve();
            };
            ws.onerror = (error) => reject(error);
            setTimeout(() => reject(new Error(`WebSocket ${i} timeout`)), 5000);
        });
        
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
        online,
        
        getState() {
            return currentState;
        },
        
        isOver() {
            return winner !== null;
        },
        
        getWinner() {
            return winner;
        },
        
        getMyTeam() {
            return myTeam;
        },
        
        getMySlot() {
            return mySlot;
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
                callback(winner, myTeam);
            }
        },
        
        onPlayerAssigned(callback) {
            playerAssignedCallbacks.push(callback);
            // If already assigned, call immediately
            if (myTeam && mySlot) {
                callback({ team: myTeam, slot: mySlot });
            }
        },
        
        onGameEnded(callback) {
            gameEndedCallbacks.push(callback);
        },
        
        onGameStarted(callback) {
            gameStartedCallbacks.push(callback);
            // If game already started, call immediately
            if (gameStarted) {
                callback();
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