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

export interface GameParticipant {
    user_id: number;
    participant_id: string;
    is_ai: boolean;
}

export interface GameConfig {
    canvas_width: number;
    canvas_height: number;
    paddle_height: number;
    paddle_width: number;
    win_point: number;
    ball_size: number;
}

export interface GameState {
    winner?: 'left' | 'right';
    [key: string]: any;
}

export interface TournamentKeyHandlers {
    keyDownHandler: (e: KeyboardEvent) => void;
    keyUpHandler: (e: KeyboardEvent) => void;
}

export interface GameSystem {
    cleanup?: () => void;
    setGameConfig?: (config: GameConfig) => void;
    setGameStarted?: (started: boolean) => void;
    setGameState?: (state: GameState) => void;
    draw?: () => void;
}

export interface WebSocketMessage {
    type: string;
    data?: any;
    participant_id?: string;
    move?: string;
}