// application configuration — things like environment variables, ports, database paths, secrets, etc.

// example :

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
		PATH: process.env.DB_PATH || "/app/sessions/sessions.db",
		ENABLE_WAL: true,
	},

	// Server settings
	SERVER: {
		PORT: parseInt(process.env.PORT || "3000"),
		HOST: process.env.HOST || "0.0.0.0",
	},

	SECURITY: {
		JWT_SECRET: process.env.SECRET_JWT || "here-should-be-magic-secret-words",
	},


  AUTH_SERVICE: {
    BASE_URL: process.env.AUTH_SERVICE_URL || "http://backend-auth:3000"
  },

    JWT: {
    ISSUER: process.env.JWT_ISSUER || "ft_transcendence",
  },

    
  // Internal auth credentials
  INTERNAL_AUTH: {
    CLIENT_ID: clientCredentials.clientId,
    CLIENT_SECRET: clientCredentials.clientSecret,
  },
  

  
} as const;
