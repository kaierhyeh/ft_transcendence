import { TournamentMatch } from './tournament/types.js';
import { TournamentBracketManager } from './tournament/bracket.js';
import { TournamentGameManager } from './tournament/gameTournament.js';
import { TournamentUIManager } from './tournament/ui.js';
import user from './user/User.js';

export function initTournament(): void {
    let selectedPlayerCount: number = 0;
    let playerNames: string[] = [];
    let currentMatchIndex: number = 0;
    let currentRound: number = 0;
    let matches: TournamentMatch[] = [];

    const bracketManager = new TournamentBracketManager();
    const gameManager = new TournamentGameManager();
    const uiManager = new TournamentUIManager(bracketManager);

    //--- Avalanche & Remix structures ---
    // @ts-ignore
    const ethers = window.ethers;
    const contractAdress = "0xE4387dA1d5636f1b4B88ef4a9e67BE05A02777d4";
    const abi = [
        {
            "inputs": [
                { "internalType": "uint256", "name": "tournamentId", "type": "uint256" },
                { "internalType": "uint256", "name": "playersCount", "type": "uint256" },
                { "internalType": "string", "name": "winnerName", "type": "string" }
            ],
            "name": "addTournament",
            "outputs": [],
            "stateMutability": "nonpayable",
            "type": "function"
        },
        {
            "inputs": [],
            "name": "getAllTournaments",
            "outputs": [
                {
                    "components": [
                        { "internalType": "uint256", "name": "tournamentId", "type": "uint256" },
                        { "internalType": "uint256", "name": "playersCount", "type": "uint256" },
                        { "internalType": "string", "name": "winnerName", "type": "string" },
                        { "internalType": "uint256", "name": "date", "type": "uint256" }
                    ],
                    "internalType": "struct TournamentStorage.Tournament[]",
                    "name": "",
                    "type": "tuple[]"
                }
            ],
            "stateMutability": "view",
            "type": "function"
        },
        {
            "inputs": [],
            "name": "getNextId",
            "outputs": [
                { "internalType": "uint256", "name": "", "type": "uint256" }
            ],
            "stateMutability": "view",
            "type": "function"
        }
    ];

    document.body.classList.add('tournament-page');

    (window as any).tournamentMode = true;
    
    setTimeout(() => {
        if ((window as any).setAIMode)
            (window as any).setAIMode(false);
    }, 50);

    gameManager.setOnGameEndCallback(onGameEnd);

    function validateCurrentMatchAndAdvance(): void {
        const winner = gameManager.getCurrentGameWinner();

        if (winner) {
            const gameState = (window as any).gameSystem?.gameState();
            let score1 = 0;
            let score2 = 0;

            const currentScore = gameManager.getCurrentGameScore ? gameManager.getCurrentGameScore() : null;
            if (currentScore) {
                score1 = currentScore.left;
                score2 = currentScore.right;
            } else if (gameState && gameState.score) {
                score1 = gameState.score.left;
                score2 = gameState.score.right;
            } else {
                const currentMatch = matches[currentMatchIndex];
                score1 = winner === currentMatch.player1 ? 7 : 0;
                score2 = winner === currentMatch.player2 ? 7 : 0;
            }

            const currentMatch = matches[currentMatchIndex];
            currentMatch.winner = winner;
            currentMatch.score1 = score1;
            currentMatch.score2 = score2;

            const matchRound = bracketManager.getCurrentRound();

            bracketManager.updateMatchResult(
                currentMatch.player1,
                currentMatch.player2,
                winner,
                score1,
                score2,
                matchRound
            );

            uiManager.hideGameInterface();
            advanceToNextMatch();
        } else {
            console.error('No winner found, cannot validate result');
        }
    }

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
            const cur = matches[currentMatchIndex];
            const tournamentPlayer1 = document.getElementById('tournament-player1');
            const tournamentPlayer2 = document.getElementById('tournament-player2');
            if (tournamentPlayer1) tournamentPlayer1.textContent = cur.player1;
            if (tournamentPlayer2) tournamentPlayer2.textContent = cur.player2;

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

    function resetMatch(): void {
        gameManager.resetGame();
        
        setTimeout(() => {
            startMatch();
        }, 500);
    }

    function onGameEnd(winner: string): void {
        console.log('Tournament game ended, winner:', winner);
        window.alert(`${winner} wins the match!`);
        validateCurrentMatchAndAdvance();
    }

    function advanceToNextMatch(): void {
        if (currentMatchIndex + 1 < matches.length) {
            currentMatchIndex++;
            showNextMatch();
        } else {
            if (bracketManager.isCurrentRoundComplete()) {
                const nextRoundMatches = bracketManager.createNextRoundMatches();
                
                if (nextRoundMatches.length > 0) {
                    
                    bracketManager.setCurrentMatches(nextRoundMatches);
                    bracketManager.setCurrentRound(currentRound + 1);
                    
                    matches = nextRoundMatches;
                    currentMatchIndex = 0;
                    currentRound++;
                    
                    showNextMatch();
                } else {
                    const winner = bracketManager.getTournamentWinner();
                    if (winner)
                    {
                        uiManager.showTournamentComplete(winner);
                        saveTournamentResult(selectedPlayerCount, winner);
                    }
                    else
                        alert('Tournament completed but there was an error determining the winner');
                }
            } else
                alert('Current round is not complete');
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
    
    function cleanupTournament(): void {
        document.body.classList.remove('tournament-page');
        gameManager.cleanup();
    }

    (window as any).cleanupTournament = cleanupTournament;

    async function saveTournamentResult(playersCount: number, winnerName: string) {
        if (!(window as any).ethereum) {
            alert("MetaMask n'est pas installé !");
            return;
        }

        try {
            const provider = new ethers.BrowserProvider((window as any).ethereum);
            const signer = await provider.getSigner();
            const contract = new ethers.Contract(contractAdress, abi, signer);

            const nextId: bigint = await contract.getNextId();

            const tx = await contract.addTournament(nextId, playersCount, winnerName);
            await tx.wait();

            console.log(`✅ Tournoi enregistré sur le contrat avec ID ${nextId.toString()}`);
        } catch (err) {
            console.error("Erreur enregistrement tournoi:", err);
        }
    }

}

(window as any).initTournament = initTournament;