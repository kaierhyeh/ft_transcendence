export interface TournamentMatch {
    player1: string;
    player2: string;
    winner: string | null;
    score1: number;
    score2: number;
}

export interface BracketMatch {
    id: string;
    player1: string | null;
    player2: string | null;
    winner: string | null;
    status: 'pending' | 'waiting' | 'completed';
}

export interface TournamentRound {
    matches: BracketMatch[];
}

export interface TournamentTree {
    rounds: BracketMatch[][];
    totalRounds: number;
}

export interface TournamentBracket {
    tree: TournamentTree;
    matches: TournamentMatch[];
}

// Re-export game types for convenience
export type { GameParticipant, GameConfig, GameState, GameState2v2 } from '../game/types.js';