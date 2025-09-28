export interface Result {
    success: boolean;
    status: number;
    msg: string;
}

// JWT Types for three-tier system
export enum JWTType {
  USER_SESSION = 'USER_SESSION',
  GAME_SESSION = 'GAME_SESSION', 
  INTERNAL_ACCESS = 'INTERNAL_ACCESS'
}

// Base JWT payload interface
export interface JWTPayload {
  type: JWTType;
  sub?: string;
  iat?: number;
  exp?: number;
  iss?: string;
}

// User Session JWT payload
export interface UserSessionPayload extends JWTPayload {
  type: JWTType.USER_SESSION;
  sub: string;
}

// Internal Access JWT payload for service-to-service communication
export interface InternalAccessPayload extends JWTPayload {
  type: JWTType.INTERNAL_ACCESS;
}


export interface TwoFa {
    enabled: 0 | 1;
    secret: string | null;
}