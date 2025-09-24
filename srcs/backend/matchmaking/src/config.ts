export const CONFIG = {
  
  JWT: {
    PUBLIC_KEY_PATH: process.env.JWT_PUBLIC_KEY_PATH || "/run/secrets/jwt_public_key",
    ALGORITHM: process.env.JWT_ALGORITHM || "RS256" as const,
    ISSUER: process.env.JWT_ISSUER || "ft_transcendence",
    AUDIENCE: process.env.JWT_AUDIENCE || "ft_transcendence_users",
  },


  AUTH_LITE_SERVICE: {
    BASE_URL: process.env.USER_SERVICE_URL || "http://backend-auth-lite:3000"
  },
  
  GAME_SERVICE: {
    BASE_URL: process.env.USER_SERVICE_URL || "http://backend-game:3000"
  },

  // Server settings
  SERVER: {
    PORT: parseInt(process.env.PORT || "3000"),
    HOST: process.env.HOST || "0.0.0.0",
  }
} as const;