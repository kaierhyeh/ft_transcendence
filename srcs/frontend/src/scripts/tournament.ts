import { TournamentMatch } from './tournament/types.js';
import { TournamentBracketManager } from './tournament/bracket.js';
import { TournamentGameManager } from './tournament/game.js';
import { TournamentUIManager } from './tournament/ui.js';

export function initTournament(): void {
    let selectedPlayerCount: number = 0;
    let playerNames: string[] = [];
    let currentMatchIndex: number = 0;
    let currentRound: number = 0;
    let matches: TournamentMatch[] = [];

    const bracketManager = new TournamentBracketManager();
    const gameManager = new TournamentGameManager();
    const uiManager = new TournamentUIManager(bracketManager);

    document.body.classList.add('tournament-page');

    (window as any).tournamentMode = true;
    
    setTimeout(() => {
        if ((window as any).setAIMode)
            (window as any).setAIMode(false);
    }, 50);

    gameManager.setOnGameEndCallback(onGameEnd);

    function setupTournamentButtons(): void {
        const players4Btn = document.getElementById('players-4') as HTMLButtonElement;
        const players8Btn = document.getElementById('players-8') as HTMLButtonElement;

        if (players4Btn) {
            players4Btn.addEventListener('click', (e) => {
                e.preventDefault();
                e.stopPropagation();
                selectPlayerCount(4);
            });
        }

        if (players8Btn) {
            players8Btn.addEventListener('click', (e) => {
                e.preventDefault();
                e.stopPropagation();
                selectPlayerCount(8);
            });
        }

        const backToSelectionBtn = document.getElementById('back-to-selection') as HTMLButtonElement;
        if (backToSelectionBtn) {
            backToSelectionBtn.addEventListener('click', (e) => {
                e.preventDefault();
                e.stopPropagation();
                uiManager.showPlayerSelection();
                selectedPlayerCount = 0;
            });
        }

        const startTournamentBtn = document.getElementById('start-tournament') as HTMLButtonElement;
        if (startTournamentBtn) {
            startTournamentBtn.addEventListener('click', (e) => {
                e.preventDefault();
                e.stopPropagation();
                startTournament();
            });
        }

        const startMatchBtn = document.getElementById('start-match') as HTMLButtonElement;
        if (startMatchBtn) {
            startMatchBtn.addEventListener('click', (e) => {
                e.preventDefault();
                e.stopPropagation();
                startMatch();
            });
        }

        const validateResultBtn = document.getElementById('validate-result') as HTMLButtonElement;
        if (validateResultBtn) {
            validateResultBtn.addEventListener('click', (e) => {
                e.preventDefault();
                e.stopPropagation();
                validateResult();
            });
        }

        const resetScoreBtn = document.getElementById('reset-score') as HTMLButtonElement;
        if (resetScoreBtn) {
            resetScoreBtn.addEventListener('click', (e) => {
                e.preventDefault();
                e.stopPropagation();
                resetMatch();
            });
        }
    }

    function selectPlayerCount(count: number): void {
        selectedPlayerCount = count;
        uiManager.updatePlayerCountSelection(count);

        setTimeout(() => {
            uiManager.showPlayerNamesInterface(count);
        }, 300);
    }

    function startTournament(): void {
        const names = uiManager.collectPlayerNames();
        if (!names) return;

        playerNames = names;
        console.log(`Starting tournament with ${selectedPlayerCount} players:`, playerNames);
        
        const tournamentData = bracketManager.createTournamentBracket(playerNames);
        matches = tournamentData.matches;
        
        uiManager.showTournamentSetup();
        uiManager.displayBracket(tournamentData);
        
        currentMatchIndex = 0;
        currentRound = 0;
        if (matches.length > 0)
            uiManager.showCurrentMatch(matches[0].player1, matches[0].player2);
    }

    function startMatch(): void {
        if (currentMatchIndex < matches.length) {
            uiManager.showGameInterface();
            
            const canvas = uiManager.prepareCanvas();
            if (canvas) {
                gameManager.initTournamentGame(canvas, matches[currentMatchIndex])
                    .catch(error => {
                        console.error('Failed to start tournament game:', error);
                        alert('Failed to start tournament game. Please try again.');
                    });
            }
        }
    }

    function validateResult(): void {
        const winner = gameManager.getCurrentGameWinner();
        if (winner) {
            bracketManager.updateTournamentTree(`r${currentRound}-m${currentMatchIndex}`, winner);
            
            uiManager.hideGameInterface();
            uiManager.hideGameControls();
            uiManager.refreshBracketDisplay();
            
            advanceToNextMatch();
        }
    }

    function resetMatch(): void {
        gameManager.resetGame();
        uiManager.hideGameControls();
        
        setTimeout(() => {
            startMatch();
        }, 500);
    }

    function onGameEnd(winner: string): void {
        console.log('Tournament game ended, winner:', winner);
        uiManager.showGameControls();
        alert(`${winner} wins the match!`);
    }

    function advanceToNextMatch(): void {
        if (currentMatchIndex + 1 < matches.length) {
            currentMatchIndex++;
            showNextMatch();
        } else {
            if (!bracketManager.isLastRound(currentRound)) {
                currentRound++;
                currentMatchIndex = 0;
                
                const nextRoundMatches = bracketManager.getNextRoundMatches(currentRound - 1);
                matches = nextRoundMatches;
                
                if (matches.length > 0)
                    showNextMatch();
            } else {
                const winner = gameManager.getCurrentGameWinner();
                if (winner)
                    uiManager.showTournamentComplete(winner);
            }
        }
    }

    function showNextMatch(): void {
        uiManager.showNextMatch();
        
        if (matches.length > currentMatchIndex)
            uiManager.showCurrentMatch(matches[currentMatchIndex].player1, matches[currentMatchIndex].player2);
    }

    if (document.readyState === 'loading')
        document.addEventListener('DOMContentLoaded', setupTournamentButtons);
    else
        setupTournamentButtons();
    
    (window as any).cleanupTournament = function() {
        document.body.classList.remove('tournament-page');
        gameManager.cleanup();
    };
}

(window as any).initTournament = initTournament;