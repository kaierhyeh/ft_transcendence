export const CONFIG = {
  
  JWT: {
    PRIVATE_KEY_PATH: process.env.JWT_PRIVATE_KEY_PATH || "/run/secrets/jwt_private_key",
    PUBLIC_KEY_PATH: process.env.JWT_PUBLIC_KEY_PATH || "/run/secrets/jwt_public_key",
    ALGORITHM: "RS256",
    EXPIRES_IN: "15m",
    ISSUER: "ft_transcendence",
    AUDIENCE: "ft_transcendence_users",
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