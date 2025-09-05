export const CONFIG = {
  // Game settings
  GAME: {
    TICK_PERIOD: 1000 / 60, // <=> 60 FPS
    SESSION_TIMEOUT: 5000, // 5s
    MAX_SESSIONS: 100,
  },
  
  // Database settings
  DB: {
    PATH: process.env.DB_PATH || "/app/sessions/sessions.db",
    ENABLE_WAL: true,
  },
  
  // Server settings
  SERVER: {
    PORT: parseInt(process.env.PORT || "3000"),
    HOST: process.env.HOST || "0.0.0.0",
  }
} as const;