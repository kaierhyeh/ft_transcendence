import dotenv from 'dotenv';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load RSA keys
const keysDir: string = path.join(process.cwd(), 'keys');
const privateKeyPath: string = path.join(keysDir, 'private.pem');
const publicKeyPath: string = path.join(keysDir, 'public.pem');

let PRIVATE_KEY: string | null = null;
let PUBLIC_KEY: string | null = null;

try {
	PRIVATE_KEY = fs.readFileSync(privateKeyPath, 'utf8');
	PUBLIC_KEY = fs.readFileSync(publicKeyPath, 'utf8');
	console.log('✅ RSA keys loaded successfully');
} catch (error) {
	console.error('❌ Failed to load RSA keys:', (error as Error).message);
	console.error('🔧 Please run: node keys/generate-keys.js');
	process.exit(1);
}

interface ConfigType {
	JWT: {
		PRIVATE_KEY: string | null;
		PUBLIC_KEY: string | null;
		ALGORITHM: 'RS256';
		ACCESS_TOKEN_EXPIRY: string;
		REFRESH_TOKEN_EXPIRY: string;
		TEMP_SECRET: string;
	};
	DB: {
		URL: string;
	};
	SERVER: {
		PORT: number;
		HOST: string;
	};
	OAUTH: {
		GOOGLE_CLIENT_ID: string | undefined;
		GOOGLE_CLIENT_SECRET: string | undefined;
		GOOGLE_REDIRECT_URI: string | undefined;
	};
	UPLOAD: {
		MAX_FILE_SIZE: number;
	};
	COOKIE: {
		OPTIONS: {
			path: string;
			secure: boolean;
			httpOnly: boolean;
			sameSite: 'None';
		};
	};
}

export const CONFIG: ConfigType = {
	// JWT settings with RSA
	JWT: {
		PRIVATE_KEY,					// RSA 私鑰（簽發用）
		PUBLIC_KEY,						// RSA 公鑰（驗證用）
		ALGORITHM: 'RS256',				// RSA + SHA256 演算法
		ACCESS_TOKEN_EXPIRY: '15m',		// 15 minutes
		REFRESH_TOKEN_EXPIRY: '7d',		// 7 days
		// Fallback for temporary tokens (can still use symmetric for temp tokens)
		TEMP_SECRET: process.env.JWT_TEMP_SECRET || 'your-temp-secret-key',
	},

	// Database settings
	DB: {
		URL: process.env.DATABASE_URL || './data/database.db',
	},

	// Server settings
	SERVER: {
		PORT: parseInt(process.env.PORT || '3000'),
		HOST: process.env.HOST || '0.0.0.0',
	},

	// OAuth settings
	OAUTH: {
		GOOGLE_CLIENT_ID: process.env.GOOGLE_CLIENT_ID,
		GOOGLE_CLIENT_SECRET: process.env.GOOGLE_CLIENT_SECRET,
		GOOGLE_REDIRECT_URI: process.env.GOOGLE_REDIRECT_URI,
	},

	// File upload settings
	UPLOAD: {
		MAX_FILE_SIZE: 2 * 1024 * 1024, // 2MB
	},

	// Cookie settings
	COOKIE: {
		OPTIONS: {
			path: '/',
			secure: true,
			httpOnly: true,
			sameSite: 'None',
		}
	}
};