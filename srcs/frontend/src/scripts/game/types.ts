interface Paddle {
    x: number;
    y: number;
}

interface Player {
    paddle: Paddle;
}

interface Score {
    left: number;
    right: number;
}

export interface GameConfig {
    canvas_width: number;
    canvas_height: number;
    paddle_width: number;
    paddle_height: number;
    ball_size: number;
}

// interface InputMessage {
//     type: "input";
//     participant_id: string;
//     move: "up" | "down" | "stop" | "";
// }

// interface JoinMessage {
//     type: "join";
//     participant_id: string;
// }

// interface ServerMessage {
//     level: "info" | "warning" | "error";
//     message: string;
// }

// interface ServerResponseMessage {
//     type: "server_message";
//     level: "info" | "warning" | "error";
//     message: string;
// }

export interface Ball {
    x: number;
    y: number;
    dx: number;
    dy: number;
}

interface Players {
    left: Player;
    right: Player;
}

interface Players2v2 {
    "top-left"?: Player;
    "bottom-left"?: Player;
    "top-right"?: Player;
    "bottom-right"?: Player;
}

export interface GameState {
    players: Players;
    ball: Ball;
    score: Score;
    winner?: Team;
}

export interface GameState2v2 {
    players: Players2v2;
    ball: Ball;
    score: Score;
    winner?: Team;
}


export type GameMode = 'solo' | 'pvp' | 'tournament';
export type GameFormat = '1v1' | '2v2';
export type Team = 'left' | 'right';
export type PlayerSlot = 'left' | 'right' | 'top-left' | 'bottom-left' | 'top-right' | 'bottom-right';
export type PlayerType = "registered" | "guest" | "ai";

export interface GameParticipant {
    type: PlayerType;
    user_id?: number;
    participant_id: string;
}
