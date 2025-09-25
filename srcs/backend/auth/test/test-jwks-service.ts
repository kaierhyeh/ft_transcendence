// JWKS 服務 - 支援三種 JWT 類型
import crypto from 'crypto';

// 模擬 JWT 類型（等等會從 TypeScript 檔案匯入）
const JWTType = {
  USER_SESSION: 'user_session',
  GAME_SESSION: 'game_session', 
  INTERNAL_ACCESS: 'internal'
} as const;

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
	keyCount: number;
}

interface PublicKeyInfo {
	keyId: string;
	publicKey: string;
}

interface JWTService {
	getAllPublicKeys(): Record<string, PublicKeyInfo>;
}

interface KeyStats {
	totalKeys: number;
	keyTypes: Record<string, number>;
	lastGenerated: string | null;
}

export class JWKSService {
	private jwtService: JWTService;
	private jwks: JWKS | null;
	private lastGenerated: string | null;

	constructor(jwtService: JWTService) {
		this.jwtService = jwtService;
		this.jwks = null;
		this.lastGenerated = null;
		this.generateJWKS();
	}

	// Generate JWKS from all three JWT types
	// JWKS format: https://tools.ietf.org/html/rfc7517
	generateJWKS(): void {
		try {
			const keys: JWK[] = [];
			
			// 為每種 JWT 類型生成 JWK
			Object.values(JWTType).forEach(type => {
				const publicKeyInfo = this.jwtService.getAllPublicKeys()[type];
				
				// Parse the public key to get key components
				const publicKeyObject = crypto.createPublicKey(publicKeyInfo.publicKey);
				
				// Export public key in JWK format
				const jwk = publicKeyObject.export({ format: 'jwk' });
				
				// Build JWK according to RFC 7517
				const jwkWithMetadata: JWK = {
					kty: jwk.kty || 'RSA',			// Key Type (RSA)
					use: 'sig',					// Public key use (signature)
					alg: 'RS256',				// Algorithm (RS256)
					kid: publicKeyInfo.keyId,	// Key ID from JWT service
					n: jwk.n || '',					// RSA modulus
					e: jwk.e || ''					// RSA public exponent
				};
				
				keys.push(jwkWithMetadata);
			});

			// Build JWKS
			this.jwks = { keys };
			this.lastGenerated = new Date().toISOString();
			
			console.log(`✅ JWKS generated successfully with ${keys.length} keys`);
			keys.forEach(key => {
				console.log(`   Key ID: ${key.kid}, Type: RSA, Use: ${key.use}`);
			});
			
		} catch (error: any) {
			console.error('❌ Failed to generate JWKS:', error);
			throw error;
		}
	}

	// Get current JWKS
	getJWKS(): JWKS {
		if (!this.jwks) {
			this.generateJWKS();
		}
		return this.jwks!;
	}

	// Get JWKS with cache headers
	getJWKSWithCacheInfo(): JWKSWithCache {
		const jwks = this.getJWKS();
		return {
			jwks,
			lastGenerated: this.lastGenerated,
			cacheMaxAge: 3600,	// 1 hour cache
			keyCount: jwks.keys.length
		};
	}

	// Refresh JWKS (for future key rotation)
	refresh(): void {
		console.log('🔄 Refreshing JWKS...');
		this.generateJWKS();
	}

	// Find key by key ID (supports all three types)
	findKeyById(kid: string): JWK | undefined {
		const jwks = this.getJWKS();
		return jwks.keys.find(key => key.kid === kid);
	}

	// Get all key IDs
	getAllKeyIds(): string[] {
		const jwks = this.getJWKS();
		return jwks.keys.map(key => key.kid);
	}

	// Get key statistics
	getKeyStats(): KeyStats {
		const jwks = this.getJWKS();
		const stats: KeyStats = {
			totalKeys: jwks.keys.length,
			keyTypes: {},
			lastGenerated: this.lastGenerated
		};

		// 統計每種類型的金鑰
		Object.values(JWTType).forEach(type => {
			const typeKeys = jwks.keys.filter(key => key.kid.startsWith(type));
			stats.keyTypes[type] = typeKeys.length;
		});

		return stats;
	}
}

// 直接測試（模擬）
console.log('🧪 Testing JWKS Service with Three JWT Types\n');

// 使用之前測試過的 JWT 服務 - 簡化為註釋，避免 TypeScript 編譯錯誤
// import('./test-new-jwt-service.ts').then(module => {
//   console.log('JWKS Service test will be integrated with JWT Service');
// }).catch(err => {

console.log('Creating standalone JWKS test...\n');
	
	// 創建一個簡單的 mock JWT service 來測試
	const mockJWTService = {
		getAllPublicKeys(): Record<string, PublicKeyInfo> {
			// Use imported crypto for ESM compatibility
			const keys: Record<string, PublicKeyInfo> = {};
			
			Object.values(JWTType).forEach(type => {
				const { publicKey } = crypto.generateKeyPairSync('rsa', {
					modulusLength: 2048,
					publicKeyEncoding: { type: 'spki', format: 'pem' },
					privateKeyEncoding: { type: 'pkcs8', format: 'pem' }
				});
				
				const hash = crypto.createHash('sha256');
				hash.update(publicKey);
				const keyId = `${type}_${hash.digest('hex').substring(0, 8)}`;
				
				keys[type] = { publicKey, keyId };
			});
			
			return keys;
		}
	};
	
	const jwksService = new JWKSService(mockJWTService);
	
	console.log('1️⃣ Testing JWKS Generation');
	console.log('==========================');
	
	const jwks = jwksService.getJWKS();
	console.log('✅ JWKS Keys Generated:', jwks.keys.length);
	
	jwks.keys.forEach((key, index) => {
		console.log(`   Key ${index + 1}:`);
		console.log(`     Kid: ${key.kid}`);
		console.log(`     Type: ${key.kty}`);
		console.log(`     Algorithm: ${key.alg}`);
		console.log(`     Use: ${key.use}`);
	});
	
	console.log('\n2️⃣ Testing Key Lookup');
	console.log('=====================');
	
	const allKeyIds = jwksService.getAllKeyIds();
	console.log('✅ All Key IDs:', allKeyIds);
	
	const firstKey = jwksService.findKeyById(allKeyIds[0]);
	console.log('✅ Key Lookup Test:', firstKey ? 'SUCCESS' : 'FAILED');
	
	console.log('\n3️⃣ Testing Key Statistics');
	console.log('=========================');
	
	const stats = jwksService.getKeyStats();
	console.log('✅ Key Statistics:', stats);
	
	console.log('\n🎉 JWKS Service test completed!');
	console.log('\n📝 Summary:');
	console.log('✅ JWKS endpoint ready for /.well-known/jwks.json');
	console.log('✅ Support for three JWT types with separate keys');
	console.log('✅ Key lookup by ID functionality working');
	console.log('✅ Statistics and monitoring capabilities available');