export class TournamentBracketManager {
    constructor() {
        this.currentMatches = [];
        this.allMatches = [];
        this.currentRound = 0;
        this.tournamentTree = null;
        this.bracketData = null;
        this.players = [];
        this.currentContainerId = null;
    }
    createTournamentBracket(players) {
        this.players = [...players];
        const shuffledPlayers = this.shuffleArray(players);
        const firstRoundMatches = this.createFirstRoundMatches(shuffledPlayers);
        this.currentMatches = firstRoundMatches;
        this.allMatches = [...firstRoundMatches];
        this.currentRound = 0;
        this.tournamentTree = this.createSimpleTournamentTree(shuffledPlayers);
        this.createJQueryBracketData(shuffledPlayers);
        return {
            tree: this.tournamentTree,
            matches: firstRoundMatches
        };
    }
    createFirstRoundMatches(players) {
        const matches = [];
        for (let i = 0; i < players.length; i += 2) {
            if (i + 1 < players.length) {
                matches.push({
                    player1: players[i],
                    player2: players[i + 1],
                    winner: null,
                    score1: 0,
                    score2: 0
                });
            }
        }
        return matches;
    }
    createJQueryBracketData(players) {
        const teams = [];
        for (let i = 0; i < players.length; i += 2) {
            if (i + 1 < players.length) {
                teams.push([players[i], players[i + 1]]);
            }
        }
        const totalRounds = Math.ceil(Math.log2(players.length));
        const results = [];
        for (let round = 0; round < totalRounds; round++) {
            const roundResults = [];
            const matchesInRound = Math.ceil(teams.length / Math.pow(2, round));
            for (let match = 0; match < matchesInRound; match++) {
                roundResults.push(null);
            }
            results.push(roundResults);
        }
        this.bracketData = {
            teams: teams,
            results: [results]
        };
        return this.bracketData;
    }
    initializeBracket(containerId) {
        this.currentContainerId = containerId;
        if (!this.bracketData) {
            if (this.players.length > 0)
                this.createJQueryBracketData(this.players);
            else {
                console.error('No players available to create bracket data');
                return;
            }
        }
        const container = $(`#${containerId}`);
        if (container.length === 0) {
            console.error(`Container #${containerId} not found`);
            return;
        }
        container.empty();
        const bracketConfig = {
            init: this.bracketData,
            skipConsolationRound: true,
            teamWidth: 120,
            scoreWidth: 30,
            matchMargin: 20,
            roundMargin: 40
        };
        container.bracket(bracketConfig);
    }
    updateMatchResult(player1, player2, winner, score1, score2, matchRound) {
        const match = this.findCurrentMatch(player1, player2);
        if (match) {
            match.winner = winner;
            match.score1 = score1;
            match.score2 = score2;
        }
        const roundToUse = matchRound !== undefined ? matchRound : this.currentRound;
        this.updateScoresInDOM(player1, player2, score1, score2, winner, roundToUse);
        this.updateBracketDataResults(player1, player2, score1, score2, roundToUse);
        this.advanceWinnerToNextRound(winner, roundToUse);
    }
    updateScoresInDOM(player1, player2, score1, score2, winner, matchRound) {
        if (!this.currentContainerId)
            return;
        const container = $(`#${this.currentContainerId}`);
        const rounds = container.find('.round');
        if (rounds.length > matchRound) {
            const targetRoundElement = $(rounds[matchRound]);
            const teams = targetRoundElement.find('.team');
            teams.each((index, teamElement) => {
                const $team = $(teamElement);
                const labelElement = $team.find('.label');
                const scoreElement = $team.find('.score');
                if (labelElement.length > 0 && scoreElement.length > 0) {
                    const teamName = labelElement.text().trim();
                    if (scoreElement.attr('data-final-score') === 'true')
                        return;
                    if (teamName === player1)
                        this.updateTeamScore($team, labelElement, scoreElement, score1, winner === player1);
                    else if (teamName === player2)
                        this.updateTeamScore($team, labelElement, scoreElement, score2, winner === player2);
                }
            });
        }
    }
    updateTeamScore($team, labelElement, scoreElement, score, isWinner) {
        scoreElement.text(score.toString());
        $team.attr('data-match-completed', 'true');
        scoreElement.attr('data-final-score', 'true');
        $team.removeClass('winner loser');
        if (isWinner)
            $team.addClass('winner');
        else
            $team.addClass('loser');
        labelElement.addClass('advanced-winner');
    }
    updateBracketDataResults(player1, player2, score1, score2, matchRound) {
        if (!this.bracketData)
            return;
        const teamIndex = this.bracketData.teams.findIndex(team => (team[0] === player1 && team[1] === player2) ||
            (team[0] === player2 && team[1] === player1));
        if (teamIndex !== -1 && this.bracketData.results[0][matchRound])
            this.bracketData.results[0][matchRound][teamIndex] = [score1, score2];
    }
    advanceWinnerToNextRound(winner, matchRound) {
        if (!this.currentContainerId)
            return;
        setTimeout(() => {
            this.replaceNextTBDWithWinner(winner, matchRound);
        }, 150);
    }
    replaceNextTBDWithWinner(winner, matchRound) {
        if (!this.currentContainerId)
            return;
        const container = $(`#${this.currentContainerId}`);
        const rounds = container.find('.round');
        const targetRoundIndex = matchRound + 1;
        if (targetRoundIndex >= rounds.length) {
            if (matchRound === rounds.length - 1)
                this.highlightTournamentChampion(winner, rounds);
            return;
        }
        const targetRound = $(rounds[targetRoundIndex]);
        const existingWinner = targetRound.find('.team .label').filter(function () {
            return $(this).text().trim() === winner;
        });
        if (existingWinner.length > 0)
            return;
        const tbdElements = targetRound.find('.team .label').filter(function () {
            const text = $(this).text().trim();
            return text === 'TBD';
        });
        if (tbdElements.length > 0) {
            const firstTbd = $(tbdElements[0]);
            firstTbd.text(winner);
            const teamElement = firstTbd.closest('.team');
            firstTbd.addClass('replaced-tbd');
        }
    }
    highlightTournamentChampion(winner, rounds) {
        const finalRound = $(rounds[rounds.length - 1]);
        const finalTeams = finalRound.find('.team .label');
        finalTeams.each((_, element) => {
            const $label = $(element);
            if ($label.text().trim() === winner)
                $label.closest('.team').addClass('tournament-champion');
        });
    }
    shuffleArray(array) {
        const shuffled = [...array];
        for (let i = shuffled.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
        }
        return shuffled;
    }
    findCurrentMatch(player1, player2) {
        return this.currentMatches.find(match => (match.player1 === player1 && match.player2 === player2) ||
            (match.player1 === player2 && match.player2 === player1)) || null;
    }
    setCurrentRound(round) {
        this.currentRound = round;
    }
    getCurrentRound() {
        return this.currentRound;
    }
    getCurrentMatches() {
        return this.currentMatches;
    }
    setCurrentMatches(matches) {
        this.currentMatches = matches;
        this.allMatches.push(...matches);
    }
    getAllMatches() {
        return this.allMatches;
    }
    createNextRoundMatches() {
        const winners = this.currentMatches
            .filter(match => match.winner)
            .map(match => match.winner);
        if (winners.length <= 1)
            return [];
        const nextRoundMatches = [];
        for (let i = 0; i < winners.length; i += 2) {
            if (i + 1 < winners.length) {
                nextRoundMatches.push({
                    player1: winners[i],
                    player2: winners[i + 1],
                    winner: null,
                    score1: 0,
                    score2: 0
                });
            }
        }
        return nextRoundMatches;
    }
    isRoundComplete() {
        return this.currentMatches.every(match => match.winner !== null);
    }
    isCurrentRoundComplete() {
        return this.isRoundComplete();
    }
    getTournamentWinner() {
        if (this.currentMatches.length === 1 && this.currentMatches[0].winner)
            return this.currentMatches[0].winner;
        return null;
    }
    getTournamentTree() {
        return this.tournamentTree;
    }
    createSimpleTournamentTree(players) {
        const rounds = [];
        let currentPlayerCount = players.length;
        let roundIndex = 0;
        while (currentPlayerCount > 1) {
            const round = [];
            const matchesInRound = currentPlayerCount / 2;
            for (let i = 0; i < matchesInRound; i++) {
                round.push({
                    id: `round-${roundIndex}-match-${i}`,
                    player1: roundIndex === 0 ? players[i * 2] : null,
                    player2: roundIndex === 0 ? players[i * 2 + 1] : null,
                    winner: null,
                    status: 'pending'
                });
            }
            rounds.push(round);
            currentPlayerCount = matchesInRound;
            roundIndex++;
        }
        return {
            rounds: rounds,
            totalRounds: rounds.length
        };
    }
    getDebugInfo() {
        return {
            currentRound: this.currentRound,
            currentMatches: this.currentMatches,
            totalRounds: this.tournamentTree?.totalRounds || 0,
            playersCount: this.players.length,
            bracketData: this.bracketData
        };
    }
    initializeJQueryBracket(containerId) {
        this.initializeBracket(containerId);
    }
}
//# sourceMappingURL=bracket.js.map