import dotenv from 'dotenv';
import fs from 'fs';

dotenv.config();

// Load client credentials from Docker secrets
function loadClientCredentials() {
  try {
    const credentialsPath = '/run/secrets/stats-service-client.env';
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
    PATH: process.env.DB_PATH || "/app/data/stats.db",
    ENABLE_WAL: true,
  },

  // Game service settings
  GAME_SERVICE: {
    BASE_URL: process.env.GAME_SERVICE_URL || "http://backend-game:3000",
  },

  // Auth service settings
  AUTH_SERVICE: {
    BASE_URL: process.env.AUTH_SERVICE_URL || "http://backend-auth:3000",
  },

  JWT: {
    ISSUER: process.env.JWT_ISSUER || "ft_transcendence",
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
