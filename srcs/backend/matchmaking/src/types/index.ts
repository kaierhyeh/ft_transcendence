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
