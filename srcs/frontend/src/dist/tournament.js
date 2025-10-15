import { TournamentBracketManager } from './tournament/bracket.js';
import { TournamentGameManager } from './tournament/gameTournament.js';
import { TournamentUIManager } from './tournament/ui.js';
export function initTournament() {
    let selectedPlayerCount = 0;
    let playerNames = [];
    let currentMatchIndex = 0;
    let currentRound = 0;
    let matches = [];
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
    window.tournamentMode = true;
    setTimeout(() => {
        if (window.setAIMode)
            window.setAIMode(false);
    }, 50);
    gameManager.setOnGameEndCallback(onGameEnd);
    window.tournamentValidateResult = () => {
        const winner = gameManager.getCurrentGameWinner();
        if (winner) {
            const gameState = window.gameSystem?.gameState();
            let score1 = 0;
            let score2 = 0;
            if (gameState && gameState.score) {
                score1 = gameState.score.left;
                score2 = gameState.score.right;
            }
            else {
                const currentMatch = matches[currentMatchIndex];
                score1 = winner === currentMatch.player1 ? 7 : 0;
                score2 = winner === currentMatch.player2 ? 7 : 0;
            }
            const currentMatch = matches[currentMatchIndex];
            currentMatch.winner = winner;
            currentMatch.score1 = score1;
            currentMatch.score2 = score2;
            const matchRound = bracketManager.getCurrentRound();
            bracketManager.updateMatchResult(currentMatch.player1, currentMatch.player2, winner, score1, score2, matchRound);
            uiManager.hideGameInterface();
            uiManager.hideGameControls();
            advanceToNextMatch();
        }
        else
            console.error('No winner found, cannot validate result');
    };
    window.tournamentResetScore = () => {
        if (typeof resetMatch === 'function')
            resetMatch();
    };
    function setupTournamentButtons() {
        const players4Btn = document.getElementById('players-4');
        const players8Btn = document.getElementById('players-8');
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
        const backToSelectionBtn = document.getElementById('back-to-selection');
        if (backToSelectionBtn) {
            backToSelectionBtn.addEventListener('click', (e) => {
                e.preventDefault();
                e.stopPropagation();
                uiManager.showPlayerSelection();
                selectedPlayerCount = 0;
            });
        }
        const startTournamentBtn = document.getElementById('start-tournament');
        if (startTournamentBtn) {
            startTournamentBtn.addEventListener('click', (e) => {
                e.preventDefault();
                e.stopPropagation();
                startTournament();
            });
        }
        const startMatchBtn = document.getElementById('start-match');
        if (startMatchBtn) {
            startMatchBtn.addEventListener('click', (e) => {
                e.preventDefault();
                e.stopPropagation();
                startMatch();
            });
        }
    }
    function selectPlayerCount(count) {
        selectedPlayerCount = count;
        uiManager.updatePlayerCountSelection(count);
        setTimeout(() => {
            uiManager.showPlayerNamesInterface(count);
        }, 300);
    }
    function startTournament() {
        const names = uiManager.collectPlayerNames();
        if (!names)
            return;
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
    function startMatch() {
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
    function resetMatch() {
        gameManager.resetGame();
        uiManager.hideGameControls();
        setTimeout(() => {
            startMatch();
        }, 500);
    }
    function onGameEnd(winner) {
        console.log('Tournament game ended, winner:', winner);
        uiManager.showGameControls();
        alert(`${winner} wins the match!`);
    }
    function advanceToNextMatch() {
        if (currentMatchIndex + 1 < matches.length) {
            currentMatchIndex++;
            showNextMatch();
        }
        else {
            if (bracketManager.isCurrentRoundComplete()) {
                const nextRoundMatches = bracketManager.createNextRoundMatches();
                if (nextRoundMatches.length > 0) {
                    bracketManager.setCurrentMatches(nextRoundMatches);
                    bracketManager.setCurrentRound(currentRound + 1);
                    matches = nextRoundMatches;
                    currentMatchIndex = 0;
                    currentRound++;
                    showNextMatch();
                }
                else {
                    const winner = bracketManager.getTournamentWinner();
                    if (winner) {
                        uiManager.showTournamentComplete(winner);
                        saveTournamentResult(selectedPlayerCount, winner);
                    }
                    else
                        alert('Tournament completed but there was an error determining the winner');
                }
            }
            else
                alert('Current round is not complete');
        }
    }
    function showNextMatch() {
        uiManager.showNextMatch();
        if (matches.length > currentMatchIndex)
            uiManager.showCurrentMatch(matches[currentMatchIndex].player1, matches[currentMatchIndex].player2);
    }
    if (document.readyState === 'loading')
        document.addEventListener('DOMContentLoaded', setupTournamentButtons);
    else
        setupTournamentButtons();
    window.cleanupTournament = function () {
        document.body.classList.remove('tournament-page');
        gameManager.cleanup();
    };
    async function saveTournamentResult(playersCount, winnerName) {
        if (!window.ethereum) {
            alert("MetaMask n'est pas installé !");
            return;
        }
        try {
            const provider = new ethers.BrowserProvider(window.ethereum);
            const signer = await provider.getSigner();
            const contract = new ethers.Contract(contractAdress, abi, signer);
            const nextId = await contract.getNextId();
            const tx = await contract.addTournament(nextId, playersCount, winnerName);
            await tx.wait();
            console.log(`✅ Tournoi enregistré sur le contrat avec ID ${nextId.toString()}`);
        }
        catch (err) {
            console.error("Erreur enregistrement tournoi:", err);
        }
    }
}
window.initTournament = initTournament;
//# sourceMappingURL=tournament.js.map