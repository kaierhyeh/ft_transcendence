export const CONFIG = {
  // Game settings
  GAME: {
    TICK_PERIOD: 1000 / 30, // <=> 30 FPS
    SESSION_TIMEOUT: 5000, // 5s
    MAX_SESSIONS: 100,
  },
  
  // Database settings
  DB: {
    PATH: process.env.DB_PATH || "/app/data/sessions.db",
    ENABLE_WAL: true,
  },

  JWT: {
    ISSUER: process.env.JWT_ISSUER || "ft_transcendence",
  },

  // Auth service settings
  AUTH_SERVICE: {
    URL: process.env.AUTH_SERVICE_URL || "http://backend-auth:3000",
  },

  
  // Server settings
  SERVER: {
    PORT: parseInt(process.env.PORT || "3000"),
    HOST: process.env.HOST || "0.0.0.0",
  }
} as const;