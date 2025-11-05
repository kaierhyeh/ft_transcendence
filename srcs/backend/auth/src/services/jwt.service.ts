import jwt, { SignOptions, Algorithm } from 'jsonwebtoken';
import { 
  JWTType, 
  JWTPayload, 
  UserSessionPayload, 
  GameSessionPayload, 
  InternalAccessPayload,
  JWTHeader 
} from '../types';
import { CONFIG } from '../config';
import redis from '../clients/RedisClient';
import jwksService from './jwks.service';
import authUtils from '../utils/auth.utils';

// 使用 require 來避免 TypeScript 模組問題
const crypto = require('crypto');

interface KeyPair {
  privateKey: string;
  publicKey: string;
}

export interface TokenPair {
	accessToken: string;
	refreshToken: string;
}

export class JWTService {
  private keys: Record<JWTType, KeyPair> = {} as Record<JWTType, KeyPair>;

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
      iss: CONFIG.JWT.USER.ISSUER,
    };

    const options: SignOptions = {
      algorithm: CONFIG.JWT.USER.ALGORITHM,
      expiresIn: CONFIG.JWT.USER.ACCESS_TOKEN_EXPIRY as any,
      keyid: this.generateKeyId(JWTType.USER_SESSION)
    };

    return jwt.sign(fullPayload, this.getPrivateKey(JWTType.USER_SESSION), options);
  }

  // Generate Game Session JWT
  public generateGameSessionToken(payload: Omit<GameSessionPayload, 'type' | 'iat' | 'exp' | 'iss' | 'aud'>): string {
    const fullPayload: GameSessionPayload = {
      ...payload,
      type: JWTType.GAME_SESSION,
      iss: CONFIG.JWT.GAME.ISSUER,
    };

    const options: SignOptions = {
      algorithm: CONFIG.JWT.GAME.ALGORITHM,
      expiresIn: CONFIG.JWT.GAME.ACCESS_TOKEN_EXPIRY as any, // Game sessions last longer
      keyid: this.generateKeyId(JWTType.GAME_SESSION)
    };

    return jwt.sign(fullPayload, this.getPrivateKey(JWTType.GAME_SESSION), options);
  }

  // Generate Internal Access JWT
  public generateInternalAccessToken(payload: Omit<InternalAccessPayload, 'type' | 'iat' | 'exp' | 'iss' | 'aud'>): string {
    const fullPayload: InternalAccessPayload = {
      ...payload,
      type: JWTType.INTERNAL_ACCESS,
      iss: CONFIG.JWT.INTERNAL.ISSUER,
    };

    const options: SignOptions = {
      algorithm: CONFIG.JWT.INTERNAL.ALGORITHM,
      expiresIn: CONFIG.JWT.INTERNAL.ACCESS_TOKEN_EXPIRY as any, // Internal tokens have medium duration
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
      
      // Get the appropriate algorithm based on JWT type
      let algorithm: Algorithm;
      let expectedIssuer: string;
      
      switch (payload.type) {
        case JWTType.USER_SESSION:
          algorithm = CONFIG.JWT.USER.ALGORITHM;
          expectedIssuer = CONFIG.JWT.USER.ISSUER;
          break;
        case JWTType.GAME_SESSION:
          algorithm = CONFIG.JWT.GAME.ALGORITHM;
          expectedIssuer = CONFIG.JWT.GAME.ISSUER;
          break;
        case JWTType.INTERNAL_ACCESS:
          algorithm = CONFIG.JWT.INTERNAL.ALGORITHM;
          expectedIssuer = CONFIG.JWT.INTERNAL.ISSUER;
          break;
        default:
          return { valid: false, error: 'Unknown JWT type' };
      }
      
      const verifiedPayload = jwt.verify(token, publicKey, {
        algorithms: [algorithm],
        issuer: expectedIssuer
        // Note: No audience verification as requested
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

  async generateTempToken(payload: any, type = "generic", expiresInSeconds = 300) {
    const token = jwt.sign({ ...payload, type }, CONFIG.JWT.USER.TEMP_SECRET, {
      expiresIn: expiresInSeconds
    });

    await redis.setex(`temp_${token}`, expiresInSeconds, 'valid');

    return token;
	}

  // Generate a new access token and refresh token for the user using the userId and JWT manager
	// The access token is valid for 15 minutes and the refresh token for 7 days
	// The tokens are stored in Redis with the userId as key
	// The access token is used to authenticate the user and the refresh token is used to generate a new access token
	async generateTokens(userId: number): Promise<TokenPair> {
		// Check if tokens already exist for this user
		const [existingAccessToken, existingRefreshToken] = await Promise.all([
			redis.get(`access_${userId}`),
			redis.get(`refresh_${userId}`)
		]);

		let accessToken = null;
		let refreshToken = null;

		// Handle existing access token
		if (existingAccessToken) {
			try {
				// Verify if the token is still valid using RSA public key
				jwt.verify(existingAccessToken, CONFIG.JWT.USER.PUBLIC_KEY, { algorithms: [CONFIG.JWT.USER.ALGORITHM] });
				accessToken = existingAccessToken;
			} catch (error) {
				// If invalid, blacklist it and prepare to generate a new one
				await this.blacklistToken(existingAccessToken);
			}
		}

		// Handle existing refresh token
		if (existingRefreshToken) {
			try {
				// Verify the token is still valid using RSA public key
				jwt.verify(existingRefreshToken, CONFIG.JWT.USER.PUBLIC_KEY, { algorithms: [CONFIG.JWT.USER.ALGORITHM] });
				refreshToken = existingRefreshToken;
			} catch (error) {
				// If invalid, blacklist it and prepare to generate a new one
				await this.blacklistToken(existingRefreshToken);
			}
		}

		// Generate new access token if needed
		if (!accessToken) {
			const keyId = jwksService.getKeyIdForType(JWTType.USER_SESSION);
			if (!keyId) {
				throw new Error('USER_SESSION key ID not available in JWKS service');
			}
			
			const signOptions: SignOptions = {
				algorithm: CONFIG.JWT.USER.ALGORITHM,
				expiresIn: CONFIG.JWT.USER.ACCESS_TOKEN_EXPIRY as any,
				keyid: keyId
			};
			accessToken = jwt.sign({ 
				sub: userId.toString(),  // JWT standard: sub as string
				type: JWTType.USER_SESSION,  // Proper JWT type
				token_type: 'access',  // Distinguish access vs refresh
				iss: CONFIG.JWT.USER.ISSUER
			}, CONFIG.JWT.USER.PRIVATE_KEY!, signOptions);
			// Convert expiry to seconds for Redis using centralized parser
			const expiryInSeconds = authUtils.parseDurationToSeconds(CONFIG.JWT.USER.ACCESS_TOKEN_EXPIRY);
			await redis.setex(`access_${userId}`, expiryInSeconds, accessToken);
		}

		// Generate new refresh token if needed
		if (!refreshToken) {
			const keyId = jwksService.getKeyIdForType(JWTType.USER_SESSION);
			if (!keyId) {
				throw new Error('USER_SESSION key ID not available in JWKS service');
			}
			
			const signOptions: SignOptions = {
				algorithm: CONFIG.JWT.USER.ALGORITHM,
				expiresIn: CONFIG.JWT.USER.REFRESH_TOKEN_EXPIRY as any,
				keyid: keyId
			};
			refreshToken = jwt.sign({ 
				sub: userId.toString(),  // JWT standard: sub as string
				type: JWTType.USER_SESSION,  // Proper JWT type
				token_type: 'refresh',  // Distinguish access vs refresh
				iss: CONFIG.JWT.USER.ISSUER
			}, CONFIG.JWT.USER.PRIVATE_KEY!, signOptions);
			// Convert expiry to seconds for Redis using centralized parser
			const expiryInSeconds = authUtils.parseDurationToSeconds(CONFIG.JWT.USER.REFRESH_TOKEN_EXPIRY);
			await redis.setex(`refresh_${userId}`, expiryInSeconds, refreshToken);
		}
		
		return { accessToken, refreshToken };
	}

  // Blacklist a token by adding it to the Redis blacklist with its remaining duration
	async blacklistToken(token: string) {
		try {
			// Get the decoded token to check its expiry time
			const decoded = jwt.decode(token) as { exp: number } | null;
			if (!decoded) return false;

			// Calculate the remaining duration of the token
			const expiryTime = decoded.exp;
			const now = Math.floor(Date.now() / 1000);
			const timeRemaining = Math.max(expiryTime - now, 0);

			// Add to the blacklist with the exact remaining duration
			if (timeRemaining > 0) {
				await redis.setex(`blacklist_${token}`, timeRemaining, 'true');
				return true;
			}

			return false;
		} catch (error) {
			console.error('Token blacklisting error:', error);
			return false;
		}
	}

}

export default new JWTService();