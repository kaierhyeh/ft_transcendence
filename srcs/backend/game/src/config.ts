import { TIMEOUT } from 'dns';
import dotenv from 'dotenv';
import fs from 'fs';

dotenv.config();

// Load client credentials from Docker secrets
function loadClientCredentials() {
  try {
    const credentialsPath = '/run/secrets/game-service-client.env';
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
  // Game settings
  GAME: {
    TICK_PERIOD: 1000 / 30,
    MAX_SESSIONS: 100,
    TIMEOUT: 600_000, // ms <=> 10min
  },
  
  // Database settings
  DB: {
    PATH: process.env.DB_PATH || "/app/data/sessions.db",
    ENABLE_WAL: true,
  },

  JWT: {
    ISSUER: process.env.JWT_ISSUER || "ft_transcendence",
  },

  // Auth service settings
  AUTH_SERVICE: {
    BASE_URL: process.env.AUTH_SERVICE_URL || "http://backend-auth:3000",
  },

  // Stats service settings
  STATS_SERVICE: {
    BASE_URL: process.env.STATS_SERVICE_URL || "http://backend-stats:3000",
  },

  
  USERS_SERVICE: {
    BASE_URL: process.env.GAME_SERVICE_URL || "http://backend-users:3000"
  },

  CHAT_SERVICE: {
    BASE_URL: process.env.CHAT_SERVICE_URL || "http://backend-chat:3000"
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