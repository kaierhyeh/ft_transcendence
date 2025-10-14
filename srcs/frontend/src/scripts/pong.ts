// pong.ts
import { createGameSession, GameSession } from "./game/GameSession.js";
import { GameRenderer } from "./game/GameRenderer.js";
import { InputController } from "./game/InputController.js";
import { AIController } from "./game/AIController.js";
import user from "./user/User.js";
import { GameFormat, GameMode, GameParticipant } from "./game/types.js";

export function initPong() {
    let currentSession: GameSession | null = null;
    let isTransitioning = false;
    
    const renderer = new GameRenderer("pong");
    const inputController = new InputController();
    const aiController = new AIController();
    
    // Show initial message
    renderer.showMessage("Select a game mode");
    
    // Setup buttons
    setTimeout(setupGameButtons, 100);
    
    // Handle restart
    inputController.onKey(" ", () => {
        if (currentSession?.isOver() && !isTransitioning) {
            const mode = currentSession.mode;
            const format = currentSession.format;
            startNewGame(mode, format);
        }
    });
    
    function setupGameButtons(): void {
        document.getElementById('one-player-btn')?.addEventListener('click', (e) => {
            e.preventDefault();
            if (isTransitioning) return;
            startNewGame('solo', '1v1');
        });
        
        document.getElementById('two-players-btn')?.addEventListener('click', (e) => {
            e.preventDefault();
            if (isTransitioning) return;
            startNewGame('pvp', '1v1');
        });
        
        document.getElementById('four-players-btn')?.addEventListener('click', (e) => {
            e.preventDefault();
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
            
            // Small delay for cleanup
            await new Promise(resolve => setTimeout(resolve, 100));
            
            // Create participants
            const participants = createParticipants(mode, format);
            
            // Create new session
            renderer.showMessage("Creating game...");
            currentSession = await createGameSession(mode, format, participants);
            
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
            renderer.showMessage("Failed to start game");
        } finally {
            isTransitioning = false;
        }
    }
    
    function createParticipants(mode: GameMode, format: GameFormat): GameParticipant[] {
        if (format === '1v1') {
            const participants: GameParticipant[] = [
                {
                    type: user.isLoggedIn() ? "registered" : "guest",
                    user_id: user.user_id ?? undefined
                }
            ];
            
            if (mode === 'solo') {
                participants.push({ type: "ai", user_id: undefined });
            } else {
                participants.push({ type: "guest", user_id: undefined });
            }
            
            return participants;
        } else {
            return Array(4).fill({ type: "guest", user_id: undefined });
        }
    }
}