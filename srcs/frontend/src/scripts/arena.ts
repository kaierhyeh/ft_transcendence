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
import { i18n } from "./i18n/index.js";
import { checkGameAccess } from "./game/api.js";

// Module-level cleanup reference
let gameCleanup: (() => void) | null = null;

export async function initArena() {
    const arenaContainer = document.querySelector('.arena');
    if (!arenaContainer) return;
    
    // Check access and load appropriate template
    const canAccess = await checkAccess();
    
    if (canAccess) {
        await loadGameView(arenaContainer);
    } else {
        await loadErrorView(arenaContainer);
    }
}

export function cleanupArena(): void {
    if (gameCleanup) {
        gameCleanup();
        gameCleanup = null;
    }
}

async function loadGameView(container: Element): Promise<void> {
    try {
        const response = await fetch('/html/arena/game.html');
        const html = await response.text();
        container.innerHTML = html;
        
        // Translate the page
        i18n.initializePage();
        
        // Setup navigation for buttons with data-route
        const routeButtons = container.querySelectorAll('[data-route]');
        routeButtons.forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.preventDefault();
                const path = (e.currentTarget as HTMLElement).dataset.route;
                if (path && (window as any).navigateTo) {
                    (window as any).navigateTo(path);
                }
            });
        });
        
        // Initialize game after template is loaded
        initGame();
    } catch (error) {
        console.error('Failed to load game view:', error);
    }
}

async function loadErrorView(container: Element): Promise<void> {
    try {
        const response = await fetch('/html/arena/error.html');
        const html = await response.text();
        container.innerHTML = html;
        
        // Translate the page
        i18n.initializePage();
        
        // Setup navigation for back button
        const backBtn = container.querySelector('[data-route]');
        if (backBtn) {
            backBtn.addEventListener('click', (e) => {
                e.preventDefault();
                const path = (e.currentTarget as HTMLElement).dataset.route;
                if (path && (window as any).navigateTo) {
                    (window as any).navigateTo(path);
                }
            });
        }
    } catch (error) {
        console.error('Failed to load error view:', error);
    }
}

async function checkAccess(): Promise<boolean> {
    const gameId = getGameIdFromUrl();
    if (!gameId) return false;
    
    return await checkGameAccess(gameId);
}

function getGameIdFromUrl(): number | null {
    const params = new URLSearchParams(window.location.search);
    const id = params.get('game_id');
    if (!id) return null;
    const n = parseInt(id, 10);
    return isNaN(n) ? null : n;
}

function initGame(): void {
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
    
    // Show join prompt
    messenger.showJoinPrompt(() => {
        if (!isJoining) {
            joinGame();
        }
    });

    // Helper: Setup team indicator display
    function setupTeamIndicator(team: Team): void {
        const teamIndicator = document.getElementById('team-indicator');
        const teamLeftSpan = teamIndicator?.querySelector('.team-left');
        const teamRightSpan = teamIndicator?.querySelector('.team-right');
        
        if (!teamIndicator || !teamLeftSpan || !teamRightSpan) return;

        if (team === 'left') {
            // You are LEFT (green), opponent is RIGHT (white)
            teamLeftSpan.innerHTML = `<span class="my-team" data-i18n="leftIsYou">${t('leftIsYou')}</span>`;
            teamRightSpan.innerHTML = `<span class="opponent-team" data-i18n="rightIsOpponent">${t('rightIsOpponent')}<span id="opponent-name">${t('waiting')}</span></span>`;
        } else {
            // You are RIGHT (green), opponent is LEFT (white)
            teamLeftSpan.innerHTML = `<span class="opponent-team" data-i18n="leftIsOpponent">${t('leftIsOpponent')}<span id="opponent-name">${t('waiting')}</span></span>`;
            teamRightSpan.innerHTML = `<span class="my-team" data-i18n="rightIsYou">${t('rightIsYou')}</span>`;
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
            opponentNameSpan.textContent = t('opponent');
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

    // Assign to module-level cleanup reference
    gameCleanup = cleanupPong;
}