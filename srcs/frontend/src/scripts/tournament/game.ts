import { TournamentMatch, GameConfig, GameState, GameSystem, TournamentKeyHandlers, WebSocketMessage } from './types.js';
import { TournamentApiService } from './api.js';
import { initGame } from '../game.js';

export class TournamentGameManager {
    private gameId: number | null = null;
    private gameWebSocket: WebSocket | null = null;
    private currentGameWinner: string | null = null;
    private gameStarted: boolean = false;
    private gameEnded: boolean = false;
    private apiService: TournamentApiService;
    private currentMatch: TournamentMatch | null = null;
    
    private onGameEndCallback: ((winner: string) => void) | null = null;

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
            this.gameId = await this.apiService.createGameSession(match.player1, match.player2);

            if (this.gameId !== null && this.gameId !== undefined)
                this.connectTournamentWebSocket(this.gameId);
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
                    console.log('Tournament: Configured real game system');
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
        
        if (this.gameWebSocket) {
            this.gameWebSocket.close();
            this.gameWebSocket = null;
        }
        
        this.gameId = null;
        this.currentGameWinner = null;
        this.gameStarted = false;
        this.gameEnded = false;
    }

    private setupTournamentControls(): void {
        if (!this.currentMatch) return;

        const keys: { [key: string]: boolean } = {};
        
        const keyDownHandler = (e: KeyboardEvent) => {
            keys[e.key] = true;
            this.sendPlayerInput(e.key, true);
        };
        
        const keyUpHandler = (e: KeyboardEvent) => {
            keys[e.key] = false;
            this.sendPlayerInput(e.key, false);
        };

        document.addEventListener('keydown', keyDownHandler);
        document.addEventListener('keyup', keyUpHandler);

        (window as any).tournamentKeyHandlers = { keyDownHandler, keyUpHandler } as TournamentKeyHandlers;
    }

    private cleanupControls(): void {
        const handlers = (window as any).tournamentKeyHandlers as TournamentKeyHandlers | null;
        if (handlers) {
            document.removeEventListener('keydown', handlers.keyDownHandler);
            document.removeEventListener('keyup', handlers.keyUpHandler);
            (window as any).tournamentKeyHandlers = null;
        }
    }

    private sendPlayerInput(key: string, isPressed: boolean): void {
        if (!this.gameWebSocket || this.gameWebSocket.readyState !== WebSocket.OPEN || !this.currentMatch) return;

        let move = 'stop';
        let participantId = '';

        if (key === 'w' || key === 'W') {
            move = isPressed ? 'up' : 'stop';
            participantId = `player_${this.currentMatch.player1}`;
        } else if (key === 's' || key === 'S') {
            move = isPressed ? 'down' : 'stop';
            participantId = `player_${this.currentMatch.player1}`;
        }
        else if (key === 'ArrowUp') {
            move = isPressed ? 'up' : 'stop';
            participantId = `player_${this.currentMatch.player2}`;
        } else if (key === 'ArrowDown') {
            move = isPressed ? 'down' : 'stop';
            participantId = `player_${this.currentMatch.player2}`;
        }

        if (participantId) {
            this.gameWebSocket.send(JSON.stringify({
                type: 'input',
                participant_id: participantId,
                move: move
            }));
        }
    }

    private connectTournamentWebSocket(id: number): void {
        if (!this.currentMatch) return;

        this.gameWebSocket = this.apiService.createWebSocketConnection(id);
        
        this.gameWebSocket.onopen = () => {
            console.log('Tournament WebSocket connected successfully');
            
            const player1Id = `player_${this.currentMatch!.player1}`;
            const player2Id = `player_${this.currentMatch!.player2}`;
            
            console.log('Joining as players:', player1Id, player2Id);
            
            this.gameWebSocket?.send(JSON.stringify({ 
                type: 'join',
                participant_id: player1Id
            }));
            
            setTimeout(() => {
                this.gameWebSocket?.send(JSON.stringify({ 
                    type: 'join',
                    participant_id: player2Id
                }));
            }, 100);
            
            this.setupTournamentControls();
        };

        this.gameWebSocket.onmessage = (event: MessageEvent) => {
            try {
                const message: WebSocketMessage = JSON.parse(event.data);
                
                if (message.type === 'game_state')
                    this.handleTournamentGameState(message.data);
                else
                    console.log('Unknown message type:', message.type);
            } catch (error) {
                console.error('Error parsing tournament game data:', error);
            }
        };

        this.gameWebSocket.onclose = (event: CloseEvent) => {
            console.log('Tournament WebSocket disconnected:', event.code, event.reason);
        };

        this.gameWebSocket.onerror = (error: Event) => {
            console.error('Tournament WebSocket error:', error);
            const canvas = document.getElementById('tournament-pong') as HTMLCanvasElement;
            const ctx = canvas?.getContext('2d');
            if (ctx) {
                ctx.fillStyle = '#ef4444';
                ctx.font = '16px Arial';
                ctx.textAlign = 'center';
                ctx.fillText('WebSocket connection error - check server status', canvas.width / 2, canvas.height / 2 + 60);
            }
        };
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
        console.log('Tournament game ended, winner:', winner);
        this.currentGameWinner = winner;
        
        this.cleanupControls();
        
        if (this.gameWebSocket) {
            this.gameWebSocket.close();
            this.gameWebSocket = null;
        }
        
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