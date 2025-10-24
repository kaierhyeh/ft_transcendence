export interface Message {
    type: string;
    data?: object;
}

export interface CheckinMessage extends Message {
    type: "checkin";
    data: {
        accessToken: string;
    }
}