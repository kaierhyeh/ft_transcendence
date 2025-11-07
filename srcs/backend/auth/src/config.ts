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
	const services = ['users-service', 'game-service', 'matchmaking-service', 'chat-service', 'stats-service', 'presence-service'];
	
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
		console.log(`Loaded credentials for ${service}`);
	}
	
	return credentials;
}

function loadOAuthCredentials(): OAuthConfig {
	const oauthPath = path.join('/run/secrets', 'google-oauth.env');
	
	// Default values if file doesn't exist
	let googleClientId: string | undefined;
	let googleClientSecret: string | undefined;
	let googleRedirectUri: string | undefined;
	
	if (fs.existsSync(oauthPath)) {
		const envConfig = dotenv.parse(fs.readFileSync(oauthPath));
		googleClientId = envConfig.GOOGLE_CLIENT_ID;
		googleClientSecret = envConfig.GOOGLE_CLIENT_SECRET;
		googleRedirectUri = envConfig.GOOGLE_REDIRECT_URI;
	}
	
	return {
		GOOGLE_CLIENT_ID: googleClientId,
		GOOGLE_CLIENT_SECRET: googleClientSecret,
		GOOGLE_REDIRECT_URI: googleRedirectUri,
	};
}

function optionalEnv(key: string, defaultValue: string): string {
	return process.env[key] || defaultValue;
}

// Configuration interfaces
interface JWTConfig {
	TYPE: JWTType;
	ISSUER: string;
	PRIVATE_KEY: string;
	PUBLIC_KEY: string;
	ALGORITHM: 'RS256';
	ACCESS_TOKEN_EXPIRY: string;
	REFRESH_TOKEN_EXPIRY: string;
	TEMP_SECRET: string;
}
interface ClientConfig {
	BASE_URL: string;
}

interface ClientsConfig {
	USER: ClientConfig;
}

interface ServerConfig {
	PORT: number;
	HOST: string;
}

interface OAuthConfig {
	GOOGLE_CLIENT_ID?: string;
	GOOGLE_CLIENT_SECRET?: string;
	GOOGLE_REDIRECT_URI?: string;
}

interface CookieConfig {
	OPTIONS: {
		PATH: string;
		SECURE: boolean;
		HTTP_ONLY: boolean;
		SAME_SITE: 'none' | 'lax' | 'strict';
	};
}

interface ClientCredentials {
	id: string;
	secret: string;
}

interface Config {
	JWT: {
		USER: JWTConfig;
		GAME: JWTConfig;
		INTERNAL: JWTConfig;
	};
	CLIENTS: ClientsConfig;
	SERVER: ServerConfig;
	OAUTH: OAuthConfig;
	COOKIE: CookieConfig;
	CLIENT_CREDENTIALS: Record<string, ClientCredentials>;
}

// Configuration object
export const CONFIG: Config = {
	JWT: {
		USER: {
			TYPE: JWTType.USER_SESSION,
			ISSUER: "ft_transcendence",
			PRIVATE_KEY: loadKeyByType('user-session', 'private'),
			PUBLIC_KEY: loadKeyByType('user-session', 'public'),
			ALGORITHM: 'RS256',
			ACCESS_TOKEN_EXPIRY: '15m',
			REFRESH_TOKEN_EXPIRY: '7d',
			TEMP_SECRET: optionalEnv('JWT_TEMP_SECRET', 'your-temp-secret-key'),
		},
		GAME: {
			TYPE: JWTType.GAME_SESSION,
			ISSUER: "ft_transcendence",
			PRIVATE_KEY: loadKeyByType('game-session', 'private'),
			PUBLIC_KEY: loadKeyByType('game-session', 'public'),
			ALGORITHM: 'RS256',
			ACCESS_TOKEN_EXPIRY: '2h',
			REFRESH_TOKEN_EXPIRY: '',
			TEMP_SECRET: optionalEnv('JWT_TEMP_SECRET', 'your-temp-secret-key'),
		},
		INTERNAL: {
			TYPE: JWTType.INTERNAL_ACCESS,
			ISSUER: "ft_transcendence",
			PRIVATE_KEY: loadKeyByType('internal-access', 'private'),
			PUBLIC_KEY: loadKeyByType('internal-access', 'public'),
			ALGORITHM: 'RS256',
			ACCESS_TOKEN_EXPIRY: '1h',
			REFRESH_TOKEN_EXPIRY: '',
			TEMP_SECRET: optionalEnv('JWT_TEMP_SECRET', 'your-temp-secret-key'),
		},
	},
	CLIENTS: {
		USER: {
			BASE_URL: optionalEnv('USER_SERVICE_URL', "http://backend-users:3000"),
		},
	},
	SERVER: {
		PORT: parseInt(optionalEnv('PORT', '3000')),
		HOST: optionalEnv('HOST', '0.0.0.0'),
	},
	OAUTH: loadOAuthCredentials(),
	COOKIE: {
		OPTIONS: {
			PATH: '/',
			SECURE: false, // Allow HTTP in containers
			HTTP_ONLY: true,
			SAME_SITE: 'lax',
		}
	},
	CLIENT_CREDENTIALS: loadClientCredentials(),
};


// Export types for use in other modules
export type { Config, JWTConfig, ServerConfig, OAuthConfig, CookieConfig, ClientCredentials };