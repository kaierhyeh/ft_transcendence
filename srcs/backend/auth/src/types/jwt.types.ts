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
  sub: string;  // User ID as string (JWT standard)
  token_type?: 'access' | 'refresh';  // Optional: distinguish between access and refresh tokens
}

// Game Session JWT payload
export interface GameSessionPayload extends JWTPayload {
  type: JWTType.GAME_SESSION;
  sub: string;
  game_id: number;
}

// Internal Access JWT payload for service-to-service communication
export interface InternalAccessPayload extends JWTPayload {
  type: JWTType.INTERNAL_ACCESS;
}

export interface JWTHeader {
  alg: string;
  typ: string;
  kid: string;
}