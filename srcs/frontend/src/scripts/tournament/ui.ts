import { TournamentBracket } from './types.js';
import { TournamentBracketManager } from './bracket.js';
import user from '../user/User.js';

export class TournamentUIManager {
    private bracketManager: TournamentBracketManager;

    constructor(bracketManager: TournamentBracketManager) {
        this.bracketManager = bracketManager;
    }

    showPlayerNamesInterface(playerCount: number): void {
        const playerSelection = document.getElementById('player-selection');
        const playerNames = document.getElementById('player-names');
        const playerInputs = document.getElementById('player-inputs');

        if (playerSelection && playerNames && playerInputs) {
            playerSelection.style.display = 'none';
            
            playerInputs.innerHTML = '';
            for (let i = 1; i <= playerCount; i++) {
                const inputGroup = document.createElement('div');
                inputGroup.className = 'player-input-group';
                
                const label = document.createElement('label');
                label.textContent = `Player ${i}`;
                label.setAttribute('for', `player-${i}`);
                
                const input = document.createElement('input');
                input.type = 'text';
                input.id = `player-${i}`;
                input.name = `player-${i}`;
                input.placeholder = `Enter name`;
                input.maxLength = 14;
                input.required = true;
                if (i === 1 && user.isLoggedIn() && user.alias)
                    input.value = user.alias;
                
                input.addEventListener('keypress', (e) => {
                    if (e.key === 'Enter') {
                        e.preventDefault();
                        const nextInput = document.getElementById(`player-${i + 1}`) as HTMLInputElement;
                        if (nextInput)
                            nextInput.focus();
                    }
                });

                inputGroup.appendChild(label);
                inputGroup.appendChild(input);
                playerInputs.appendChild(inputGroup);
            }
            
            playerNames.style.display = 'block';
            
            const firstInput = document.getElementById('player-1') as HTMLInputElement;
            if (firstInput)
                firstInput.focus();
        }
    }

    showPlayerSelection(): void {
        const playerSelection = document.getElementById('player-selection');
        const playerNames = document.getElementById('player-names');

        if (playerSelection && playerNames) {
            playerNames.style.display = 'none';
            playerSelection.style.display = 'block';
            
            const allButtons = document.querySelectorAll('.player-count-buttons .tournament-btn');
            allButtons.forEach(btn => btn.classList.remove('active'));
        }
    }

    updatePlayerCountSelection(count: number): void {
        const allButtons = document.querySelectorAll('.player-count-buttons .tournament-btn');
        allButtons.forEach(btn => btn.classList.remove('active'));
        
        const selectedBtn = document.getElementById(`players-${count}`);
        if (selectedBtn)
            selectedBtn.classList.add('active');
    }

    collectPlayerNames(): string[] | null {
        const inputs = document.querySelectorAll('#player-inputs input') as NodeListOf<HTMLInputElement>;
        const names: string[] = [];
        let hasEmptyName = false;

        inputs.forEach((input, index) => {
            const name = input.value.trim();
            if (name === '') {
                hasEmptyName = true;
                input.style.borderColor = '#ef4444';
                input.focus();
            } else {
                input.style.borderColor = '#666';
                names.push(name);
            }
        });

        if (hasEmptyName) {
            alert('Please fill in all player names before starting the tournament.');
            return null;
        }

        const uniqueNames = new Set(names);
        if (uniqueNames.size !== names.length) {
            alert('Please ensure all player names are unique.');
            return null;
        }

        return names;
    }

    displayBracket(bracketData: TournamentBracket): void {
        const bracketContainer = document.getElementById('bracket-container');
        if (!bracketContainer) return;

        bracketContainer.innerHTML = '';
        bracketContainer.classList.add('jquery-bracket');
        this.bracketManager.initializeJQueryBracket('bracket-container');
        
    }

    showCurrentMatch(player1: string, player2: string): void {
        // Update both the small "next match" display and the in-game header
        const player1Name = document.getElementById('player1-name');
        const player2Name = document.getElementById('player2-name');
        const tournamentPlayer1 = document.getElementById('tournament-player1');
        const tournamentPlayer2 = document.getElementById('tournament-player2');

        if (player1Name) player1Name.textContent = player1;
        if (player2Name) player2Name.textContent = player2;
        if (tournamentPlayer1) tournamentPlayer1.textContent = player1;
        if (tournamentPlayer2) tournamentPlayer2.textContent = player2;

        const currentMatch = document.getElementById('current-match');
        const tournamentGame = document.getElementById('tournament-game');
        const bracketDiv = document.getElementById('tournament-bracket');
        
        if (currentMatch) currentMatch.style.display = 'block';
        if (tournamentGame) tournamentGame.style.display = 'none';
        if (bracketDiv) bracketDiv.style.display = 'block';
    }

