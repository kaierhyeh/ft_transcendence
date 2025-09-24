export const CONFIG = {
  
  // Database settings
  DB: {
    PATH: process.env.DB_PATH || "/app/data/db/users.db",
    ENABLE_WAL: true,
  },

  AVATAR: {
    BASE_URL: process.env.AVATAR_BASE_URL || "/app/data/avatar",
    MAX_SIZE: 2 * 1024 * 1024, // 2MB
    ALLOWED_TYPES: ['image/jpeg', 'image/png', 'image/gif', 'image/webp']
  },

  JWT: {
    PUBLIC_KEY_PATH: process.env.JWT_PUBLIC_KEY_PATH || "/run/secrets/jwt_public_key",
    ALGORITHM: process.env.JWT_ALGORITHM || "RS256" as const,
    ISSUER: process.env.JWT_ISSUER || "ft_transcendence",
    AUDIENCE: process.env.JWT_AUDIENCE || "ft_transcendence_users",
  },


  AUTH_LITE_SERVICE: {
    BASE_URL: process.env.USER_SERVICE_URL || "http://backend-auth-lite:3000"
  },
  
  STATS_SERVICE: {
    BASE_URL: process.env.USER_SERVICE_URL || "http://backend-stats:3000"
  },

  API: {
    BASE_URL: process.env.API_URL || "https://localhost:4443/api"
  },

  // Server settings
  SERVER: {
    PORT: parseInt(process.env.PORT || "3000"),
    HOST: process.env.HOST || "0.0.0.0",
  }
} as const;