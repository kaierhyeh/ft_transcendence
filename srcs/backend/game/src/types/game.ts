export type Team = "left" | "right";

export type PlayerSlot = 
    | "left"
    | "right"
    | "top-left"
    | "bottom-left"
    | "top-right"
    | "bottom-right";

export interface GameConf {
    canvas_width: number;
    canvas_height: number;
    paddle_width: number;
    paddle_height: number;
    win_point: number;
    ball_size: number;
}

export interface GameMessage {
    type: string;
    data: object;
}