const API_AUTH_ENDPOINT = `${window.location.origin}/api/auth`;
const API_TWOFA_ENDPOINT = `${window.location.origin}/api/auth/2fa`;

import game from "./game/Game.js"
import user from "./user/User.js";


export function initPong() {
    let isTransitioning: boolean = false;
    let gameMode: GameMode;
    let gameFormat: GameFormat;
    const keys: { [key: string]: boolean } = {};


    // --- Event Listeners ---
    const handleKeyDown = (e: KeyboardEvent) => {
        keys[e.key] = true;
        if (e.key === " " && gameEnded && !isTransitioning) {
            e.preventDefault();
            restartGame();
        }
    };

    const handleKeyUp = (e: KeyboardEvent) => {
        keys[e.key] = false;
    };

    document.addEventListener("keydown", handleKeyDown);
    document.addEventListener("keyup", handleKeyUp);

     // --- UI Setup ---
    setTimeout(setupGameButtons, 100);

    function setupGameButtons(): void {
        const onePlayerBtn = document.getElementById('one-player-btn') as HTMLButtonElement;
        const twoPlayersBtn = document.getElementById('two-players-btn') as HTMLButtonElement;
        const fourPlayersBtn = document.getElementById('four-players-btn') as HTMLButtonElement;
        
        if (onePlayerBtn) {
            onePlayerBtn.addEventListener('click', (e) => {
                e.preventDefault();
                e.stopPropagation();
                if (isTransitioning) return;
                updateButtonStates('one');

                gameMode = 'solo';
                gameFormat = '1v1';
                console.log("Starting new solo game");

                initGame();
            });
        }
        if (twoPlayersBtn) {
            twoPlayersBtn.addEventListener('click', (e) => {
                e.preventDefault();
                e.stopPropagation();
                if (isTransitioning) return;
                updateButtonStates('two');

                gameMode = 'pvp';
                gameFormat = '1v1';
                console.log("Starting new pvp game");

                initGame();
            });
        }
        if (fourPlayersBtn) {
            fourPlayersBtn.addEventListener('click', (e) => {
                e.preventDefault();
                e.stopPropagation();
                if (isTransitioning) return;
                updateButtonStates('four');

                gameMode = 'pvp';
                gameFormat = '2v2';
                console.log("Starting new 4-player game");

                initGame();
            });
        }
    }

    function updateButtonStates(activeButton: 'one' | 'two' | 'four'): void {
        const onePlayerBtn = document.getElementById('one-player-btn') as HTMLButtonElement;
        const twoPlayersBtn = document.getElementById('two-players-btn') as HTMLButtonElement;
        const fourPlayersBtn = document.getElementById('four-players-btn') as HTMLButtonElement;

        [onePlayerBtn, twoPlayersBtn, fourPlayersBtn].forEach(btn => {
            if (btn) btn.classList.remove('active');
        });

        switch (activeButton) {
            case 'one':
                if (onePlayerBtn) onePlayerBtn.classList.add('active');
                break;
            case 'two':
                if (twoPlayersBtn) twoPlayersBtn.classList.add('active');
                break;
            case 'four':
                if (fourPlayersBtn) fourPlayersBtn.classList.add('active');
                break;
        }
    }


    async function initGame(): Promise<void> {
        if (isTransitioning) {
            console.log("Already transitioning, ignoring request");
            return;
        }
        
        isTransitioning = true;
        game.cleanup();
        await new Promise(resolve => setTimeout(resolve, 100));
        
        const participants = createParticipantsArray();
        await game.setup(gameMode, gameFormat, participants);
        await game.run();
        
        isTransitioning = false;
    }


     function createParticipantsArray(): GameParticipant[] {
    
        if (gameFormat === '1v1') {
            const participants: GameParticipant[] = [];
            
            participants.push({
                    type: user.isLoggedIn() ? "registered" : "guest",        // Player 1 is always registered or guest user
                    user_id: user.user_id?? undefined    // Use actual user ID if logged in
                }
            );
            
            // Player 2 is either AI or another guest
            if (gameMode === 'solo') {
                participants.push({
                    type: "ai",
                    user_id: undefined
                });
            } else {
                participants.push({
                    type: "guest",
                    user_id: undefined
                });
            }
            
            return participants;
        } else {
            // 4-player mode - all guest users for now
            return [
                { type: "guest", user_id: undefined },
                { type: "guest", user_id: undefined },
                { type: "guest", user_id: undefined },
                { type: "guest", user_id: undefined }
            ];
        }
    }


    async function restartGame(): Promise<void> {
        if (!gameEnded || isTransitioning) {
            console.log("Cannot restart - gameEnded:", gameEnded, "isTransitioning:", isTransitioning);
            return;
        }
        
        console.log("Restarting with format:", gameFormat, "AI:", isAI);
        await initGame();
    }

}