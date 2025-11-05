import dotenv from 'dotenv';
import fs from 'fs';

dotenv.config();

// Load client credentials from Docker secrets
function loadClientCredentials() {
  try {
    const credentialsPath = '/run/secrets/users-service-client.env';
    if (fs.existsSync(credentialsPath)) {
      const envConfig = dotenv.parse(fs.readFileSync(credentialsPath));
      return {
        clientId: envConfig.CLIENT_ID || '',
        clientSecret: envConfig.CLIENT_SECRET || ''
      };
    }
  } catch (error) {
    console.error('Failed to load client credentials:', error);
  }
  return { clientId: '', clientSecret: '' };
}

const clientCredentials = loadClientCredentials();

export const CONFIG = {
  
  // Database settings
  DB: {
    PATH: process.env.DB_PATH || "/app/data/db/users.db",
    ENABLE_WAL: true,
  },

  AVATAR: {
    BASE_URL: process.env.AVATAR_BASE_URL || "/app/data/avatar",
    MAX_SIZE: 2 * 1024 * 1024, // 2MB
    ALLOWED_TYPES: ['image/jpeg', 'image/png', 'image/gif', 'image/webp'],
    DEFAULT_FILENAME: 'default.png'
  },

  JWT: {
    ISSUER: process.env.JWT_ISSUER || "ft_transcendence",
  },

  AUTH_SERVICE: {
    BASE_URL: process.env.AUTH_SERVICE_URL || "http://backend-auth:3000"
  },
  
  STATS_SERVICE: {
    BASE_URL: process.env.STATS_SERVICE_URL || "http://backend-stats:3000"
  },

  GAME_SERVICE: {
    BASE_URL: process.env.STATS_SERVICE_URL || "http://backend-game:3000"
  },


  // Internal auth credentials
  INTERNAL_AUTH: {
    CLIENT_ID: clientCredentials.clientId,
    CLIENT_SECRET: clientCredentials.clientSecret,
  },

  // Server settings
  SERVER: {
    PORT: parseInt(process.env.PORT || "3000"),
    HOST: process.env.HOST || "0.0.0.0",
  }
} as const;