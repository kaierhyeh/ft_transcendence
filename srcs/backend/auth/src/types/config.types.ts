export interface DatabaseConfig {
  PATH: string;
  ENABLE_WAL: boolean;
}

export interface ServerConfig {
  PORT: number;
  HOST: string;
}

export interface JWTConfig {
  PRIVATE_KEY: string;
  PUBLIC_KEY: string;
  ALGORITHM: string;
  ACCESS_TOKEN_EXPIRY: string;
  REFRESH_TOKEN_EXPIRY: string;
  TEMP_SECRET: string;
}

export interface KeyRotationConfig {
  ROTATION_INTERVAL_DAYS: number;
  KEY_RETENTION_DAYS: number;
  MAX_ACTIVE_KEYS: number;
  AUTO_ROTATION_ENABLED: boolean;
}

export interface PresenceConfig {
  SESSION_TIMEOUT_SECONDS: number;
  HEARTBEAT_INTERVAL_SECONDS: number;
  CLEANUP_INTERVAL_SECONDS: number;
}

export interface SecurityConfig {
  CORS_ORIGINS: string[];
  RATE_LIMIT_WINDOW_MS: number;
  RATE_LIMIT_MAX_REQUESTS: number;
  ENABLE_2FA: boolean;
}

export interface RedisConfig {
  HOST: string;
  PORT: number;
  PASSWORD?: string;
  DB: number;
}

export interface AppConfig {
  DATABASE: DatabaseConfig;
  SERVER: ServerConfig;
  JWT: JWTConfig;
  KEY_ROTATION: KeyRotationConfig;
  PRESENCE: PresenceConfig;
  SECURITY: SecurityConfig;
  REDIS: RedisConfig;
}