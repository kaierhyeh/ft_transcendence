import crypto from 'crypto';
import { CONFIG } from '../config.js';

export class JWKSService {
	constructor() {
		this.jwks = null;
		this.lastGenerated = null;
		this.generateJWKS();
	}

	/**
	 * Generate JWKS from RSA public key
	 * JWKS format: https://tools.ietf.org/html/rfc7517
	 */
	generateJWKS() {
		try {
			// Parse the public key to get key components
			const publicKeyObject = crypto.createPublicKey(CONFIG.JWT.PUBLIC_KEY);
			const publicKeyDetails = publicKeyObject.asymmetricKeyDetails;
			
			// Export public key in JWK format
			const jwk = publicKeyObject.export({ format: 'jwk' });
			
			// Generate key ID (kid) from public key
			const keyId = this.generateKeyId(CONFIG.JWT.PUBLIC_KEY);
			
			// Build JWK according to RFC 7517
			const jwkWithMetadata = {
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
			console.log('✅ JWKS generated successfully with key ID:', keyId);
			
		} catch (error) {
			console.error('❌ Failed to generate JWKS:', error);
			throw error;
		}
	}

	/**
	 * Generate a unique key ID from the public key
	 * Using SHA-256 hash of the public key
	 */
	generateKeyId(publicKey) {
		const hash = crypto.createHash('sha256');
		hash.update(publicKey);
		return hash.digest('hex').substring(0, 16);	// Use first 16 chars
	}

	/**
	 * Get current JWKS
	 */
	getJWKS() {
		if (!this.jwks)
			this.generateJWKS();
		return this.jwks;
	}

	/**
	 * Get JWKS with cache headers
	 */
	getJWKSWithCacheInfo() {
		const jwks = this.getJWKS();
		return {
			jwks,
			lastGenerated: this.lastGenerated,
			cacheMaxAge: 3600,	// 1 hour cache
			keyId: jwks.keys[0].kid
		};
	}

	/**
	 * Refresh JWKS (for future key rotation)
	 */
	refresh() {
		console.log('🔄 Refreshing JWKS...');
		this.generateJWKS();
	}

	/**
	 * Find key by key ID (for future multiple keys support)
	 */
	findKeyById(kid) {
		const jwks = this.getJWKS();
		return jwks.keys.find(key => key.kid === kid);
	}

	/**
	 * Get current key ID
	 */
	getCurrentKeyId() {
		const jwks = this.getJWKS();
		return jwks.keys[0].kid;
	}
}

export default new JWKSService();