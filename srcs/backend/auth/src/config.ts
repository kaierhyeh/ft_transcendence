import dotenv from 'dotenv';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { JWTType } from './types';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Key types for type-safe key loading
type KeyType = 'user' | 'game' | 'internal';
type KeyFormat = 'private' | 'public';

// Helper functions for secure configuration
function loadKeyByType(keyType: KeyType, keyFormat: KeyFormat): string {
	const filename = `${keyType}_${keyFormat}.pem`;
	const keyPath = path.join('/app/data/keys', filename);
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

interface DatabaseConfig {
	url: string;
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

interface UploadConfig {
	maxFileSize: number;
}

interface CookieConfig {
	options: {
		path: string;
		secure: boolean;
		httpOnly: boolean;
		sameSite: 'none' | 'lax' | 'strict';
	};
}

interface Config {
	jwt: {
		user: JWTConfig;
		game: JWTConfig;
		internal: JWTConfig;
	};
	database: DatabaseConfig;
	server: ServerConfig;
	oauth: OAuthConfig;
	upload: UploadConfig;
	cookie: CookieConfig;
}

// Configuration object
const config: Config = {
	jwt: {
		user: {
			type: JWTType.USER_SESSION,
			issuer: "ft_transcendence",
			privateKey: loadKeyByType('user', 'private'),
			publicKey: loadKeyByType('user', 'public'),
			algorithm: 'RS256',
			accessTokenExpiry: '15m',
			refreshTokenExpiry: '7d',
			tempSecret: optionalEnv('JWT_TEMP_SECRET', 'your-temp-secret-key'),
		},
		game: {
			type: JWTType.GAME_SESSION,
			issuer: "ft_transcendence",
			privateKey: loadKeyByType('game', 'private'),
			publicKey: loadKeyByType('game', 'public'),
			algorithm: 'RS256',
			accessTokenExpiry: '2h',
			refreshTokenExpiry: '',
			tempSecret: optionalEnv('JWT_TEMP_SECRET', 'your-temp-secret-key'),
		},
		internal: {
			type: JWTType.INTERNAL_ACCESS,
			issuer: "ft_transcendence",
			privateKey: loadKeyByType('internal', 'private'),
			publicKey: loadKeyByType('internal', 'public'),
			algorithm: 'RS256',
			accessTokenExpiry: '1h',
			refreshTokenExpiry: '',
			tempSecret: optionalEnv('JWT_TEMP_SECRET', 'your-temp-secret-key'),
		},
	},
	database: {
		url: optionalEnv('DATABASE_URL', './data/database.db'),
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
	upload: {
		maxFileSize: 2 * 1024 * 1024, // 2MB
	},
	cookie: {
		options: {
			path: '/',
			secure: false, // Allow HTTP in containers
			httpOnly: true,
			sameSite: 'lax',
		}
	}
};

// Export configuration
export { config };

// Export types for use in other modules
export type { Config, JWTConfig, DatabaseConfig, ServerConfig, OAuthConfig, UploadConfig, CookieConfig };