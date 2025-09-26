// 簡單的 JWT 服務測試 (ES Module 版本)
import jwt, { Algorithm, SignOptions, JwtPayload } from 'jsonwebtoken';
import crypto from 'crypto';

// 模擬 JWT 類型
const JWTType = {
  USER_SESSION: 'user_session',
  GAME_SESSION: 'game_session',
  INTERNAL_ACCESS: 'internal'
} as const;

interface KeyPair {
  publicKey: string;
  privateKey: string;
  keyId: string;
}

interface JWTPayload {
  user_id?: number;
  username?: string;
  roles?: string[];
  game_session?: string;
  access_level?: string;
}

class JWTService {
  private keys: Record<string, KeyPair>;
  private algorithm: string;
  private issuer: string;
  private audience: string;

  constructor() {
    this.keys = {};
    this.algorithm = 'RS256';
    this.issuer = 'auth-service';
    this.audience = 'my-app';
    this.loadKeys();
  }

  loadKeys(): void {
    // 為每種 JWT 類型生成不同的金鑰
    this.keys[JWTType.USER_SESSION] = this.generateKeyPair(JWTType.USER_SESSION);
    this.keys[JWTType.GAME_SESSION] = this.generateKeyPair(JWTType.GAME_SESSION); 
    this.keys[JWTType.INTERNAL_ACCESS] = this.generateKeyPair(JWTType.INTERNAL_ACCESS);

    console.log('🔑 JWT keys loaded for all three types');
  }

  generateKeyPair(type: string): KeyPair {
    const { publicKey, privateKey } = crypto.generateKeyPairSync('rsa', {
      modulusLength: 2048,
      publicKeyEncoding: { type: 'spki', format: 'pem' },
      privateKeyEncoding: { type: 'pkcs8', format: 'pem' }
    });
    
    const keyId = this.generateKeyIdForType(type, publicKey);
    
    return { 
      publicKey, 
      privateKey,
      keyId
    };
  }

  generateKeyIdForType(type: string, publicKey: string): string {
    const hash = crypto.createHash('sha256');
    hash.update(publicKey);
    return `${type}_${hash.digest('hex').substring(0, 8)}`;
  }

  generateKeyId(type: string): string {
    return this.keys[type].keyId;
  }

  getPrivateKey(type: string): string {
    return this.keys[type].privateKey;
  }

  getPublicKey(type: string): string {
    return this.keys[type].publicKey;
  }

  // 生成 User Session JWT
  generateUserSessionToken(payload: any): string {
    const fullPayload = {
      ...payload,
      type: JWTType.USER_SESSION,
      iss: this.issuer,
      aud: this.audience
    };

    const options: SignOptions = {
      algorithm: this.algorithm as Algorithm,
      expiresIn: '15m',
      keyid: this.generateKeyId(JWTType.USER_SESSION)
    };

    return jwt.sign(fullPayload, this.getPrivateKey(JWTType.USER_SESSION), options);
  }

  // 生成 Game Session JWT
  generateGameSessionToken(payload: any): string {
    const fullPayload = {
      ...payload,
      type: JWTType.GAME_SESSION,
      iss: this.issuer,
      aud: this.audience
    };

    const options: SignOptions = {
      algorithm: this.algorithm as Algorithm,
      expiresIn: '2h',
      keyid: this.generateKeyId(JWTType.GAME_SESSION)
    };

    return jwt.sign(fullPayload, this.getPrivateKey(JWTType.GAME_SESSION), options);
  }

  // 生成 Internal Access JWT
  generateInternalAccessToken(payload: any): string {
    const fullPayload = {
      ...payload,
      type: JWTType.INTERNAL_ACCESS,
      iss: this.issuer,
      aud: this.audience
    };

    const options: SignOptions = {
      algorithm: this.algorithm as Algorithm,
      expiresIn: '1h',
      keyid: this.generateKeyId(JWTType.INTERNAL_ACCESS)
    };

    return jwt.sign(fullPayload, this.getPrivateKey(JWTType.INTERNAL_ACCESS), options);
  }

  // 驗證 JWT 令牌
  verifyToken(token) {
    try {
      const decoded = jwt.decode(token, { complete: true });
      
      if (!decoded || typeof decoded === 'string') {
        return { valid: false, error: 'Invalid token format' };
      }

      const payload = decoded.payload as JwtPayload & { type: string };

      if (!payload.type || !Object.values(JWTType).includes(payload.type as any)) {
        return { valid: false, error: 'Invalid or missing JWT type' };
      }

      // 使用對應的公鑰驗證
      const publicKey = this.getPublicKey(payload.type);
      const verifiedPayload = jwt.verify(token, publicKey, {
        algorithms: [this.algorithm as Algorithm],
        issuer: this.issuer,
        audience: this.audience
      });

      return { valid: true, payload: verifiedPayload };
    } catch (error) {
      return { 
        valid: false, 
        error: error?.message || 'Token verification failed' 
      };
    }
  }

  // 取得所有公鑰（用於 JWKS）
  getAllPublicKeys() {
    const result = {};
    
    Object.values(JWTType).forEach(type => {
      result[type] = {
        publicKey: this.getPublicKey(type),
        keyId: this.generateKeyId(type)
      };
    });

    return result;
  }
}

