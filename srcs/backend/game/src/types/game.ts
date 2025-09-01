export type Team = "left" | "right";

export type PlayerSlot = 
    | "left"
    | "right"
    | "top-left"
    | "bottom-left"
    | "top-right"
    | "bottom-right";

export type GameType =
    | "pvp"
    | "multi"
    | "tournament";

export interface Ball {
    x: number;
    y: number;
    dx: number;
    dy: number;
}
    
export interface PlayerState {
    player_id: number;
    team: Team;
    paddle_coord: number;
    session_id: string;
    ready: boolean;
}
export type PublicPlayerState = Omit<PlayerState, 'session_id' | 'ready'>;

export type PlayerMap = Map<PlayerSlot, PlayerState>;
export type SerializedPlayerMap = Partial<Record<PlayerSlot, PublicPlayerState>>;

export interface GameState {
    type: GameType;
    last_time: number | undefined;
    players: PlayerMap;
    ball: Ball | undefined;
    score: Record<Team, number>;
    ongoing: boolean;
}
export interface PublicGameState
    extends Omit<GameState, "type" | "last_time" | "players"> {
    players: SerializedPlayerMap;
}

export interface GameConf {
    canvas_width: number;
    canvas_height: number;
    paddle_width: number;
    paddle_height: number;
    win_point: number;
    ball_size: number;
}

export interface GameParticipant {
    player_id: number;
    session_id: string;
}