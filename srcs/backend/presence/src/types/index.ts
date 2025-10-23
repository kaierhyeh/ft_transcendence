export interface ErrorData {
    code: string;
    status?: number;
    message?: string;
}

export type Result<T, E = string> = 
    | { success: true, value: T }
    | { success: false, error: E };

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