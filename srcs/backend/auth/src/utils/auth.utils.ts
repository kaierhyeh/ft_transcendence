import * as jwt from 'jsonwebtoken';
import { SignOptions } from 'jsonwebtoken';
import { CONFIG } from '../config';
import jwksService from '../services/jwks.service';
import { JWTType } from '../types/index';

export class AuthUtils {
	// Cache for internal JWT token
	private internalJWTCache: {
		token: string | null;
		expiresAt: number;
	} = {
		token: null,
		expiresAt: 0
	};


	// Configure and set cookies with flexible expiration time
	ft_setCookie(reply: any, token: string, duration: string, tokenType: 'access' | 'refresh' = 'access'): void {
		const maxAge = this.parseDuration(duration) / 1000; // seconds
		const cookieName = tokenType === 'access' ? 'accessToken' : 'refreshToken';
		
		reply.setCookie(cookieName, token, {
			path: CONFIG.COOKIE.OPTIONS.PATH,
			secure: CONFIG.COOKIE.OPTIONS.SECURE,
			httpOnly: CONFIG.COOKIE.OPTIONS.HTTP_ONLY,
			sameSite: CONFIG.COOKIE.OPTIONS.SAME_SITE,
			maxAge
		});
	}

	/**
	 * Parse duration string to milliseconds
	 * Supports formats: "15m", "7d", "1h", "30s"
	 * @param duration - Duration string (e.g., "15m", "7d", "1h", "30s")
	 * @returns Duration in milliseconds
	 */
	public parseDuration(duration: string): number {
		const match = /^(\d+)([smhd])$/.exec(duration);
		if (!match) throw new Error(`Invalid duration format: ${duration}`);
		const value = parseInt(match[1], 10);
		switch (match[2]) {
			case 's': return value * 1000;
			case 'm': return value * 60 * 1000;
			case 'h': return value * 60 * 60 * 1000;
			case 'd': return value * 24 * 60 * 60 * 1000;
			default: throw new Error(`Unknown duration unit: ${match[2]}`);
		}
	}

	/**
	 * Convert duration string to seconds (for Redis TTL)
	 * @param duration - Duration string (e.g., "15m", "7d", "1h", "30s")
	 * @returns Duration in seconds
	 */
	public parseDurationToSeconds(duration: string): number {
		return Math.floor(this.parseDuration(duration) / 1000);
	}

		/**
	 * Security validation for input fields (control chars, XSS)
	 * Throws error with code/message if unsafe
	 */
	public checkInputSafety(field: string, value: string): void {
		// Control characters (ASCII 0-31 and 127)
		if (/[^\x20-\x7E]/.test(value)) {
			const error: any = new Error(`${field} contains invalid characters`);
			error.code = 'UNSAFE_INPUT';
			error.field = field;
			throw error;
		}
		// XSS patterns
		if (/<[^>]*>|script|alert|onerror|onclick|javascript:|&lt;|\"|\'|%3C/.test(value.toLowerCase())) {
			const error: any = new Error(`${field} contains potentially malicious patterns`);
			error.code = 'UNSAFE_INPUT';
			error.field = field;
			throw error;
		}
	}

	/**
	 * Normalize email to lowercase
	 */
	public normalizeEmail(email: string): string {
		return email.trim().toLowerCase();
	}


	/**
	 * Generate internal JWT for service-to-service communication
	 * Centralized method with caching to avoid regenerating tokens
	 * Tokens are cached and reused until 5 minutes before expiry
	 */
	generateInternalJWT(): string {
		const now = Date.now();
		
		// Check if we have a valid cached token (expires 5 minutes early for safety)
		if (this.internalJWTCache.token && now < this.internalJWTCache.expiresAt - (5 * 60 * 1000)) {
			console.log('🔄 Using cached internal JWT token');
			return this.internalJWTCache.token;
		}

		// Generate new token
		const keyId = jwksService.getKeyIdForType(JWTType.INTERNAL_ACCESS);
		if (!keyId) {
			throw new Error('Internal JWT key ID not found in JWKS');
		}
		
		const sign_options: SignOptions = {
			algorithm: CONFIG.JWT.INTERNAL.ALGORITHM,
			expiresIn: CONFIG.JWT.INTERNAL.ACCESS_TOKEN_EXPIRY as any,
			keyid: keyId
		};

		console.log(`🔐 Generating new internal JWT with key ID: ${keyId}`);

		const token = jwt.sign(
			{
				type: CONFIG.JWT.INTERNAL.TYPE,
				iss: CONFIG.JWT.INTERNAL.ISSUER,
			},
			CONFIG.JWT.INTERNAL.PRIVATE_KEY,
			sign_options
		);

		// Cache the token with expiry time using centralized parser
		const expiryInMs = this.parseDuration(CONFIG.JWT.INTERNAL.ACCESS_TOKEN_EXPIRY);
		this.internalJWTCache = {
			token,
			expiresAt: now + expiryInMs
		};

		return token;
	}

	/**
	 * Generate game session JWT for game authentication
	 * Similar to internal JWT but includes game-specific claims
	 */
	generateGameJWT(claims: { sub: string; game_id: number }): string {
		// Generate new token (no caching for game tokens as they're session-specific)
		const keyId = jwksService.getKeyIdForType(JWTType.GAME_SESSION);
		if (!keyId) {
			throw new Error('Game session JWT key ID not found in JWKS');
		}
		
		const sign_options: SignOptions = {
			algorithm: CONFIG.JWT.GAME.ALGORITHM,
			expiresIn: CONFIG.JWT.GAME.ACCESS_TOKEN_EXPIRY as any,
			keyid: keyId
		};

		console.log(`🎮 Generating new game JWT with key ID: ${keyId} for game: ${claims.game_id}`);

		const token = jwt.sign(
			{
				// Standard JWT claims
				sub: claims.sub,
				iss: CONFIG.JWT.GAME.ISSUER,
				type: CONFIG.JWT.GAME.TYPE,

				// Game specific claims
				game_id: claims.game_id,
			},
			CONFIG.JWT.GAME.PRIVATE_KEY,
			sign_options
		);

		return token;
	}
}

export default new AuthUtils();