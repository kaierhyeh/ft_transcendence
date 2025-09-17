import { TournamentMatch, BracketMatch, TournamentTree, TournamentBracket } from './types.js';

export class TournamentBracketManager {
    private tournamentTree: TournamentTree | null = null;

    shuffleArray<T>(array: T[]): T[] {
        const shuffled = [...array];
        for (let i = shuffled.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
        }
        return shuffled;
    }

    createTournamentBracket(players: string[]): TournamentBracket {
        const shuffledPlayers = this.shuffleArray(players);
        
        const tree = this.createTournamentTree(shuffledPlayers);
        this.tournamentTree = tree;
        
        const firstRoundMatches: TournamentMatch[] = [];
        for (let i = 0; i < shuffledPlayers.length; i += 2) {
            firstRoundMatches.push({
                player1: shuffledPlayers[i],
                player2: shuffledPlayers[i + 1],
                winner: null,
                score1: 0,
                score2: 0
            });
        }

        return { tree, matches: firstRoundMatches };
    }

    createTournamentTree(players: string[]): TournamentTree {
        const rounds = Math.log2(players.length);
        const tree: TournamentTree = {
            rounds: [],
            totalRounds: rounds
        };

        const firstRound: BracketMatch[] = [];
        for (let i = 0; i < players.length; i += 2) {
            firstRound.push({
                id: `r0-m${i/2}`,
                player1: players[i],
                player2: players[i + 1],
                winner: null,
                status: 'pending'
            });
        }
        tree.rounds.push(firstRound);

        let previousMatches = firstRound.length;
        for (let round = 1; round < rounds; round++) {
            const currentRound: BracketMatch[] = [];
            for (let match = 0; match < previousMatches / 2; match++) {
                currentRound.push({
                    id: `r${round}-m${match}`,
                    player1: null,
                    player2: null,
                    winner: null,
                    status: 'waiting'
                });
            }
            tree.rounds.push(currentRound);
            previousMatches = currentRound.length;
        }

        return tree;
    }

    updateTournamentTree(matchId: string, winner: string): void {
        if (!this.tournamentTree) return;

        for (let roundIndex = 0; roundIndex < this.tournamentTree.rounds.length; roundIndex++) {
            const round = this.tournamentTree.rounds[roundIndex];
            const match = round.find((m: BracketMatch) => m.id === matchId);
            if (match) {
                match.winner = winner;
                match.status = 'completed';

                if (roundIndex < this.tournamentTree.rounds.length - 1) {
                    const nextRound = this.tournamentTree.rounds[roundIndex + 1];
                    const nextMatchIndex = Math.floor(round.indexOf(match) / 2);
                    const nextMatch = nextRound[nextMatchIndex];
                    
                    if (!nextMatch.player1)
                        nextMatch.player1 = winner;
                    else {
                        nextMatch.player2 = winner;
                        nextMatch.status = 'pending';
                    }
                }
                break;
            }
        }
    }

    getTournamentTree(): TournamentTree | null {
        return this.tournamentTree;
    }

    getRoundName(roundIndex: number, totalRounds: number): string {
        const roundsFromEnd = totalRounds - roundIndex;
        switch (roundsFromEnd) {
            case 1: return 'Final';
            case 2: return 'Semi-Final';
            case 3: return 'Quarter-Final';
            default: return `Round ${roundIndex + 1}`;
        }
    }

    getNextRoundMatches(currentRound: number): TournamentMatch[] {
        if (!this.tournamentTree || currentRound + 1 >= this.tournamentTree.totalRounds)
            return [];

        const nextRoundMatches: TournamentMatch[] = [];
        const nextRound = this.tournamentTree.rounds[currentRound + 1];
        
        for (const match of nextRound) {
            if (match.player1 && match.player2) {
                nextRoundMatches.push({
                    player1: match.player1,
                    player2: match.player2,
                    winner: null,
                    score1: 0,
                    score2: 0
                });
            }
        }
        
        return nextRoundMatches;
    }

    isLastRound(currentRound: number): boolean {
        return this.tournamentTree ? currentRound + 1 >= this.tournamentTree.totalRounds : true;
    }
}