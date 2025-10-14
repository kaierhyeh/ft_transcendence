import { TournamentMatch, GameParticipant } from './types.js';
import { createGameSession, GameSession } from '../game/GameSession.js';
import { GameRenderer } from '../game/GameRenderer.js';
import { InputController } from '../game/InputController.js';

export class TournamentGameManager {
    private currentMatch: TournamentMatch | null = null; // Not used yet
    private currentGameWinner: string | null = null;
    private onGameEndCallback: ((winner: string) => void) | null = null;
    
    // Component references
    private renderer: GameRenderer | null = null;
    private inputController: InputController | null = null;
    private session: GameSession | null = null;  // Keep session reference

    setOnGameEndCallback(callback: (winner: string) => void): void {
        this.onGameEndCallback = callback;
    }

    async initTournamentGame(canvas: HTMLCanvasElement, match: TournamentMatch): Promise<void> {
        console.log('Initializing tournament game for match:', match);
        this.currentMatch = match;
        
        // Cleanup any previous game
        this.cleanupGame();
        
        try {
            // Create game participants (both as guests for tournament)
            const participants: GameParticipant[] = [
                { type: "guest", user_id: undefined },
                { type: "guest", user_id: undefined }
            ];
            
            // Setup renderer
            canvas.id = 'pong';
            this.renderer = new GameRenderer('pong');
            
            // Setup input controller for tournament (both players controlled by humans)
            this.inputController = new InputController();
            
            // Create game session using factory
            const session = await createGameSession('tournament', '1v1', participants);
            
            console.log('Tournament session created:', session.gameId);
            
            // Store session reference
            this.session = session;
            
            // Attach components to session
            this.renderer.attachToSession(session);
            this.inputController.attachToSession(session);
            
            // Wait for game to finish
            session.onGameOver((winner) => {
                console.log('Tournament match finished, winner:', winner);
                
                // Map team ('left'/'right') to player names
                const winnerName = winner === 'left' ? match.player1 : match.player2;
                
                // Store winner but DON'T cleanup yet (so canvas stays visible)
                this.currentGameWinner = winnerName;
                
                // Only detach input controller to prevent further input
                if (this.inputController) {
                    this.inputController.detach();
                }
                
                // Notify tournament manager
                if (this.onGameEndCallback) {
                    this.onGameEndCallback(winnerName);
                }
            });

        } catch (error) {
            console.error('Error creating tournament game:', error);
            throw error;
        }
    }

    private cleanupGame(): void {
        // Detach and cleanup input controller
        if (this.inputController) {
            this.inputController.detach();
            this.inputController = null;
        }
        
        // Detach and cleanup renderer
        if (this.renderer) {
            this.renderer.detach();
            this.renderer = null;
        }
        
        // Cleanup session
        if (this.session) {
            this.session.cleanup();
            this.session = null;
        }
        
        this.currentGameWinner = null;
    }

    // private onTournamentGameEnd(winner: string): void {
    //     this.currentGameWinner = winner;
        
    //     // Cleanup components
    //     this.cleanupGame();
        
    //     // Notify tournament manager
    //     if (this.onGameEndCallback) {
    //         this.onGameEndCallback(winner);
    //     }
    // }

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