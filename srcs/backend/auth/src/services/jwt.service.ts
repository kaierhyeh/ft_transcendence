import jwt, { SignOptions, Algorithm } from 'jsonwebtoken';
import { 
  JWTType, 
  JWTPayload, 
  UserSessionPayload, 
  GameSessionPayload, 
  InternalAccessPayload,
  JWTHeader 
} from '../types';

// 使用 require 來避免 TypeScript 模組問題
const crypto = require('crypto');

interface KeyPair {
  privateKey: string;
  publicKey: string;
}

export class JWTService {
  private keys: Record<JWTType, KeyPair> = {} as Record<JWTType, KeyPair>;
  private algorithm: Algorithm = 'RS256';
  private issuer = 'auth-service';
  private audience = 'my-app';

  constructor() {
    this.loadKeys();
  }

  /**
   * Load private keys for each JWT type
   * In production, these should be loaded from /secrets folder
   */
  private loadKeys(): void {
    // TODO: Load from /secrets folder in production
    // For now, generate temporary keys for each type
    this.keys[JWTType.USER_SESSION] = this.generateKeyPair();
    this.keys[JWTType.GAME_SESSION] = this.generateKeyPair(); 
    this.keys[JWTType.INTERNAL_ACCESS] = this.generateKeyPair();

    console.log('🔑 JWT keys loaded for all three types');
  }


  // Generate RSA key pair (temporary - for development)
  private generateKeyPair(): KeyPair {
    const { publicKey, privateKey } = crypto.generateKeyPairSync('rsa', {
      modulusLength: 2048,
      publicKeyEncoding: { type: 'spki', format: 'pem' },
      privateKeyEncoding: { type: 'pkcs8', format: 'pem' }
    });
    
    return { publicKey, privateKey };
  }

  // Generate key ID for a specific JWT type
  private generateKeyId(type: JWTType): string {
    const publicKey = this.keys[type].publicKey;
    const hash = crypto.createHash('sha256');
    hash.update(publicKey);
    return `${type}_${hash.digest('hex').substring(0, 8)}`;
  }

  // Get private key for specific JWT type
  private getPrivateKey(type: JWTType): string {
    return this.keys[type].privateKey;
  }

  // Get public key for specific JWT type
  public getPublicKey(type: JWTType): string {
    return this.keys[type].publicKey;
  }

  // Generate User Session JWT
  public generateUserSessionToken(payload: Omit<UserSessionPayload, 'type' | 'iat' | 'exp' | 'iss' | 'aud'>): string {
    const fullPayload: UserSessionPayload = {
      ...payload,
      type: JWTType.USER_SESSION,
      iss: this.issuer,
    };

    const options: SignOptions = {
      algorithm: this.algorithm,
      expiresIn: '15m',
      keyid: this.generateKeyId(JWTType.USER_SESSION)
    };

    return jwt.sign(fullPayload, this.getPrivateKey(JWTType.USER_SESSION), options);
  }

  // Generate Game Session JWT
  public generateGameSessionToken(payload: Omit<GameSessionPayload, 'type' | 'iat' | 'exp' | 'iss' | 'aud'>): string {
    const fullPayload: GameSessionPayload = {
      ...payload,
      type: JWTType.GAME_SESSION,
      iss: this.issuer,
    };

    const options: SignOptions = {
      algorithm: this.algorithm,
      expiresIn: '2h', // Game sessions last longer
      keyid: this.generateKeyId(JWTType.GAME_SESSION)
    };

    return jwt.sign(fullPayload, this.getPrivateKey(JWTType.GAME_SESSION), options);
  }

  // Generate Internal Access JWT
  public generateInternalAccessToken(payload: Omit<InternalAccessPayload, 'type' | 'iat' | 'exp' | 'iss' | 'aud'>): string {
    const fullPayload: InternalAccessPayload = {
      ...payload,
      type: JWTType.INTERNAL_ACCESS,
      iss: this.issuer,
    };

    const options: SignOptions = {
      algorithm: this.algorithm,
      expiresIn: '1h', // Internal tokens have medium duration
      keyid: this.generateKeyId(JWTType.INTERNAL_ACCESS)
    };

    return jwt.sign(fullPayload, this.getPrivateKey(JWTType.INTERNAL_ACCESS), options);
  }

  // Verify any JWT token and return payload with type information
  public verifyToken(token: string): { valid: boolean; payload?: JWTPayload; error?: string } {
    try {
      // First decode to get the header and determine the key type
      const decoded = jwt.decode(token, { complete: true }) as any;
      
      if (!decoded || typeof decoded === 'string') {
        return { valid: false, error: 'Invalid token format' };
      }

      const header = decoded.header as JWTHeader;
      const payload = decoded.payload as JWTPayload;

      if (!payload.type || !Object.values(JWTType).includes(payload.type)) {
        return { valid: false, error: 'Invalid or missing JWT type' };
      }

      // Verify with the appropriate public key
      const publicKey = this.getPublicKey(payload.type);
      const verifiedPayload = jwt.verify(token, publicKey, {
        algorithms: [this.algorithm] as Algorithm[],
        issuer: this.issuer,
        audience: this.audience
      }) as JWTPayload;

      return { valid: true, payload: verifiedPayload };
    } catch (error: any) {
      return { 
        valid: false, 
        error: error?.message || 'Token verification failed' 
      };
    }
  }

  // Get all public keys for JWKS endpoint
  public getAllPublicKeys(): Record<JWTType, { publicKey: string; keyId: string }> {
    const result = {} as Record<JWTType, { publicKey: string; keyId: string }>;
    
    Object.values(JWTType).forEach(type => {
      result[type] = {
        publicKey: this.getPublicKey(type),
        keyId: this.generateKeyId(type)
      };
    });

    return result;
  }

  // Decode token without verification (for debugging)
  public decodeToken(token: string): any {
    return jwt.decode(token, { complete: true });
  }
}

export default new JWTService();