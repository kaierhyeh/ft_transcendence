// user/types.ts
export type GameMode = "solo" | "pvp" | "tournament";
export type GameFormat = "1v1" | "2v2";
export type Team = "left" | "right";
export type PlayerType = "registered" | "guest" | "ai";
export type PlayerSlot = "left" | "right" | "top-left" | "bottom-left" | "top-right" | "bottom-right";

export interface PlayerData {
    user_id: number | null;
    username: string;
    type: PlayerType;
    team: Team;
    slot: PlayerSlot;
    score: number;
    winner: number; // 0 or 1 (boolean as int)
}

export interface GameSession {
    format: GameFormat;
    mode: GameMode;
    tournament_id: number | null;
    online: number; // 0 or 1 (boolean as int)
    forfeit: number; // 0 or 1 (boolean as int)
    created_at: string;
    started_at: string;
    ended_at: string;
    players: PlayerData[];
}

export interface Pagination {
    total_records: number;
    current_page: number;
    total_pages: number;
    next_page: number | null;
    prev_page: number | null;
}

export interface MatchHistoryResponse {
    data: GameSession[];
    pagination: Pagination;
}