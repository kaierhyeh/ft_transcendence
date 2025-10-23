export interface Result {
    success: boolean;
    status: number;
    msg: string;
}

export interface PresenceMessage {
    type: string;
    data?: object;
}

export interface CheckinMessage extends PresenceMessage {
    type: "checkin";
    data: {
        accessToken: string;
    }
}