import { PlayerType } from './game';

export interface Result {
    success: boolean;
    status: number;
    msg: string;
}

// Base JWT payload interface (matching auth service)
export interface BaseJWTPayload {
  type: JWTType;
  iat?: number;
  exp?: number;
  iss?: string;
  aud?: string;
  userId?: number;
}

// Game Session JWT payload (matching auth service exactly)
export interface GameSessionPayload extends BaseJWTPayload {
  type: JWTType.GAME_SESSION;
  player_id: number;
  game_id: number;
  player_type: PlayerType;
  tournament_id: number;
}

// Simple Internal JWT payload - just type verification
export interface InternalJWTPayload extends BaseJWTPayload {
  type: JWTType.INTERNAL_ACCESS;
}

// JWT Types for three-tier system (matches auth service)
export enum JWTType {
  USER_SESSION = 'USER_SESSION',
  GAME_SESSION = 'GAME_SESSION', 
  INTERNAL_ACCESS = 'INTERNAL_ACCESS'
}

// Union type for all JWT payloads (can be extended as needed)
export type JWTPayload = GameSessionPayload | InternalJWTPayload | BaseJWTPayload;

// export interface JWTHeader {
//   alg: string;
//   typ: string;
//   kid: string;
// }

export * from './game';