import dotenv from 'dotenv';
import fs from 'fs';

dotenv.config();

// Load client credentials from Docker secrets
function loadClientCredentials() {
  try {
    const credentialsPath = '/run/secrets/presence-service-client.env';
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
  INACTIVE_SESSION_TIMEOUT: 90_000, // [ms] (90s)
  PING_INTERVAL: 30_000, // [ms] (30s)
  INACTIVE_SESSION_CLEANUP_INTERVAL: 60_000, // [ms] (60s)
  DISCONNECT_GRACE_PERIOD: 2_000, // [ms] (2s) - Grace period before marking user offline

  JWT: {
    ISSUER: process.env.JWT_ISSUER || "ft_transcendence",
  },

  AUTH_SERVICE: {
    BASE_URL: process.env.AUTH_SERVICE_URL || "http://backend-auth:3000"
  },
  
  USERS_SERVICE: {
    BASE_URL: process.env.USERS_SERVICE_URL || "http://backend-users:3000"
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