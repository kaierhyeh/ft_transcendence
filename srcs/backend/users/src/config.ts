export const CONFIG = {
  
  // Database settings
  DB: {
    PATH: process.env.DB_PATH || "/app/data/users.db",
    ENABLE_WAL: true,
  },

  // Server settings
  SERVER: {
    PORT: parseInt(process.env.PORT || "3000"),
    HOST: process.env.HOST || "0.0.0.0",
  }
} as const;