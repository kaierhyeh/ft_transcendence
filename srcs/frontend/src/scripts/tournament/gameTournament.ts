import { TournamentMatch, GameConfig, GameState, GameSystem, TournamentKeyHandlers, WebSocketMessage } from './types.js';
import { TournamentApiService } from './api.js';
import { initGame } from '../game.js';

export class TournamentGameManager {
    private gameId: number | null = null;
    private gameWebSockets: WebSocket[] = [];  // Multiple WebSockets for JWT auth
    private jwtTickets: string[] = [];         // Store JWT tickets
    private currentGameWinner: string | null = null;
    private gameStarted: boolean = false;
    private gameEnded: boolean = false;
    private apiService: TournamentApiService;
    private currentMatch: TournamentMatch | null = null;
    
    private onGameEndCallback: ((winner: string) => void) | null = null;

    private inputInterval: any = null;
    private keys: { [key: string]: boolean } = {};

    constructor() {
        this.apiService = new TournamentApiService();
    }

    setOnGameEndCallback(callback: (winner: string) => void): void {
        this.onGameEndCallback = callback;
    }

    async initTournamentGame(canvas: HTMLCanvasElement, match: TournamentMatch): Promise<void> {
        console.log('Initializing tournament game for match:', match);
        this.currentMatch = match;
        
        this.cleanupGame();
        
        try {
            // Get game session with JWT tickets from matchmaking service
            const matchResult = await this.apiService.createGameSession(match.player1, match.player2);
            this.gameId = matchResult.game_id;
            this.jwtTickets = matchResult.jwt_tickets;

            console.log('Tournament match created with ID:', this.gameId);
            console.log('JWT tickets received:', this.jwtTickets.length);

            if (this.gameId !== null && this.gameId !== undefined)
                        this.connectTournamentWebSockets(this.gameId);
            else
                throw new Error('Invalid game ID received');

            canvas.id = 'pong';
            
            initGame();
            
            setTimeout(() => {
                const gameSystem = (window as any).gameSystem as GameSystem;
                if (gameSystem) {
                    gameSystem.setGameConfig?.({
                        canvas_width: 800,
                        canvas_height: 750,
                        paddle_height: 50,
                        paddle_width: 10,
                        win_point: 7,
                        ball_size: 10
                    });
                    gameSystem.setGameStarted?.(true);
                }
            }, 300);

        } catch (error) {
            console.error('Error creating tournament game:', error);
            throw error;
        }
    }

    private cleanupGame(): void {
        if ((window as any).gameSystem) {
            const gameSystem = (window as any).gameSystem as GameSystem;
            if (gameSystem.cleanup)
                gameSystem.cleanup();
        }
        
        this.cleanupControls();
        
        // Close all WebSocket connections
        this.gameWebSockets.forEach((ws, index) => {
            if (ws && ws.readyState === WebSocket.OPEN) {
                console.log(`Closing tournament WebSocket ${index} during cleanup`);
                ws.close();
            }
        });
        this.gameWebSockets = [];
        this.jwtTickets = [];
        
        this.gameId = null;
        this.currentGameWinner = null;
        this.gameStarted = false;
        this.gameEnded = false;
    }

    private setupTournamentControls(): void {
        if (!this.currentMatch) return;

        this.keys = {};
        const keyDownHandler = (e: KeyboardEvent) => {
            this.keys[e.key] = true;
        };
        const keyUpHandler = (e: KeyboardEvent) => {
            this.keys[e.key] = false;
        };
        document.addEventListener('keydown', keyDownHandler);
        document.addEventListener('keyup', keyUpHandler);
        (window as any).tournamentKeyHandlers = { keyDownHandler, keyUpHandler } as TournamentKeyHandlers;

        this.inputInterval = setInterval(() => {
            this.sendCurrentInputs();
        }, 50);
    }

    private cleanupControls(): void {
        const handlers = (window as any).tournamentKeyHandlers as TournamentKeyHandlers | null;
        if (handlers) {
            document.removeEventListener('keydown', handlers.keyDownHandler);
            document.removeEventListener('keyup', handlers.keyUpHandler);
            (window as any).tournamentKeyHandlers = null;
        }
        if (this.inputInterval) {
            clearInterval(this.inputInterval);
            this.inputInterval = null;
        }
    }

