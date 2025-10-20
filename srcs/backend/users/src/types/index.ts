export interface Result {
    success: boolean;
    status: number;
    msg: string;
}

export interface TwoFa {
    enabled: 0 | 1;
    secret: string | null;
}