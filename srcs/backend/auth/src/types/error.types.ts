export enum AuthErrorCode {
  INVALID_TOKEN = 'INVALID_TOKEN',
  TOKEN_EXPIRED = 'TOKEN_EXPIRED',
  TOKEN_MALFORMED = 'TOKEN_MALFORMED',
  INSUFFICIENT_PERMISSIONS = 'INSUFFICIENT_PERMISSIONS',
  USER_NOT_FOUND = 'USER_NOT_FOUND',
  INVALID_CREDENTIALS = 'INVALID_CREDENTIALS',
  ACCOUNT_LOCKED = 'ACCOUNT_LOCKED',
  SESSION_EXPIRED = 'SESSION_EXPIRED',
  KEY_ROTATION_FAILED = 'KEY_ROTATION_FAILED',
  JWKS_UPDATE_FAILED = 'JWKS_UPDATE_FAILED'
}

export class AuthError extends Error {
  constructor(
    public code: AuthErrorCode,
    message: string,
    public statusCode: number = 401,
    public details?: any
  ) {
    super(message);
    this.name = 'AuthError';
  }
}

export enum PresenceErrorCode {
  USER_NOT_ONLINE = 'USER_NOT_ONLINE',
  PRESENCE_UPDATE_FAILED = 'PRESENCE_UPDATE_FAILED',
  WEBSOCKET_CONNECTION_FAILED = 'WEBSOCKET_CONNECTION_FAILED',
  REDIS_CONNECTION_FAILED = 'REDIS_CONNECTION_FAILED'
}

export class PresenceError extends Error {
  constructor(
    public code: PresenceErrorCode,
    message: string,
    public statusCode: number = 400,
    public details?: any
  ) {
    super(message);
    this.name = 'PresenceError';
  }
}

export enum KeyRotationErrorCode {
  KEY_GENERATION_FAILED = 'KEY_GENERATION_FAILED',
  KEY_STORAGE_FAILED = 'KEY_STORAGE_FAILED',
  KEY_CLEANUP_FAILED = 'KEY_CLEANUP_FAILED',
  INVALID_KEY_ID = 'INVALID_KEY_ID'
}

export class KeyRotationError extends Error {
  constructor(
    public code: KeyRotationErrorCode,
    message: string,
    public statusCode: number = 500,
    public details?: any
  ) {
    super(message);
    this.name = 'KeyRotationError';
  }
}