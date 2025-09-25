/**
 * Enhanced JWKS Service (jwks.service.ts)
 * 
 * Manages public key distribution for JWT verification across microservices.
 * Supports both legacy single-key system and new three-type JWT system.
 * 
 * Three-Type Mode: Separate RSA keys for USER_SESSION, GAME_SESSION, INTERNAL_ACCESS
 * Legacy Mode: Single RSA key for backward compatibility
 * 
 * Serves /.well-known/jwks.json endpoint following RFC 7517
 * Uses dependency injection to avoid circular imports with auth service
 */

import crypto from 'crypto';
import { CONFIG } from '../config.js';

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
 * Enhanced JWKS Service supporting three JWT types:
 * - USER_SESSION: RSA keys for user authentication tokens
 * - GAME_SESSION: RSA keys for game session tokens  
 * - INTERNAL_ACCESS: RSA keys for service-to-service tokens
 */
export class JWKSService {
	private jwks: JWKS | null = null;
	private lastGenerated: string | null = null;
	private authService: any = null; // Will be injected to avoid circular dependency

	constructor() {
		this.jwks = null;
		this.lastGenerated = null;
	}

	// Set auth service reference to avoid circular imports, then generate JWKS
	async setAuthService(authService: any): Promise<void> {
		this.authService = authService;
		await this.generateJWKS(); // Generate JWKS after auth service is set
	}

	// Generate JWKS from three JWT types, fallback to legacy if unavailable
	async generateJWKS(): Promise<void> {
		try {
			const keys: JWK[] = [];
			
			// If auth service is available, use three-type system
			if (this.authService && this.authService.jwtService) {
				console.log('🔐 Generating JWKS from three-type JWT system...');
				
				// Get keys for all three JWT types
				const jwtTypes = ['USER_SESSION', 'GAME_SESSION', 'INTERNAL_ACCESS'];
				
				for (const jwtType of jwtTypes) {
					try {
						const publicKey = this.authService.jwtService.getPublicKey(jwtType);
						if (publicKey) {
							const jwk = this.createJWKFromPublicKey(publicKey, jwtType);
							keys.push(jwk);
							console.log(`   ✅ Added ${jwtType} key with ID: ${jwk.kid}`);
						}
					} catch (error: any) {
						console.warn(`⚠️  Failed to add ${jwtType} key:`, error.message);
					}
				}
			} else {
				// Fallback to legacy single-key system
				console.log('🔐 Generating JWKS from legacy system...');
				await this.generateLegacyJWKS();
				return;
			}
			
			if (keys.length === 0)
				throw new Error('No keys generated for JWKS');
			
			this.jwks = { keys };
			this.lastGenerated = new Date().toISOString();
			
			console.log(`✅ JWKS generated successfully with ${keys.length} keys (3-type system)`);
			keys.forEach(key => {
				console.log(`   Key ID: ${key.kid}, Type: RSA, Use: ${key.use}`);
			});
			
		} catch (error: any) {
			console.error('❌ Failed to generate JWKS:', error);
			// Fallback to legacy system
			await this.generateLegacyJWKS();
		}
	}

	// Create JWK from RSA public key with type-specific key ID
	private createJWKFromPublicKey(publicKey: string, jwtType: string): JWK {
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
				alg: CONFIG.JWT.ALGORITHM,	// Algorithm (RS256)
				kid: keyId,					// Key ID with type context
				n: jwk.n,					// RSA modulus
				e: jwk.e					// RSA public exponent
			};
		} catch (error: any) {
			throw new Error(`Failed to create JWK for ${jwtType}: ${error.message}`);
		}
	}

	// Fallback to legacy single-key JWKS generation
	private async generateLegacyJWKS(): Promise<void> {
		try {
			console.log('🔄 Falling back to legacy JWKS generation...');
			
			// Parse the public key to get key components
			const publicKeyObject = crypto.createPublicKey(CONFIG.JWT.PUBLIC_KEY!);
			
			// Export public key in JWK format
			const jwk = publicKeyObject.export({ format: 'jwk' }) as any;
			
			// Generate key ID (kid) from public key
			const keyId = this.generateKeyId(CONFIG.JWT.PUBLIC_KEY!);
			
			// Build JWK according to RFC 7517
			const jwkWithMetadata: JWK = {
				kty: jwk.kty,				// Key Type (RSA)
				use: 'sig',					// Public key use (signature)
				alg: CONFIG.JWT.ALGORITHM,	// Algorithm (RS256)
				kid: keyId,					// Key ID
				n: jwk.n,					// RSA modulus
				e: jwk.e					// RSA public exponent
			};

			// Build JWKS
			this.jwks = {
				keys: [jwkWithMetadata]
			};

			this.lastGenerated = new Date().toISOString();
			console.log('✅ Legacy JWKS generated successfully with key ID:', keyId);
			
		} catch (error) {
			console.error('❌ Failed to generate legacy JWKS:', error);
			throw error;
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
			// Generate JWKS synchronously if needed
			if (!this.jwks)
				this.generateLegacyJWKS();
		}
		return this.jwks?.keys[0]?.kid || 'default';
	}

	// Generate key ID from public key with optional type context  
	private generateKeyId(publicKey: string, jwtType?: string): string {
		const hash = crypto.createHash('sha256');
		hash.update(publicKey);
		if (jwtType) {
			hash.update(jwtType); // Add type to make key ID unique per type
		}
		return hash.digest('hex').substring(0, 16);	// Use first 16 chars
	}

	// Get key ID for specific JWT type (for three-type system)
	getKeyIdForType(jwtType: string): string | null {
		if (!this.jwks) return null;
		
		// In three-type system, find key with type-specific ID
		const typeKey = this.jwks.keys.find(key => {
			// Key ID contains type information
			return key.kid.includes(jwtType.toLowerCase()) || 
				   this.generateKeyId(CONFIG.JWT.PUBLIC_KEY!, jwtType) === key.kid;
		});
		
		return typeKey?.kid || null;
	}
}

export default new JWKSService();