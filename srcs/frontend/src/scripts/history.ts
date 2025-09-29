export function initHistory(): void {
    //--- Avalanche & Remix structures ---
    // @ts-ignore
    const ethers = window.ethers;
    const contractAdress = "0x2f7A46E679c88A7478544e16ee0bb66A51cb9e62";
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
                        { "internalType": "string", "name": "winnerName", "type": "string" }
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
            "outputs": [{ "internalType": "uint256", "name": "", "type": "uint256" }],
            "stateMutability": "view",
            "type": "function"
        }
    ];

    async function fetchTournaments() {
        if (!(window as any).ethereum) {
            displayError("MetaMask n'est pas installé !");
            return [];
        }
        try {
            const provider = new ethers.BrowserProvider((window as any).ethereum);
            const contract = new ethers.Contract(contractAdress, abi, provider);
            const tournaments = await contract.getAllTournaments();
            return tournaments;
        } catch (err) {
            displayError("Erreur lors de la récupération des tournois : " + err);
            return [];
        }
    }

    function displayError(msg: string) {
        const list = document.getElementById('list-container');
        if (list) {
            list.innerHTML = `<div class='tournament-error'>${msg}</div>`;
        }
    }

    function renderTournaments(tournaments: Array<{ tournamentId: string | number, playersCount: string | number, winnerName: string }>) {
        const list = document.getElementById('list-container');
        if (!list) return;
        if (!tournaments || tournaments.length === 0) {
            list.innerHTML = "<div class='tournament-empty'>Aucun tournoi trouvé.</div>";
            return;
        }
        list.innerHTML = tournaments.map((t: { tournamentId: string | number, playersCount: string | number, winnerName: string }) => `
            <div class="tournament-item">
                <div class="tournament-id">Tournoi #${t.tournamentId}</div>
                <div class="tournament-players">Joueurs : ${t.playersCount}</div>
                <div class="tournament-winner">Vainqueur : <span class="winner-name">${t.winnerName}</span></div>
            </div>
        `).join('');
    }

    async function loadTournaments() {
        const tournaments = await fetchTournaments();
        renderTournaments(tournaments);
    }

    if (document.readyState === 'loading')
        document.addEventListener('DOMContentLoaded', loadTournaments);
    else
        loadTournaments();
}
