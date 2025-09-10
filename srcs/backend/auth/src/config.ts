export const CONFIG = {
  
  // Database settings
  DB: {
    PATH: process.env.DB_PATH || "/app/data/users.db",
    ENABLE_WAL: true,
  },

  AUTH_SERVICE: {
    BASE_URL: process.env.AUTH_SERVICE_URL || "http://backend-auth:3000"
  },
  
  // Server settings
  SERVER: {
    PORT: parseInt(process.env.PORT || "3000"),
    HOST: process.env.HOST || "0.0.0.0",
  }
} as const;