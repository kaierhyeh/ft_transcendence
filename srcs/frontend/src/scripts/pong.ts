// pong/pong.ts
import { createGameSession, GameSession } from "./game/GameSession.js";
import { GameRenderer } from "./game/GameRenderer.js";
import { InputController } from "./game/InputController.js";
import { AIController } from "./game/AIController.js";
import { ScoreTracker } from "./live_stats/ScoreTracker.js";
import { ScoreChart } from "./live_stats/ScoreChart.js";
import { ScoreDisplay } from "./live_stats/ScoreDisplay.js";
import user from "./user/User.js";
import { GameFormat, GameMode, GameParticipant } from "./game/types.js";
import { generateParticipantId } from "./game/utils.js";
import { t } from './i18n/i18n.js';    // t for translations

export function initPong() {
    let currentSession: GameSession | null = null;
    let isTransitioning = false;
    
    // Core game components
    const renderer = new GameRenderer("pong");
    const inputController = new InputController();
    const aiController = new AIController();
    
    const scoreTracker = new ScoreTracker(); // Follows the Observer Pattern (also known as Pub/Sub Pattern)
    const scoreChart = new ScoreChart();
    const scoreDisplay = new ScoreDisplay();
    
    // Initialize score display if elements exist
    if (document.getElementById('pong-score-chart')) {
        // Initialize the visual components
        scoreChart.initialize('pong-score-chart');
        scoreDisplay.initialize();
        
        // Subscribe to updates
        scoreTracker.onUpdate((data) => {
            scoreChart.update(data);
            scoreDisplay.update(data);
        });
    }
    
    // Global reset function for button
    (window as any).resetGameData = () => {
        scoreTracker.resetAll();
    }
    
    // Show initial message
    renderer.showMessage(t('selectGameMode'));
    
    // Setup buttons
    setTimeout(setupGameButtons, 100);
    
    // Handle restart
    document.addEventListener('keydown', (e) => {
        if (e.key === ' ' && currentSession?.isOver() && !isTransitioning) {
            const mode = currentSession.mode;
            const format = currentSession.format;
            startNewGame(mode, format);
        }
    });
    
    function setupGameButtons(): void {
        document.getElementById('one-player-btn')?.addEventListener('click', (e) => {
            e.preventDefault();
            (e.target as HTMLElement).blur(); // ✅ Remove focus from button
            if (isTransitioning) return;
            startNewGame('solo', '1v1');
        });
        
        document.getElementById('two-players-btn')?.addEventListener('click', (e) => {
            e.preventDefault();
            (e.target as HTMLElement).blur(); // ✅ Remove focus from button
            if (isTransitioning) return;
            startNewGame('pvp', '1v1');
        });
        
        document.getElementById('four-players-btn')?.addEventListener('click', (e) => {
            e.preventDefault();
            (e.target as HTMLElement).blur(); // ✅ Remove focus from button
            if (isTransitioning) return;
            startNewGame('pvp', '2v2');
        });
    }
    
    async function startNewGame(mode: GameMode, format: GameFormat): Promise<void> {
        if (isTransitioning) return;
        isTransitioning = true;
        
        try {
            // Cleanup previous game
            if (currentSession) {
                inputController.detach();
                aiController.detach();
                renderer.detach();
                await currentSession.cleanup();
                currentSession = null;
            }
            
            // Reset per-game scores
            scoreTracker.resetGame();
            
            await new Promise(resolve => setTimeout(resolve, 100));
            
            // Create participants
            const participants = createParticipants(mode, format);
            
            // Create new session
            renderer.showMessage(t('creatingGame'));
            currentSession = await createGameSession(mode, format, participants);
            
            // Attach controllers
            renderer.attachToSession(currentSession);
            inputController.attachToSession(currentSession);
            
            if (mode === 'solo') {
                aiController.attachToSession(currentSession, 1);
            }
            
            // Subscribe to game state updates for score tracking
            currentSession.onStateUpdate((state: any) => {
                const leftScore = state.score?.left ?? 0;
                const rightScore = state.score?.right ?? 0;
                const ballDx = state.ball?.dx ?? 0;
                
                scoreTracker.update(leftScore, rightScore, ballDx);
            });
            
            // Setup game over handler
            currentSession.onGameOver((winner) => {
                console.log("Game over! Winner:", winner);
            });
            
            console.log(`Game started: ${mode} ${format}`);
        } catch (error) {
            console.error("Failed to start game:", error);
            renderer.showMessage(t('failedToStartGame'));
        } finally {
            isTransitioning = false;
        }
    }
    
    function createParticipants(mode: GameMode, format: GameFormat): GameParticipant[] {
        if (format === '1v1') {
            const participants: GameParticipant[] = [
                {
                    type: user.isLoggedIn() ? "registered" : "guest",
                    user_id: user.user_id ?? undefined,
                    participant_id: generateParticipantId()
                }
            ];
            
            if (mode === 'solo') {
                participants.push(
                    {
                        type: "ai",
                        user_id: undefined,
                        participant_id: generateParticipantId()
                    });
            } else {
                participants.push(
                    {
                        type: "guest",
                        user_id: undefined,
                        participant_id: generateParticipantId()
                    });
            }
            
            return participants;
        } else {
            const participants: GameParticipant[] = [
                {
                    type: user.isLoggedIn() ? "registered" : "guest",
                    user_id: user.user_id ?? undefined,
                    participant_id: generateParticipantId()
                }
            ];
            participants.push({ type: "guest", user_id: undefined,  participant_id: generateParticipantId() });
            participants.push({ type: "guest", user_id: undefined,  participant_id: generateParticipantId() });
            participants.push({ type: "guest", user_id: undefined,  participant_id: generateParticipantId() });

            return participants;
        }
    }


}