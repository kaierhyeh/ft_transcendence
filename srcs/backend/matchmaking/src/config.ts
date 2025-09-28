export const CONFIG = {

  AUTH_SERVICE: {
    BASE_URL: process.env.AUTH_SERVICE_URL || "http://backend-auth:3000"
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