import dotenv from 'dotenv';
import fs from 'fs';
import path from 'path';
import { JWTType } from './types';

dotenv.config();

// Key types for type-safe key loading
type KeyType = 'user-session' | 'game-session' | 'internal-access';
type KeyFormat = 'private' | 'public';

// Helper functions for secure configuration
function loadKeyByType(keyType: KeyType, keyFormat: KeyFormat): string {
	const filename = `${keyType}-${keyFormat}.pem`;
	const keyPath = path.join('/run/secrets', filename);
	try {
		if (!fs.existsSync(keyPath)) {
			throw new Error(`Key file ${filename} does not exist at ${keyPath}`);
		}
		const key = fs.readFileSync(keyPath, 'utf8');
		if (!key.trim()) {
			throw new Error(`Key file ${filename} is empty`);
		}
		return key;
	} catch (error) {
		throw new Error(`Failed to load ${keyType} ${keyFormat} key: ${(error as Error).message}`);
	}
}

function loadClientCredentials(): Record<string, ClientCredentials> {
	const credentials: Record<string, ClientCredentials> = {};
	const services = ['users-service', 'game-service', 'matchmaking-service', 'chat-service'];
	
	for (const service of services) {
		const credentialsPath = path.join('/run/secrets', `${service}-client.env`);
		if (fs.existsSync(credentialsPath)) {
			// Use dotenv to parse the file
			const envConfig = dotenv.parse(fs.readFileSync(credentialsPath));
			
			if (envConfig.CLIENT_ID && envConfig.CLIENT_SECRET) {
				credentials[service] = {
					id: envConfig.CLIENT_ID,
					secret: envConfig.CLIENT_SECRET
				};
			}
		}
	}
	
	return credentials;
}

function optionalEnv(key: string, defaultValue: string): string {
	return process.env[key] || defaultValue;
}

// Configuration interfaces
interface JWTConfig {
	type: JWTType;
	issuer: string;
	privateKey: string;
	publicKey: string;
	algorithm: 'RS256';
	accessTokenExpiry: string;
	refreshTokenExpiry: string;
	tempSecret: string;
}
interface ClientConfig {
	base_url: string;
}

interface ClientsConfig {
	user: ClientConfig;
}

interface ServerConfig {
	port: number;
	host: string;
}

interface OAuthConfig {
	googleClientId?: string;
	googleClientSecret?: string;
	googleRedirectUri?: string;
}

interface CookieConfig {
	options: {
		path: string;
		secure: boolean;
		httpOnly: boolean;
		sameSite: 'none' | 'lax' | 'strict';
	};
}

interface ClientCredentials {
	id: string;
	secret: string;
}

interface Config {
	jwt: {
		user: JWTConfig;
		game: JWTConfig;
		internal: JWTConfig;
	};
	clients: ClientsConfig;
	server: ServerConfig;
	oauth: OAuthConfig;
	cookie: CookieConfig;
	clientCredentials: Record<string, ClientCredentials>;
}

// Configuration object
const config: Config = {
	jwt: {
		user: {
			type: JWTType.USER_SESSION,
			issuer: "ft_transcendence",
			privateKey: loadKeyByType('user-session', 'private'),
			publicKey: loadKeyByType('user-session', 'public'),
			algorithm: 'RS256',
			accessTokenExpiry: '15m',
			refreshTokenExpiry: '7d',
			tempSecret: optionalEnv('JWT_TEMP_SECRET', 'your-temp-secret-key'),
		},
		game: {
			type: JWTType.GAME_SESSION,
			issuer: "ft_transcendence",
			privateKey: loadKeyByType('game-session', 'private'),
			publicKey: loadKeyByType('game-session', 'public'),
			algorithm: 'RS256',
			accessTokenExpiry: '2h',
			refreshTokenExpiry: '',
			tempSecret: optionalEnv('JWT_TEMP_SECRET', 'your-temp-secret-key'),
		},
		internal: {
			type: JWTType.INTERNAL_ACCESS,
			issuer: "ft_transcendence",
			privateKey: loadKeyByType('internal-access', 'private'),
			publicKey: loadKeyByType('internal-access', 'public'),
			algorithm: 'RS256',
			accessTokenExpiry: '1h',
			refreshTokenExpiry: '',
			tempSecret: optionalEnv('JWT_TEMP_SECRET', 'your-temp-secret-key'),
		},
	},
	clients: {
		user: {
			base_url: optionalEnv('USER_SERVICE_URL', "http://backend-users:3000"),
		},
	},
	server: {
		port: parseInt(optionalEnv('PORT', '3000')),
		host: optionalEnv('HOST', '0.0.0.0'),
	},
	oauth: {
		googleClientId: process.env.GOOGLE_CLIENT_ID,
		googleClientSecret: process.env.GOOGLE_CLIENT_SECRET,
		googleRedirectUri: process.env.GOOGLE_REDIRECT_URI,
	},
	cookie: {
		options: {
			path: '/',
			secure: false, // Allow HTTP in containers
			httpOnly: true,
			sameSite: 'lax',
		}
	},
	clientCredentials: loadClientCredentials(),
};

// Export configuration
export { config };

// Export types for use in other modules
export type { Config, JWTConfig, ServerConfig, OAuthConfig, CookieConfig, ClientCredentials };