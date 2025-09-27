/**
 * Simple JWT Verification Utility
 * 
 * Fetches JWKS from auth service and verifies JWT tokens locally
 * Supports all three JWT types: USER_SESSION, GAME_SESSION, INTERNAL_ACCESS
 * 
 * Usage:
 * - verifyGameSessionToken(token) for game sessions
 * - verifyUserSessionToken(token) for user authentication  
 * - verifyInternalToken(token) for service-to-service communication
 */

import jwt from 'jsonwebtoken';
import { CONFIG } from '../config.js';
import { GameSessionPayload } from '../types/index.js';

interface JWK {
	kty: string;
	use: string;
	alg: string;
	kid: string;
	n: string;
	e: string;
}

interface JWKS {
	keys: JWK[];
}

interface JWTPayload {
	type: string;
	[key: string]: any;
}

export class JWTVerifier {
	private jwksCache: JWKS | null = null;
	private cacheExpiry: number = 0;
	private readonly CACHE_TTL = 3600 * 1000; // 1 hour
	private readonly AUTH_SERVICE_URL: string;

	constructor() {
		this.AUTH_SERVICE_URL = CONFIG.AUTH_SERVICE.URL;
	}

	/**
	 * Fetch JWKS from auth service
	 */
	private async fetchJWKS(): Promise<JWKS> {
		try {
			const response = await fetch(`${this.AUTH_SERVICE_URL}/.well-known/jwks.json`);
			if (!response.ok) {
				throw new Error(`JWKS fetch failed: ${response.status} ${response.statusText}`);
			}
			return await response.json() as JWKS;
		} catch (error) {
			console.error('Failed to fetch JWKS:', error);
			throw new Error(`JWKS fetch failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
		}
	}

	/**
	 * Get JWKS with caching
	 */
	private async getJWKS(): Promise<JWKS> {
		const now = Date.now();
		
		// Return cached JWKS if still valid
		if (this.jwksCache && now < this.cacheExpiry) {
			return this.jwksCache;
		}

		// Fetch new JWKS
		this.jwksCache = await this.fetchJWKS();
		this.cacheExpiry = now + this.CACHE_TTL;
		
		console.log(`🔑 JWKS refreshed with ${this.jwksCache.keys.length} keys`);
		return this.jwksCache;
	}

	/**
	 * Find JWK by key ID
	 */
	private async findKey(kid: string): Promise<JWK | null> {
		const jwks = await this.getJWKS();
		return jwks.keys.find(key => key.kid === kid) || null;
	}

	/**
	 * Convert JWK to PEM format for JWT verification
	 */
	private jwkToPem(jwk: JWK): string {
		try {
			// Use Node.js crypto to convert JWK to PEM
			const crypto = require('crypto');
			const publicKey = crypto.createPublicKey({
				kty: jwk.kty,
				n: jwk.n,
				e: jwk.e
			});
			return publicKey.export({ type: 'spki', format: 'pem' });
		} catch (error) {
			throw new Error(`Failed to convert JWK to PEM: ${error instanceof Error ? error.message : 'Unknown error'}`);
		}
	}

	/**
	 * Verify JWT token with automatic key discovery
	 */
	private async verifyToken(token: string, expectedType: string): Promise<JWTPayload> {
		try {
			// First decode to get key ID from header
			const decoded = jwt.decode(token, { complete: true });
			if (!decoded || typeof decoded === 'string') {
				throw new Error('Invalid token format');
			}

			const kid = decoded.header.kid;
			if (!kid) {
				throw new Error('Missing key ID in token header');
			}

			// Find the corresponding JWK
			const jwk = await this.findKey(kid);
			if (!jwk) {
				throw new Error(`Key not found: ${kid}`);
			}

			// Convert JWK to PEM and verify
			const publicKey = this.jwkToPem(jwk);
			const payload = jwt.verify(token, publicKey, {
				algorithms: [jwk.alg as jwt.Algorithm],
				issuer: CONFIG.JWT.ISSUER || 'ft_transcendence',
			}) as JWTPayload;

			// Verify token type
			if (payload.type !== expectedType) {
				throw new Error(`Invalid token type. Expected: ${expectedType}, got: ${payload.type}`);
			}

			return payload;
		} catch (error) {
			if (error instanceof jwt.JsonWebTokenError) {
				throw new Error(`JWT verification failed: ${error.message}`);
			}
			throw error;
		}
	}

	/**
	 * Verify Game Session JWT token
	 */
	async verifyGameSessionToken(token: string): Promise<GameSessionPayload> {
		const payload = await this.verifyToken(token, 'GAME_SESSION');
		return payload as GameSessionPayload;
	}

	/**
	 * Verify User Session JWT token  
	 */
	async verifyUserSessionToken(token: string): Promise<any> {
		return this.verifyToken(token, 'USER_SESSION');
	}

	/**
	 * Verify Internal Access JWT token
	 */
	async verifyInternalToken(token: string): Promise<any> {
		return this.verifyToken(token, 'INTERNAL_ACCESS');
	}

	/**
	 * Clear JWKS cache (useful for testing or key rotation)
	 */
	clearCache(): void {
		this.jwksCache = null;
		this.cacheExpiry = 0;
	}
}

// Export singleton instance
export const jwtVerifier = new JWTVerifier();

// Export convenience functions
export const verifyGameSessionJWT = (token: string): Promise<GameSessionPayload> => jwtVerifier.verifyGameSessionToken(token);
export const verifyUserSessionJWT = (token: string) => jwtVerifier.verifyUserSessionToken(token);
export const verifyInternalJWT = (token: string) => jwtVerifier.verifyInternalToken(token);