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
        if (!this.gameWebSocket || this.gameWebSocket.readyState !== WebSocket.OPEN || !this.currentMatch) return;
        let move1 = 'stop';
        if (this.keys['w'] || this.keys['W']) move1 = 'up';
        else if (this.keys['s'] || this.keys['S']) move1 = 'down';
        this.gameWebSocket.send(JSON.stringify({
            type: 'input',
            participant_id: `player_${this.currentMatch.player1}`,
            move: move1
        }));
        let move2 = 'stop';
        if (this.keys['ArrowUp']) move2 = 'up';
        else if (this.keys['ArrowDown']) move2 = 'down';
        this.gameWebSocket.send(JSON.stringify({
            type: 'input',
            participant_id: `player_${this.currentMatch.player2}`,
            move: move2
        }));
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