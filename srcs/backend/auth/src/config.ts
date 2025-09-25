import dotenv from 'dotenv';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Helper functions for secure configuration
function loadKeyFromFile(filename: string): string {
	const keyPath = path.join(process.cwd(), 'keys', filename);
	try {
		return fs.readFileSync(keyPath, 'utf8');
	} catch (error) {
		throw new Error(`Failed to load key ${filename}: ${(error as Error).message}`);
	}
}

function optionalEnv(key: string, defaultValue: string): string {
	return process.env[key] || defaultValue;
}

// Configuration interfaces
interface JWTConfig {
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
	jwt: JWTConfig;
	database: DatabaseConfig;
	server: ServerConfig;
	oauth: OAuthConfig;
	upload: UploadConfig;
	cookie: CookieConfig;
}

// Configuration object
const config: Config = {
	jwt: {
		privateKey: optionalEnv('JWT_PRIVATE_KEY', loadKeyFromFile('private.pem')),
		publicKey: optionalEnv('JWT_PUBLIC_KEY', loadKeyFromFile('public.pem')),
		algorithm: 'RS256',
		accessTokenExpiry: '15m',
		refreshTokenExpiry: '7d',
		tempSecret: optionalEnv('JWT_TEMP_SECRET', 'your-temp-secret-key'),
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