    showTournamentSetup(): void {
        const playerNamesDiv = document.getElementById('player-names');
        if (playerNamesDiv) playerNamesDiv.style.display = 'none';
        
        const bracketDiv = document.getElementById('tournament-bracket');
        if (bracketDiv) bracketDiv.style.display = 'block';
    }

    showGameInterface(): void {
        const bracketDiv = document.getElementById('tournament-bracket');
        const currentMatch = document.getElementById('current-match');
        const tournamentGame = document.getElementById('tournament-game');
        const gameWrapper = document.querySelector('.pong-game-wrapper') as HTMLElement;
        const gameHeader = document.querySelector('.game-header') as HTMLElement;
        
        if (bracketDiv) bracketDiv.style.display = 'none';
        if (currentMatch) currentMatch.style.display = 'none';
        if (tournamentGame) tournamentGame.style.display = 'block';
        if (gameWrapper) gameWrapper.style.display = 'block';
        if (gameHeader) gameHeader.style.display = 'flex';
    }

    hideGameInterface(): void {
        const tournamentGame = document.getElementById('tournament-game');
        const gameWrapper = document.querySelector('.pong-game-wrapper') as HTMLElement;
        const gameHeader = document.querySelector('.game-header') as HTMLElement;
        if (tournamentGame) tournamentGame.style.display = 'none';
        if (gameWrapper) gameWrapper.style.display = 'none';
        if (gameHeader) gameHeader.style.display = 'none';
    }


    showNextMatch(): void {
        const bracketDiv = document.getElementById('tournament-bracket');
        const currentMatch = document.getElementById('current-match');
        const tournamentGame = document.getElementById('tournament-game');
        
        if (bracketDiv) bracketDiv.style.display = 'block';
        if (currentMatch) currentMatch.style.display = 'block';
        if (tournamentGame) tournamentGame.style.display = 'none';
    }

    showTournamentComplete(winner: string): void {
        const bracketDiv = document.getElementById('tournament-bracket');
        const currentMatch = document.getElementById('current-match');
        const tournamentGame = document.getElementById('tournament-game');
        const tournamentComplete = document.getElementById('tournament-complete');
        
        if (bracketDiv) bracketDiv.style.display = 'block';
        if (currentMatch) currentMatch.style.display = 'none';
        if (tournamentGame) tournamentGame.style.display = 'none';
        if (tournamentComplete) tournamentComplete.style.display = 'block';
        
        const championName = document.getElementById('champion-name');
        if (championName)
            championName.textContent = winner;
        this.setupTournamentEndButtons();
    }

    private setupTournamentEndButtons(): void {
        const goHomeBtn = document.getElementById('go-home') as HTMLButtonElement;
        const seeHistory = document.getElementById('see-history') as HTMLButtonElement;
        const newTournamentBtn = document.getElementById('new-tournament') as HTMLButtonElement;
        
        if (goHomeBtn) {
            goHomeBtn.addEventListener('click', (e) => {
                e.preventDefault();
                e.stopPropagation();
                this.goToHomePage();
            });
        }

        if (seeHistory) {
            seeHistory.addEventListener('click', (e) => {
                e.preventDefault();
                e.stopPropagation();
                this.seeHistory();
            })
        }
        
        if (newTournamentBtn) {
            newTournamentBtn.addEventListener('click', (e) => {
                e.preventDefault();
                e.stopPropagation();
                this.startNewTournament();
            });
        }
    }

    private goToHomePage(): void {
        if ((window as any).navigate)
            (window as any).navigate('/');
        else
            window.location.href = '/';
    }

    private seeHistory(): void {
        if ((window as any).navigate)
            (window as any).navigate('/history');
        else
            window.location.href = '/history';
    }

    private startNewTournament(): void {
        window.location.reload();
    }

    prepareCanvas(): HTMLCanvasElement | null {
        const canvas = document.getElementById("tournament-pong") as HTMLCanvasElement || 
                      document.getElementById("pong") as HTMLCanvasElement;
        if (canvas) {
            canvas.id = 'tournament-pong';
            
            const ctx = canvas.getContext('2d');
            if (ctx)
                ctx.clearRect(0, 0, canvas.width, canvas.height);
            return canvas;
        } else {
            console.error('Tournament canvas not found!');
            return null;
        }
    }
}