export interface Result {
    success: boolean;
    status: number;
    msg: string;
}

export interface JwtPayload {
  sub: number;           // user ID
  iat: number;           // issued at
  exp: number;           // expiration
}

export interface TwoFa {
    two_fa_enabled: 0 | 1;
    two_fa_secret: string | null;
}