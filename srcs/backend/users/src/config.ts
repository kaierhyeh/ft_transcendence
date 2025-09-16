export const CONFIG = {
  
  // Database settings
  DB: {
    PATH: process.env.DB_PATH || "/app/data/users.db",
    ENABLE_WAL: true,
  },

  JWT: {
    PUBLIC_KEY_PATH: process.env.JWT_PUBLIC_KEY_PATH || "/run/secrets/jwt_public_key",
    ALGORITHM: process.env.JWT_ALGORITHM || "RS256" as const,
    ISSUER: process.env.JWT_ISSUER || "ft_transcendence",
    AUDIENCE: process.env.JWT_AUDIENCE || "ft_transcendence_users",
  },

  // Server settings
  SERVER: {
    PORT: parseInt(process.env.PORT || "3000"),
    HOST: process.env.HOST || "0.0.0.0",
  }
} as const;