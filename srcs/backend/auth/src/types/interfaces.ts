import { JWTType } from './jwt.types';

export interface UserPresence {
  userId: string;
  status: 'online' | 'away' | 'in_game' | 'offline';
  lastSeen: Date;
  socketId?: string;
  gameId?: string;
  metadata?: Record<string, any>;
}

export interface KeyInfo {
  kid: string;
  publicKey: string;
  privateKey: string;
  createdAt: Date;
  expiresAt?: Date;
  isActive: boolean;
  algorithm: string;
}

export interface JWKSKey {
  kty: string;
  use: string;
  kid: string;
  alg: string;
  n: string;
  e: string;
}

export interface JWKS {
  keys: JWKSKey[];
}

export interface AuthResponse {
  success: boolean;
  message?: string;
  data?: any;
  error?: string;
}

export interface TokenPair {
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
  tokenType: string;
}

export interface APIResponse<T = any> {
  success: boolean;
  data?: T;
  message?: string;
  error?: string;
  timestamp: string;
}