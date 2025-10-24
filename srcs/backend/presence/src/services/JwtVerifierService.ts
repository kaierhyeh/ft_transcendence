import jwt from 'jsonwebtoken';
import { CONFIG } from '../config';
import { ErrorCode } from '../errors';


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

export enum JWTType {
  INTERNAL_ACCESS = 'INTERNAL_ACCESS',
  GAME_SESSION = 'GAME_SESSION',
  USER_SESSION = 'USER_SESSION',
}

// Base JWT payload interface
export interface JWTPayload {
  type: JWTType;
  sub?: string;
  iat?: number;
  exp?: number;
  iss?: string;
}

// Internal Access JWT payload for service-to-service communication
export interface InternalAccessPayload extends JWTPayload {
  type: JWTType.INTERNAL_ACCESS;
}

// Game Session JWT payload
export interface GameSessionPayload extends JWTPayload {
	  type: JWTType.GAME_SESSION;
	  sub: string;
	  game_id: number;
}

// User Session JWT payload
export interface UserSessionPayload extends JWTPayload {
	  type: JWTType.USER_SESSION;
	  token_type: "access";
	  sub: string;
}

export class JWTVerifier {
	private jwksCache: JWKS | null = null;
	private cacheExpiry: number = 0;
	private readonly CACHE_TTL = 3600 * 1000; // 1 hour
	private readonly AUTH_SERVICE_URL: string;

	constructor() {
		this.AUTH_SERVICE_URL = CONFIG.AUTH_SERVICE.BASE_URL;
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
			
			// Ensure we have the required properties
			if (!jwk.kty || !jwk.n || !jwk.e) {
				throw new Error(`Invalid JWK: missing required properties (kty: ${jwk.kty}, n: ${!!jwk.n}, e: ${!!jwk.e})`);
			}
			
			// Create public key from JWK format
			const publicKey = crypto.createPublicKey({
				key: {
					kty: jwk.kty,
					n: jwk.n,
					e: jwk.e
				},
				format: 'jwk'
			});
			
			return publicKey.export({ type: 'spki', format: 'pem' });
		} catch (error) {
			console.error('JWK to PEM conversion failed:', {
				jwk: { kty: jwk.kty, kid: jwk.kid, alg: jwk.alg, use: jwk.use },
				error: error instanceof Error ? error.message : 'Unknown error'
			});
			throw new Error(`Failed to convert JWK to PEM: ${error instanceof Error ? error.message : 'Unknown error'}`);
		}
	}

	/**
	 * Verify JWT token with automatic key discovery
	 */
	private async verifyToken(token: string, expectedType: JWTType): Promise<JWTPayload> {
		try {
			// First decode to get key ID from header
			const decoded = jwt.decode(token, { complete: true });
			if (!decoded || typeof decoded === 'string') {
				console.log('❌ JWT decode failed');
				throw new Error(ErrorCode.INVALID_TOKEN);
			}

			const kid = decoded.header.kid;
			if (!kid) {
				console.log('❌ JWT missing kid in header');
				throw new Error(ErrorCode.INVALID_TOKEN);
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
				issuer: CONFIG.JWT.ISSUER,
			}) as JWTPayload;

			// Verify token type
			if (payload.type !== expectedType) {
				console.log(`❌ JWT type mismatch: expected ${expectedType}, got ${payload.type}`);
				throw new Error(ErrorCode.INVALID_TOKEN);
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
	 * Verify Internal Access JWT token
	 */
	async verifyInternalToken(token: string): Promise<InternalAccessPayload> {
		const result = await this.verifyToken(token, JWTType.INTERNAL_ACCESS);
		return result as InternalAccessPayload;
	}

	/**
	 * Verify Game Session JWT token
	 */
	async verifyGameSessionToken(token: string): Promise<GameSessionPayload> {
		const result = await this.verifyToken(token, JWTType.GAME_SESSION);
		return result as GameSessionPayload;
	}

	/**
	 * Verify User Session JWT token
	 */
	async verifyUserSessionToken(token: string): Promise<UserSessionPayload> {
		const payload = await this.verifyToken(token, JWTType.USER_SESSION);
		return payload as UserSessionPayload;
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
export const verifyInternalJWT = (token: string): Promise<InternalAccessPayload> => jwtVerifier.verifyInternalToken(token);
export const verifyGameSessionJWT = (token: string): Promise<GameSessionPayload> => jwtVerifier.verifyGameSessionToken(token);
export const verifyUserSessionJWT = (token: string): Promise<UserSessionPayload> => jwtVerifier.verifyUserSessionToken(token);