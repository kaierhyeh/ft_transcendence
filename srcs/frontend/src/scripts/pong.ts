// pong/pong.ts
import { createGameSession, GameSession } from "./game/GameSession.js";
import { GameRenderer } from "./game/GameRenderer.js";
import { GameMessenger } from "./game/GameMessenger.js";
import { InputController } from "./game/InputController.js";
import { AIController } from "./game/AIController.js";
import { ScoreTracker } from "./live_stats/ScoreTracker.js";
import { ScoreChart } from "./live_stats/ScoreChart.js";
import { ScoreDisplay } from "./live_stats/ScoreDisplay.js";
import user from "./user/User.js";
import { GameFormat, GameMode, GameParticipant } from "./game/types.js";
import { generateParticipantId } from "./game/utils.js";
import { t } from "./i18n/i18n.js";

export function initPong() {
    let currentSession: GameSession | null = null;
    let isTransitioning = false;
    
    // Core game components
    const renderer = new GameRenderer("pong");
    const messenger = new GameMessenger("game-message");
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
    messenger.show(t("selectGameMode"));
    
    // Setup buttons
    setTimeout(setupGameButtons, 100);

    const debouncedUIUpdate = debounce(() => {
        fitPongButtons();
        adjustCanvasToViewport();
    }, 120);
    window.addEventListener('resize', debouncedUIUpdate);
    setTimeout(() => {
        fitPongButtons();
        adjustCanvasToViewport();
    }, 200);
    
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

    function fitPongButtons(): void {
        const buttons = Array.from(document.querySelectorAll<HTMLButtonElement>('.pong-btn'));
        buttons.forEach((btn) => {
            btn.style.fontSize = '';

            const computed = window.getComputedStyle(btn);
            const paddingLeft = parseFloat(computed.paddingLeft || '0');
            const paddingRight = parseFloat(computed.paddingRight || '0');
            const avail = btn.clientWidth - (paddingLeft + paddingRight) - 4;
            if (avail <= 0) return;

            const span = document.createElement('span');
            span.style.whiteSpace = 'nowrap';
            span.style.visibility = 'hidden';
            span.style.position = 'absolute';
            span.style.left = '-9999px';
            span.textContent = btn.textContent || '';
            document.body.appendChild(span);

            let fontPx = parseFloat(computed.fontSize || '14');
            span.style.fontSize = fontPx + 'px';

            const minFont = 10;
            while (span.scrollWidth > avail && fontPx > minFont) {
                fontPx -= 0.5;
                span.style.fontSize = fontPx + 'px';
                if (fontPx <= minFont) break;
            }

            const baseFont = parseFloat((computed.fontSize || '14'));
            if (fontPx < baseFont) {
                btn.style.fontSize = fontPx + 'px';
            } else {
                btn.style.fontSize = '';
            }

            document.body.removeChild(span);
        });
    }

    function adjustCanvasToViewport(): void {
        const canvas = document.getElementById('pong') as HTMLCanvasElement | null;
        const wrapper = document.querySelector('.pong-game-wrapper') as HTMLElement | null;
        if (!canvas || !wrapper) return;

        const top = wrapper.getBoundingClientRect().top;
        const availableHeight = Math.max(160, window.innerHeight - top - 64);

        canvas.style.maxHeight = availableHeight + 'px';
        canvas.style.height = 'auto';
        canvas.style.width = 'auto';
    }

    function debounce(fn: () => void, ms: number) {
        let t: number | undefined;
        return () => {
            if (t) window.clearTimeout(t);
            t = window.setTimeout(fn, ms);
        };
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
            
            // Verify authentication before creating participants
            const isAuthenticated = await user.ensureAuthenticated();
            
            // Create participants
            const participants = createParticipants(mode, format, isAuthenticated);
            
            // Create new session
            messenger.showConnecting();
            currentSession = await createGameSession(mode, format, participants);
            
            // Hide connecting message when game starts
            currentSession.onGameStarted(() => {
                messenger.hide();
            });
            
            // Subscribe to game state updates for score tracking
            currentSession.onStateUpdate((state: any) => {
                const leftScore = state.score?.left ?? 0;
                const rightScore = state.score?.right ?? 0;
                const ballDx = state.ball?.dx ?? 0;
                
                scoreTracker.update(leftScore, rightScore, ballDx);
            });
            
            // Attach controllers
            renderer.attachToSession(currentSession);
            inputController.attachToSession(currentSession);
            
            // Attach controllers
            renderer.attachToSession(currentSession);
            inputController.attachToSession(currentSession);
            
            if (mode === 'solo') {
                aiController.attachToSession(currentSession, 1);
            }
            
            // Setup game over handler
            currentSession.onGameOver((winner) => {
                console.log("Game over! Winner:", winner);
            });
            
            console.log(`Game started: ${mode} ${format}`);
        } catch (error) {
            console.error("Failed to start game:", error);
            messenger.showError(t("failedToStartGame"));
        } finally {
            isTransitioning = false;
        }
    }
    
    function createParticipants(mode: GameMode, format: GameFormat, isAuthenticated: boolean): GameParticipant[] {
        if (format === '1v1') {
            const participants: GameParticipant[] = [
                {
                    type: isAuthenticated ? "registered" : "guest",
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
                    type: isAuthenticated ? "registered" : "guest",
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

    function cleanupPong(): void {
        if (currentSession) {
            inputController.detach();
            aiController.detach();
            renderer.detach();
            currentSession.cleanup();
            currentSession = null;
        }
    }

    (window as any).cleanupPong = cleanupPong;
}