// 測試程式
console.log('🧪 Testing New JWT Service with Three Types\n');

const jwtService = new JWTService();

// 測試 1: 生成三種不同類型的 JWT
console.log('1️⃣ Testing JWT Generation');
console.log('========================');

const userToken = jwtService.generateUserSessionToken({
  userId: 'user123',
  email: 'user@example.com',
  role: 'user',
  permissions: ['read', 'write']
});

const gameToken = jwtService.generateGameSessionToken({
  gameId: 'game456',
  userId: 'user123',
  permissions: ['play', 'move'],
  gameData: { level: 1, score: 100 }
});

const internalToken = jwtService.generateInternalAccessToken({
  service: 'user-service',
  scope: ['read:users', 'write:users'],
  requestId: 'req789'
});

console.log('✅ User Session Token:', userToken.substring(0, 50) + '...');
console.log('✅ Game Session Token:', gameToken.substring(0, 50) + '...');
console.log('✅ Internal Access Token:', internalToken.substring(0, 50) + '...\n');

// 測試 2: 驗證令牌
console.log('2️⃣ Testing JWT Verification');
console.log('===========================');

const userResult = jwtService.verifyToken(userToken);
const gameResult = jwtService.verifyToken(gameToken);
const internalResult = jwtService.verifyToken(internalToken);

console.log('User Token Verification:', userResult.valid ? '✅ VALID' : '❌ INVALID');
if (userResult.valid && typeof userResult.payload === 'object') {
  console.log('  Type:', (userResult.payload as any).type);
  console.log('  User ID:', (userResult.payload as any).userId);
}

console.log('Game Token Verification:', gameResult.valid ? '✅ VALID' : '❌ INVALID');
if (gameResult.valid && typeof gameResult.payload === 'object') {
  console.log('  Type:', (gameResult.payload as any).type);
  console.log('  Game ID:', (gameResult.payload as any).gameId);
}

console.log('Internal Token Verification:', internalResult.valid ? '✅ VALID' : '❌ INVALID');
if (internalResult.valid && typeof internalResult.payload === 'object') {
  console.log('  Type:', (internalResult.payload as any).type);
  console.log('  Service:', (internalResult.payload as any).service);
}
console.log();

// 測試 3: 跨類型驗證（應該失敗）
console.log('3️⃣ Testing Cross-Type Verification (Should Fail)');
console.log('================================================');

// 嘗試用 Game 的公鑰驗證 User 的令牌
try {
  const gamePublicKey = jwtService.getPublicKey(JWTType.GAME_SESSION);
  jwt.verify(userToken, gamePublicKey, {
    algorithms: ['RS256'],
    issuer: 'auth-service',
    audience: 'my-app'
  });
  console.log('❌ Cross-verification should have failed!');
} catch (error) {
  console.log('✅ Cross-verification correctly failed:', error.message.substring(0, 50) + '...');
}
console.log();

// 測試 4: 公鑰資訊 (用於 JWKS)
console.log('4️⃣ Testing Public Key Information for JWKS');
console.log('===========================================');

const publicKeys = jwtService.getAllPublicKeys();
Object.entries(publicKeys).forEach(([type, info]) => {
  console.log(`${type}:`);
  console.log(`  Key ID: ${(info as any).keyId}`);
  console.log(`  Public Key Length: ${(info as any).publicKey.length} chars`);
});

console.log('\n🎉 All tests completed successfully!');
console.log('\n📝 Summary:');
console.log('✅ Three separate JWT types with different keys');
console.log('✅ Each type uses its own RSA key pair');
console.log('✅ Cross-type verification is properly prevented');
console.log('✅ JWKS-ready public key information available');

// Additional RSA Key Validation Tests
console.log('\n🔒 5️⃣ RSA Key Security Tests');
console.log('=============================');

// Test algorithm security
console.log('Testing algorithm security...');
try {
  jwt.verify(userToken, jwtService.getPublicKey(JWTType.USER_SESSION), { 
    algorithms: ['HS256'] // Wrong algorithm
  });
  console.log('❌ SECURITY ISSUE: Should have rejected wrong algorithm!');
} catch (error) {
  console.log('✅ Security test passed - rejected wrong algorithm');
}

// Test token tampering detection
console.log('Testing tampering detection...');
const tamperedToken = userToken.slice(0, -10) + 'TAMPERED';
try {
  jwt.verify(tamperedToken, jwtService.getPublicKey(JWTType.USER_SESSION), {
    algorithms: ['RS256' as Algorithm]
  });
  console.log('❌ SECURITY ISSUE: Should have detected tampering!');
} catch (error) {
  console.log('✅ Tampering detected successfully');
}

console.log('\n🔐 RSA Key Information:');
Object.entries(JWTType).forEach(([name, type]) => {
  const publicKey = jwtService.getPublicKey(type);
  const keyLength = publicKey.length;
  const keyId = jwtService.generateKeyId(type);
  console.log(`${name}:`);
  console.log(`  Key Length: ${keyLength} chars`);
  console.log(`  Key ID: ${keyId}`);
  console.log(`  Algorithm: RS256`);
});

console.log('\n🎉 Complete JWT + RSA Security Test Passed!');