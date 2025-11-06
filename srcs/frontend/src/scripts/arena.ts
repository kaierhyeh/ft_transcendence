import { createGameSession, GameSession, PlayerAssignment, GameEndedInfo } from "./game/GameSession.js";
import { GameRenderer } from "./game/GameRenderer.js";
import { GameMessenger } from "./game/GameMessenger.js";
import { InputController } from "./game/InputController.js";
import { ScoreTracker } from "./live_stats/ScoreTracker.js";
import { ScoreChart } from "./live_stats/ScoreChart.js";
import { ScoreDisplay } from "./live_stats/ScoreDisplay.js";
import user from "./user/User.js";
import { GameParticipant, Team } from "./game/types.js";
import { t } from "./i18n/i18n.js";

export function initArena() {
    let currentSession: GameSession | null = null;
    let isJoining = false;
    let myTeam: Team | null = null;
    
    // Core game components
    const renderer = new GameRenderer("pong", false); // Disable restart hint for arena
    const messenger = new GameMessenger("game-message");
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
    
    // Show initial clickable join prompt
    messenger.showJoinPrompt(() => {
        if (!isJoining) {
            joinGame();
        }
    });
    

    function getGameIdFromUrl(): number | null {
        const params = new URLSearchParams(window.location.search);
        const id = params.get('game_id');
        if (!id) return null;
        const n = parseInt(id, 10);
        return isNaN(n) ? null : n;
    }

    // Helper: Setup team indicator display
    function setupTeamIndicator(team: Team): void {
        const teamIndicator = document.getElementById('team-indicator');
        const teamLeftSpan = teamIndicator?.querySelector('.team-left');
        const teamRightSpan = teamIndicator?.querySelector('.team-right');
        
        if (!teamIndicator || !teamLeftSpan || !teamRightSpan) return;

        if (team === 'left') {
            // You are LEFT (green), opponent is RIGHT (white)
            teamLeftSpan.innerHTML = `<span class="my-team">Left: You</span>`;
            teamRightSpan.innerHTML = `<span class="opponent-team">Right: <span id="opponent-name">Waiting...</span></span>`;
        } else {
            // You are RIGHT (green), opponent is LEFT (white)
            teamLeftSpan.innerHTML = `<span class="opponent-team">Left: <span id="opponent-name">Waiting...</span></span>`;
            teamRightSpan.innerHTML = `<span class="my-team">Right: You</span>`;
        }
        
        teamIndicator.style.display = 'block';
    }

    // Helper: Handle player assignment
    function handlePlayerAssignment(assignment: PlayerAssignment): void {
        myTeam = assignment.team;
        console.log(`Assigned to team: ${myTeam}, slot: ${assignment.slot}, username: ${assignment.username}`);
        setupTeamIndicator(myTeam);
    }

    // Helper: Handle game started
    function handleGameStarted(): void {
        console.log("Game started - both players connected");
        messenger.hide();
        
        // Update opponent name if available
        const opponentNameSpan = document.getElementById('opponent-name');
        if (opponentNameSpan) {
            opponentNameSpan.textContent = 'Opponent';
        }
    }

    // Helper: Handle game ended (disconnection)
    function handleGameEnded(info: GameEndedInfo): void {
        if (info.reason === "player_disconnected") {
            const opponentTeam = myTeam === 'left' ? 'right' : 'left';
            if (info.disconnected_player?.team === opponentTeam) {
                messenger.showOpponentDisconnected();
            } else {
                messenger.showConnectionLost();
            }
        }
    }

    // Helper: Handle game over
    function handleGameOver(winner: Team, playerTeam: Team | null): void {
        console.log("Game over! Winner:", winner);
        messenger.showGameOver(playerTeam === winner);
    }

    // Helper: Attach all game session handlers
    function attachGameHandlers(session: GameSession): void {
        session.onPlayerAssigned(handlePlayerAssignment);
        session.onGameStarted(handleGameStarted);
        session.onGameEnded(handleGameEnded);
        session.onGameOver(handleGameOver);
        
        // Subscribe to game state updates for score tracking
        session.onStateUpdate((state: any) => {
            const leftScore = state.score?.left ?? 0;
            const rightScore = state.score?.right ?? 0;
            const ballDx = state.ball?.dx ?? 0;
            scoreTracker.update(leftScore, rightScore, ballDx);
        });
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
            
            // Verify authentication
            const isAuthenticated = await user.ensureAuthenticated();
            const user_id = user.user_id ?? undefined;
            if (!isAuthenticated || !user_id) {
                throw new Error("User not authenticated");
            }
            
            // Create participant
            const participants: GameParticipant[] = [{
                type: "registered",
                user_id,
                participant_id: user_id.toString()  
            }];
            
            // Show waiting message
            messenger.showWaiting();
            
            // Create new session
            currentSession = await createGameSession("pvp", "1v1", participants, true, gameId);
            
            // Attach all handlers
            attachGameHandlers(currentSession);
            
            // Attach controllers
            renderer.attachToSession(currentSession);
            inputController.attachToSession(currentSession);
            
            console.log(`Game started: pvp 1v1 online`);
        } catch (error) {
            console.error("Failed to start game:", error);
            messenger.showError(t("failedToStartGame"));
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