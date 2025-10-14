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

interface GameConfig {
    canvas_width: number;
    canvas_height: number;
    paddle_width: number;
    paddle_height: number;
    ball_size: number;
}

interface InputMessage {
    type: "input";
    participant_id: string;
    move: "up" | "down" | "stop" | "";
}

interface JoinMessage {
    type: "join";
    participant_id: string;
}

interface ServerMessage {
    level: "info" | "warning" | "error";
    message: string;
}

interface ServerResponseMessage {
    type: "server_message";
    level: "info" | "warning" | "error";
    message: string;
}

interface Ball {
    x: number;
    y: number;
    dx: number;
    dy: number;
}

interface Players {
    left: Player;
    right: Player;
}

interface Players4p {
    "top-left"?: Player;
    "bottom-left"?: Player;
    "top-right"?: Player;
    "bottom-right"?: Player;
}

interface GameState {
    players: Players;
    ball: Ball;
    score: Score;
    winner?: number;
}

interface GameState4p {
    players: Players4p;
    ball: Ball;
    score: Score;
    winner?: string;
}

interface GameStateMessage {
    type: "game_state";
    data: GameState;
}

interface GameStateMessage4p {
    type: "game_state";
    data: GameState4p;
}

interface Participant {
    user_id: number;
    participant_id: string;
    is_ai: boolean;
}

interface Participant4p {
    user_id: number;
    participant_id: string;
}

interface CreateGameResponse {
    game_id: number;
}

interface CreateGameRequest {
    type: "1v1";
    participants: Participant[];
}

interface CreateGameRequest4p {
    type: "2v2";
    participants: Participant4p[];
}

type GameMode = 'solo' | 'pvp' | 'tournament';
type GameFormat = '1v1' | '2v2';
type PlayerType = "registered" | "guest" | "ai";
interface GameParticipant {
    type: PlayerType;
    user_id?: number;
}
type Team = 'left' | 'right';