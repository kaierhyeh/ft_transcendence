export const CONFIG = {
  
  JWT: {
    PRIVATE_KEY_PATH: process.env.JWT_PRIVATE_KEY_PATH || "/run/secrets/jwt_private_key",
    PUBLIC_KEY_PATH: process.env.JWT_PUBLIC_KEY_PATH || "/run/secrets/jwt_public_key",
    GAME_PRIVATE_KEY_PATH: process.env.GAME_PRIVATE_KEY_PATH || "/run/secrets/game_private_key",
    GAME_PUBLIC_KEY_PATH: process.env.GAME_PUBLIC_KEY_PATH || "/run/secrets/game_public_key",
    ALGORITHM: process.env.JWT_ALGORITHM || "RS256",
    EXPIRES_IN: "15m",
    ISSUER: process.env.JWT_ISSUER || "ft_transcendence",
    AUDIENCE: process.env.JWT_AUDIENCE || "ft_transcendence_users",
  },

  USER_SERVICE: {
    BASE_URL: process.env.USER_SERVICE_URL || "http://backend-users:3000"
  },
  
  // Server settings
  SERVER: {
    PORT: parseInt(process.env.PORT || "3000"),
    HOST: process.env.HOST || "0.0.0.0",
  }
} as const;