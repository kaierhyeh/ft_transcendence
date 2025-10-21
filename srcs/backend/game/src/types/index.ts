export interface Result {
    success: boolean;
    status: number;
    msg: string;
}

// JWT Types useful for game service
export enum JWTType {
  GAME_SESSION = 'GAME_SESSION', 
  INTERNAL_ACCESS = 'INTERNAL_ACCESS'
}

// Base JWT payload interface (matching auth service)
export interface BaseJWTPayload {
  type: JWTType;
  sub?: string;
  iat?: number;
  exp?: number;
  iss?: string;
  aud?: string;
  userId?: number;
}

// Game Session JWT payload (matching auth service exactly)
export interface GameSessionPayload extends BaseJWTPayload {
  type: JWTType.GAME_SESSION;
  sub: string;
  game_id: number;
}

// Simple Internal JWT payload - just type verification
export interface InternalJWTPayload extends BaseJWTPayload {
  type: JWTType.INTERNAL_ACCESS;
}

// Union type for all JWT payloads (can be extended as needed)
export type JWTPayload = GameSessionPayload | InternalJWTPayload | BaseJWTPayload;

export * from './game';