import { PlayerType } from "./schemas/auth";

// JWT Types for three-tier system
export enum JWTType {
  USER_SESSION = 'USER_SESSION',
  GAME_SESSION = 'GAME_SESSION', 
  INTERNAL_ACCESS = 'INTERNAL_ACCESS'
}

// Base JWT payload interface
export interface JWTPayload {
  type: JWTType;
  iat?: number;
  exp?: number;
  iss?: string;
  aud?: string;
  userId?: number; // Optional userId for backward compatibility
  gameId?: string; // Optional gameId
  serviceId?: string; // Optional serviceId
  permissions?: string[]; // Optional permissions
}

// User Session JWT payload
export interface UserSessionPayload extends JWTPayload {
  type: JWTType.USER_SESSION;
  userId: number;
  username: string;
  roles?: string[];
}

// Game Session JWT payload
export interface GameSessionPayload extends JWTPayload {
  type: JWTType.GAME_SESSION;
  player_id: number;
  game_id: number;
  player_type: PlayerType;
  tournament_id: number;
}

// Internal Access JWT payload for service-to-service communication
export interface InternalAccessPayload extends JWTPayload {
  type: JWTType.INTERNAL_ACCESS;
  serviceId: string;
  serviceName: string;
  permissions: string[];
  accessLevel: 'read' | 'write' | 'admin';
}

// JWT Header interface
export interface JWTHeader {
  alg: string;
  typ: string;
  kid?: string;
}