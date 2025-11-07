import { TournamentMatch, GameParticipant } from './types.js';
import user from '../user/User.js';
import { createGameSession, GameSession } from '../game/GameSession.js';
import { GameRenderer } from '../game/GameRenderer.js';
import { GameMessenger } from '../game/GameMessenger.js';
import { InputController } from '../game/InputController.js';
import { generateParticipantId } from '../game/utils.js';

export class TournamentGameManager {
    private currentMatch: TournamentMatch | null = null;
    private currentGameWinner: string | null = null;
    private onGameEndCallback: ((winner: string) => void) | null = null;
    
    // Component references
    private renderer: GameRenderer | null = null;
    private messenger: GameMessenger | null = null;
    private inputController: InputController | null = null;
    private session: GameSession | null = null;

    setOnGameEndCallback(callback: (winner: string) => void): void {
        this.onGameEndCallback = callback;
    }

    async initTournamentGame(canvas: HTMLCanvasElement, match: TournamentMatch): Promise<void> {
        console.log('Initializing tournament game for match:', match);
        this.currentMatch = match;
        
        this.cleanupGame();
        
        try {
            // Verify authentication before creating tournament participants
            // This ensures tokens are still valid when creating the game session
            const isAuthenticated = await user.ensureAuthenticated();
            
            const participants: GameParticipant[] = [
                (match.player1 === user.alias && isAuthenticated) ?
                    { type: "registered", user_id: user.user_id ?? undefined, participant_id: generateParticipantId() } :
                    { type: "guest", user_id: undefined, participant_id: generateParticipantId() },
                (match.player2 === user.alias && isAuthenticated) ?
                    { type: "registered", user_id: user.user_id ?? undefined, participant_id: generateParticipantId() } :
                    { type: "guest", user_id: undefined, participant_id: generateParticipantId() }
            ];
            
            canvas.id = 'pong';
            this.renderer = new GameRenderer('pong', false);
            this.messenger = new GameMessenger('game-message');
            
            this.inputController = new InputController();
            
            // Show connecting message
            this.messenger.showConnecting();
            
            const session = await createGameSession('tournament', '1v1', participants);
            
            console.log('Tournament session created:', session.gameId);
            
            this.session = session;
            
            // Hide connecting message when game starts
            session.onGameStarted(() => {
                if (this.messenger) {
                    this.messenger.hide();
                }
            });
            
            this.renderer.attachToSession(session);
            this.inputController.attachToSession(session);
            
            session.onGameOver((winner) => {
                console.log('Tournament match finished, winner:', winner);
                
                const winnerName = winner === 'left' ? match.player1 : match.player2;
                
                this.currentGameWinner = winnerName;
                
                if (this.inputController)
                    this.inputController.detach();
                
                if (this.onGameEndCallback)
                    this.onGameEndCallback(winnerName);
            });

        } catch (error) {
            console.error('Error creating tournament game:', error);
            throw error;
        }
    }

    private cleanupGame(): void {
        if (this.inputController) {
            this.inputController.detach();
            this.inputController = null;
        }
        
        if (this.renderer) {
            this.renderer.detach();
            this.renderer = null;
        }
        
        if (this.messenger) {
            this.messenger.hide();
            this.messenger = null;
        }
        
        if (this.session) {
            this.session.cleanup();
            this.session = null;
        }
        
        this.currentGameWinner = null;
    }

    getCurrentGameWinner(): string | null {
        return this.currentGameWinner;
    }

    getCurrentGameScore(): { left: number; right: number } | null {
        try {
            const state = this.session?.getState() as any | null;
            if (state && state.score) {
                const left = typeof state.score.left === 'number' ? state.score.left : 0;
                const right = typeof state.score.right === 'number' ? state.score.right : 0;
                return { left, right };
            }
        } catch (err) {
            console.warn('Failed to get current game score from session:', err);
        }

        return null;
    }

    resetGame(): void {
        this.cleanupGame();
    }

    cleanup(): void {
        this.cleanupGame();
    }
}