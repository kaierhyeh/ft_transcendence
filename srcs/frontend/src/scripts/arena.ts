import { createGameSession, GameSession } from "./game/GameSession.js";
import { GameRenderer } from "./game/GameRenderer.js";
import { InputController } from "./game/InputController.js";
import { ScoreTracker } from "./live_stats/ScoreTracker.js";
import { ScoreChart } from "./live_stats/ScoreChart.js";
import { ScoreDisplay } from "./live_stats/ScoreDisplay.js";
import user from "./user/User.js";
import { GameParticipant, Team } from "./game/types.js";
import { t } from "./i18n/i18n.js";

let myTeam: Team | null;

export function initArena() {
    let currentSession: GameSession | null = null;
    let isJoining = false;
    
    // Core game components
    const renderer = new GameRenderer("pong");
    const inputController = new InputController();
    
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
    // TODO - add translation
    renderer.showMessage("Join the game");
    
    // Setup buttons
    setTimeout(setupGameButtons, 100);
    
    function setupGameButtons(): void {
        document.getElementById('join-btn')?.addEventListener('click', (e) => {
            e.preventDefault();
            (e.target as HTMLElement).blur(); // ✅ Remove focus from button
            if (isJoining) return;
            joinGame();
        });
    }

    function getGameIdFromUrl(): number | null {
		const params = new URLSearchParams(window.location.search);
		const id = params.get('game_id');
		if (!id) return null;
		const n = parseInt(id, 10);
		return isNaN(n) ? null : n;
	}
    
    async function joinGame(): Promise<void> {
        if (isJoining) return;
        isJoining = true;
        
        try {
            // Cleanup previous game
            if (currentSession) {
                inputController.detach();
                renderer.detach();
                await currentSession.cleanup();
                currentSession = null;
            }
            
            // Reset per-game scores
            scoreTracker.resetGame();
            
            await new Promise(resolve => setTimeout(resolve, 100));

            // Retrieve game id
            const gameId = getGameIdFromUrl();
            if (!gameId) throw new Error("No game_id in URL");
            
            // Verify authentication before creating participant
            const isAuthenticated = await user.ensureAuthenticated();
            const user_id = user.user_id ?? undefined;
            if (!isAuthenticated || !user_id)
                throw new Error("User not authenticated");
            // Create participants
            const participants: GameParticipant[] = [
                {
                    type: "registered",
                    user_id,
                    participant_id: user_id.toString()  
                },
            ];
            
            // Create new session
            renderer.showMessage(t("creatingGame"));
            currentSession = await createGameSession("pvp", "1v1", participants, true, gameId);
            
            // Attach controllers
            renderer.attachToSession(currentSession);
            inputController.attachToSession(currentSession);
            
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
            
            console.log(`Game started: pvp 1v1 online`);
        } catch (error) {
            console.error("Failed to start game:", error);
            renderer.showMessage(t("failedToStartGame"));
        } finally {
            isJoining = false;
        }
    }

    function cleanupPong(): void {
        if (currentSession) {
            inputController.detach();
            renderer.detach();
            currentSession.cleanup();
            currentSession = null;
        }
    }

    (window as any).cleanupPong = cleanupPong;
}