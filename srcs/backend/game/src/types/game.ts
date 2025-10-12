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

export interface PlayerDisconnectedMessage {
    type: "player_disconnected";
    data: {
        participant_id: string;
        slot: PlayerSlot;
        team: Team;
        reason: string;
    };
}

export interface GameEndedMessage {
    type: "game_ended";
    data: {
        reason: "player_disconnected" | "game_over";
        disconnected_player?: {
            slot: PlayerSlot;
            team: Team;
        };
    };
}