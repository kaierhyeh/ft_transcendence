export function initHistory(): void {
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

    function formatDateUS(timestamp: bigint | number): string {
        const ts = typeof timestamp === "bigint" ? Number(timestamp) : timestamp;
        const date = new Date(ts * 1000);
        return date.toLocaleDateString("en-US", {
            month: "2-digit",
            day: "2-digit",
            year: "numeric"
        });
    }

    function renderTournaments(tournaments: Array<{ tournamentId: string | number, playersCount: string | number, winnerName: string, date: bigint | number }>) {
        const list = document.getElementById('list-container');
        if (!list) return;
        if (!tournaments || tournaments.length === 0) {
            list.innerHTML = "<div class='tournament-empty'>Aucun tournoi trouvé.</div>";
            return;
        }
        list.innerHTML = tournaments.map((t) => `
            <div class="tournament-item">
                <div class="tournament-id">Tournament #${t.tournamentId}</div>
                <div class="tournament-date">${formatDateUS(t.date)}</div>
                <div class="tournament-players">${t.playersCount}p.</div>
                <div class="tournament-winner">Winner: <span class="winner-name">${t.winnerName}</span></div>
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
