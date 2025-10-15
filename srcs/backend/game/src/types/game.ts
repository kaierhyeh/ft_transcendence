export type Team = "left" | "right";

export type PlayerSlot = 
    | "left"
    | "right"
    | "top-left"
    | "bottom-left"
    | "top-right"
    | "bottom-right";

export interface GameMessage {
    type: string;
    data: object;
}

export type PlayerType = "registered" | "guest" | "ai";