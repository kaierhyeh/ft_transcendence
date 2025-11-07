/**
 * Enhanced JWKS Service (jwks.service.ts)
 * 
 * Manages public key distribution for JWT verification across microservices.
 * Supports three-type JWT system with separate RSA keys for each JWT type.
 * 
 * JWT Types: USER_SESSION, GAME_SESSION, INTERNAL_ACCESS
 * Each type has its own RSA key pair loaded from config
 * 
 * Serves /.well-known/jwks.json endpoint following RFC 7517
 * Uses config-based key loading system
 */

import crypto from 'crypto';
import { CONFIG } from '../config';
import { JWTType } from '../types/index';

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

interface JWKSWithCache {
	jwks: JWKS;
	lastGenerated: string | null;
	cacheMaxAge: number;
	keyId: string;
}

/**
 * JWKS Service supporting three JWT types:
 * - USER_SESSION: RSA keys for user authentication tokens
 * - GAME_SESSION: RSA keys for game session tokens  
 * - INTERNAL_ACCESS: RSA keys for service-to-service tokens
 */
export class JWKSService {
	private jwks: JWKS | null = null;
	private lastGenerated: string | null = null;

	constructor() {
		this.jwks = null;
		this.lastGenerated = null;
	}

	// Generate JWKS from three JWT types using config system
	async generateJWKS(): Promise<void> {
		try {
			const keys: JWK[] = [];
			
			console.log('🔐 Generating JWKS from three-type JWT system...');
			
			// Get keys for all three JWT types from config
			const jwtConfigs = [
				{ type: JWTType.USER_SESSION, config: CONFIG.JWT.USER },
				{ type: JWTType.GAME_SESSION, config: CONFIG.JWT.GAME },
				{ type: JWTType.INTERNAL_ACCESS, config: CONFIG.JWT.INTERNAL }
			];
			
			for (const { type, config: jwtConfig } of jwtConfigs) {
				try {
					const publicKey = jwtConfig.PUBLIC_KEY;
					if (publicKey) {
						const jwk = this.createJWKFromPublicKey(publicKey, type, jwtConfig.ALGORITHM);
						keys.push(jwk);
						console.log(`   ✅ Added ${type} key with ID: ${jwk.kid}`);
					}
				} catch (error: any) {
					console.warn(`⚠️  Failed to add ${type} key:`, error.message);
				}
			}
			
			if (keys.length === 0)
				throw new Error('No keys generated for JWKS');
			
			this.jwks = { keys };
			this.lastGenerated = new Date().toISOString();
			
			console.log(`✅ JWKS generated successfully with ${keys.length} keys (3-type system)`);
			keys.forEach(key => {
				console.log(`   Key ID: ${key.kid}, Algorithm: ${key.alg}, Use: ${key.use}`);
			});
			
		} catch (error: any) {
			console.error('❌ Failed to generate JWKS:', error);
			throw error;
		}
	}

	// Create JWK from RSA public key with type-specific key ID
	private createJWKFromPublicKey(publicKey: string, jwtType: JWTType, algorithm: string): JWK {
		try {
			// Parse the public key to get key components
			const publicKeyObject = crypto.createPublicKey(publicKey);
			
			// Export public key in JWK format
			const jwk = publicKeyObject.export({ format: 'jwk' }) as any;
			
			// Generate type-specific key ID
			const keyId = this.generateKeyId(publicKey, jwtType);
			
			// Build JWK according to RFC 7517
			return {
				kty: jwk.kty,				// Key Type (RSA)
				use: 'sig',					// Public key use (signature)
				alg: algorithm,				// Algorithm (RS256)
				kid: keyId,					// Key ID with type context
				n: jwk.n,					// RSA modulus
				e: jwk.e					// RSA public exponent
			};
		} catch (error: any) {
			throw new Error(`Failed to create JWK for ${jwtType}: ${error.message}`);
		}
	}



	// Get current JWKS
	async getJWKS(): Promise<JWKS> {
		if (!this.jwks)
			await this.generateJWKS();
		return this.jwks!;
	}

	// Get JWKS with cache headers
	async getJWKSWithCacheInfo(): Promise<JWKSWithCache> {
		const jwks = await this.getJWKS();
		return {
			jwks,
			lastGenerated: this.lastGenerated,
			cacheMaxAge: 3600,	// 1 hour cache
			keyId: jwks.keys[0]?.kid || 'unknown'
		};
	}


	// Refresh JWKS (for future key rotation)
	async refresh(): Promise<void> {
		console.log('🔄 Refreshing JWKS...');
		await this.generateJWKS();
	}


	// Find key by key ID (supports all three types)
	findKeyById(kid: string): JWK | undefined {
		if (!this.jwks) return undefined;
		return this.jwks.keys.find(key => key.kid === kid);
	}


	// Get current key ID (returns first available key)
	getCurrentKeyId(): string {
		if (!this.jwks || this.jwks.keys.length === 0) {
			// Return a default key ID - JWKS should be generated at startup
			return 'default-user-key';
		}
		return this.jwks?.keys[0]?.kid || 'default';
	}

	// Generate key ID from public key with JWT type context  
	private generateKeyId(publicKey: string, jwtType: JWTType): string {
		const hash = crypto.createHash('sha256');
		hash.update(publicKey);
		hash.update(jwtType); // Add type to make key ID unique per type
		return `${jwtType.toLowerCase()}_${hash.digest('hex').substring(0, 12)}`;	// Type prefix + hash
	}

	// Get key ID for specific JWT type
	getKeyIdForType(jwtType: JWTType): string | null {
		if (!this.jwks) return null;
		
		// Find key with type-specific ID (keys are prefixed with type)
		const typeKey = this.jwks.keys.find(key => {
			return key.kid.startsWith(jwtType.toLowerCase());
		});
		
		return typeKey?.kid || null;
	}
}

export default new JWKSService();