    private sendCurrentInputs(): void {
        if (this.gameWebSockets.length === 0 || !this.currentMatch) return;
        
        // Player 1 (WebSocket 0)
        if (this.gameWebSockets[0] && this.gameWebSockets[0].readyState === WebSocket.OPEN) {
            let move1 = 'stop';
            if (this.keys['w'] || this.keys['W']) move1 = 'up';
            else if (this.keys['s'] || this.keys['S']) move1 = 'down';
            
            this.gameWebSockets[0].send(JSON.stringify({
                type: 'input',
                move: move1
            }));
        }
        
        // Player 2 (WebSocket 1)
        if (this.gameWebSockets[1] && this.gameWebSockets[1].readyState === WebSocket.OPEN) {
            let move2 = 'stop';
            if (this.keys['ArrowUp']) move2 = 'up';
            else if (this.keys['ArrowDown']) move2 = 'down';
            
            this.gameWebSockets[1].send(JSON.stringify({
                type: 'input',
                move: move2
            }));
        }
    }

    private connectTournamentWebSockets(id: number): void {
        if (!this.currentMatch || this.jwtTickets.length === 0) return;

        // Create multiple WebSocket connections (one per player)
        this.gameWebSockets = this.apiService.createMultipleWebSocketConnections(id, this.jwtTickets);
        
        // Setup each WebSocket connection
        this.gameWebSockets.forEach((ws, index) => {
            ws.onopen = () => {
                console.log(`Tournament WebSocket ${index} connected successfully`);
                
                // Send join message with JWT ticket
                const joinMessage = {
                    type: "join",
                    ticket: this.jwtTickets[index]
                };
                ws.send(JSON.stringify(joinMessage));
                
                // Setup controls only after first connection
                if (index === 0) {
                    this.setupTournamentControls();
                }
            };

            ws.onmessage = (event: MessageEvent) => {
                try {
                    const message: WebSocketMessage = JSON.parse(event.data);
                    if (message.type === 'game_state')
                        this.handleTournamentGameState(message.data);
                } catch (error) {
                    console.error(`Error parsing tournament game data from WebSocket ${index}:`, error);
                }
            };

            ws.onclose = (event: CloseEvent) => {
                console.log(`Tournament WebSocket ${index} disconnected:`, event.code, event.reason);
            };

            ws.onerror = (error: Event) => {
                console.error(`Tournament WebSocket ${index} error:`, error);
                const canvas = document.getElementById('tournament-pong') as HTMLCanvasElement;
                const ctx = canvas?.getContext('2d');
                if (ctx) {
                    ctx.fillStyle = '#ef4444';
                    ctx.font = '16px Arial';
                    ctx.textAlign = 'center';
                    ctx.fillText('WebSocket connection error - check server status', canvas.width / 2, canvas.height / 2 + 60);
                }
            };
        });
    }

    private handleTournamentGameState(gameState: GameState): void {
        const gameSystem = (window as any).gameSystem as GameSystem;
        
        if (!gameSystem) {
            console.error('Game system not available for tournament');
            return;
        }

        gameSystem.setGameState?.(gameState);
        gameSystem.draw?.();

        if (gameState.winner && this.currentMatch) {
            const winner = gameState.winner === 'left' ? 
                this.currentMatch.player1 : 
                this.currentMatch.player2;
            
            this.onTournamentGameEnd(winner);
        }
    }

    private onTournamentGameEnd(winner: string): void {
        this.currentGameWinner = winner;
        
        this.cleanupControls();
        
        // Close all WebSocket connections
        this.gameWebSockets.forEach((ws, index) => {
            if (ws && ws.readyState === WebSocket.OPEN) {
                console.log(`Closing tournament WebSocket ${index}`);
                ws.close();
            }
        });
        this.gameWebSockets = [];
        this.jwtTickets = [];
        
        if ((window as any).gameSystem) {
            const gameSystem = (window as any).gameSystem as GameSystem;
            if (gameSystem.setGameStarted)
                gameSystem.setGameStarted(false);
        }
        
        if (this.onGameEndCallback)
            this.onGameEndCallback(winner);
    }

    getCurrentGameWinner(): string | null {
        return this.currentGameWinner;
    }

    resetGame(): void {
        this.cleanupGame();
    }

    cleanup(): void {
        this.cleanupGame();
    }
}