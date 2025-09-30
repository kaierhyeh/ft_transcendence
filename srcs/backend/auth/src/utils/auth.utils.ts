import bcrypt from 'bcrypt';
import type { FastifyReply, FastifyInstance } from 'fastify';
import * as jwt from 'jsonwebtoken';
import { SignOptions } from 'jsonwebtoken';
import { config } from '../config.js';
import jwksService from '../services/jwks.service.js';

export class AuthUtils {
	// Cache for internal JWT token
	private internalJWTCache: {
		token: string | null;
		expiresAt: number;
	} = {
		token: null,
		expiresAt: 0
	};

	// Hash password with bcrypt
	async hashPassword(password: string, saltRounds: number = 10): Promise<string> {
		try {
			return await bcrypt.hash(password, saltRounds);
		} catch (error) {
			console.error('Password hashing error:', error);
			throw new Error('Failed to hash password');
		}
	}

	// Verify password with bcrypt
	async verifyPassword(password: string, hashedPassword: string): Promise<boolean> {
		try {
			return await bcrypt.compare(password, hashedPassword);
		} catch (error) {
			console.error('Password verification error:', error);
			throw new Error('Failed to verify password');
		}
	}

	// Configure and set cookies with flexible expiration time
	ft_setCookie(reply: any, token: string, duration: number): void {
		const cookieOptions = {
			path: '/',
			secure: true,
			httpOnly: true,
			sameSite: 'none' as const,
		};

		// Accepted cases: 1min (debug), 5min, 15min or 7days
		if (duration === 1) { // 🔧 Debug purpose only
			reply.setCookie('accessToken', token, {
				...cookieOptions,
				maxAge: 60 // 1 minute
			});
		} else if (duration === 5 || duration === 15) {
			reply.setCookie('accessToken', token, {
				...cookieOptions,
				maxAge: duration * 60
			});
		} else if (duration === 7) {
			reply.setCookie('refreshToken', token, {
				...cookieOptions,
				maxAge: duration * 24 * 60 * 60
			});
		} else {
			throw new Error("Invalid duration: only 1 (debug), 5, 15 (minutes) or 7 (days) are allowed.");
		}
		return reply;
	}

	/**
	 * Security validation for login input (username or email)
	 * Performs security checks that can't be handled by JSON schema
	 * 
	 * @param fastify - Fastify instance for logging
	 * @param login - The login input (username or email)
	 * @returns Sanitized login string or error object
	 */
	checkLogin(fastify: any, login: string): { error: string } | string {
		fastify.log.info(`Security check for login: ${login}`);

		// Note: Basic format validation is handled by JSON schema
		// This function focuses on security concerns

		// Check for control characters and escape sequences
		if (/[\x00-\x1F\x7F]/.test(login)) {
			fastify.log.warn("Security check failed: login contains control characters");
			return { error: "Login contains invalid characters" };
		}

		// Check for XSS patterns
		if (/<[^>]*>|script|alert|onerror|onclick|javascript:|&lt;|\"|\'|%3C/.test(login.toLowerCase())) {
			fastify.log.warn("Security check failed: login contains potentially malicious patterns");
			return { error: "Login contains invalid characters" };
		}

		// Check for excessive repetition of characters (security concern)
		if (/(.)\1{6,}/.test(login)) {
			fastify.log.warn("Security check failed: login contains excessive repeated characters");
			return { error: "Login cannot contain more than 6 repeated characters in a row" };
		}

		// Normalize the login:
		// - Email addresses: lowercase
		// - Usernames: capitalize first letter
		const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
		if (emailRegex.test(login)) {
			return login.toLowerCase();
		} else {
			// Traditional username normalization
			return login.charAt(0).toUpperCase() + login.slice(1).toLowerCase();
		}
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
			return this.internalJWTCache.token;
		}

		// Generate new token
		const sign_options: SignOptions = {
			algorithm: config.jwt.internal.algorithm,
			expiresIn: config.jwt.internal.accessTokenExpiry as any,
			keyid: jwksService.getCurrentKeyId()
		};

		const token = jwt.sign(
			{
				type: config.jwt.internal.type,
				iss: config.jwt.internal.issuer,
			},
			config.jwt.internal.privateKey,
			sign_options
		);

		// Cache the token with expiry time (1 hour from now)
		this.internalJWTCache = {
			token,
			expiresAt: now + (60 * 60 * 1000) // 1 hour in milliseconds
		};

		return token;
	}
}

export default new AuthUtils();