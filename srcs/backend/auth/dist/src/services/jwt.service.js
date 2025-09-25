import jwt from 'jsonwebtoken';
import { JWTType } from '../types';
// 使用 require 來避免 TypeScript 模組問題
const crypto = require('crypto');
export class JWTService {
    constructor() {
        this.keys = {};
        this.algorithm = 'RS256';
        this.issuer = 'auth-service';
        this.audience = 'my-app';
        this.loadKeys();
    }
    /**
     * Load private keys for each JWT type
     * In production, these should be loaded from /secrets folder
     */
    loadKeys() {
        // TODO: Load from /secrets folder in production
        // For now, generate temporary keys for each type
        this.keys[JWTType.USER_SESSION] = this.generateKeyPair();
        this.keys[JWTType.GAME_SESSION] = this.generateKeyPair();
        this.keys[JWTType.INTERNAL_ACCESS] = this.generateKeyPair();
        console.log('🔑 JWT keys loaded for all three types');
    }
    // Generate RSA key pair (temporary - for development)
    generateKeyPair() {
        const { publicKey, privateKey } = crypto.generateKeyPairSync('rsa', {
            modulusLength: 2048,
            publicKeyEncoding: { type: 'spki', format: 'pem' },
            privateKeyEncoding: { type: 'pkcs8', format: 'pem' }
        });
        return { publicKey, privateKey };
    }
    // Generate key ID for a specific JWT type
    generateKeyId(type) {
        const publicKey = this.keys[type].publicKey;
        const hash = crypto.createHash('sha256');
        hash.update(publicKey);
        return `${type}_${hash.digest('hex').substring(0, 8)}`;
    }
    // Get private key for specific JWT type
    getPrivateKey(type) {
        return this.keys[type].privateKey;
    }
    // Get public key for specific JWT type
    getPublicKey(type) {
        return this.keys[type].publicKey;
    }
    // Generate User Session JWT
    generateUserSessionToken(payload) {
        const fullPayload = {
            ...payload,
            type: JWTType.USER_SESSION,
            iss: this.issuer,
            aud: this.audience
        };
        const options = {
            algorithm: this.algorithm,
            expiresIn: '15m',
            keyid: this.generateKeyId(JWTType.USER_SESSION)
        };
        return jwt.sign(fullPayload, this.getPrivateKey(JWTType.USER_SESSION), options);
    }
    // Generate Game Session JWT
    generateGameSessionToken(payload) {
        const fullPayload = {
            ...payload,
            type: JWTType.GAME_SESSION,
            iss: this.issuer,
            aud: this.audience
        };
        const options = {
            algorithm: this.algorithm,
            expiresIn: '2h', // Game sessions last longer
            keyid: this.generateKeyId(JWTType.GAME_SESSION)
        };
        return jwt.sign(fullPayload, this.getPrivateKey(JWTType.GAME_SESSION), options);
    }
    // Generate Internal Access JWT
    generateInternalAccessToken(payload) {
        const fullPayload = {
            ...payload,
            type: JWTType.INTERNAL_ACCESS,
            iss: this.issuer,
            aud: this.audience
        };
        const options = {
            algorithm: this.algorithm,
            expiresIn: '1h', // Internal tokens have medium duration
            keyid: this.generateKeyId(JWTType.INTERNAL_ACCESS)
        };
        return jwt.sign(fullPayload, this.getPrivateKey(JWTType.INTERNAL_ACCESS), options);
    }
    // Verify any JWT token and return payload with type information
    verifyToken(token) {
        try {
            // First decode to get the header and determine the key type
            const decoded = jwt.decode(token, { complete: true });
            if (!decoded || typeof decoded === 'string') {
                return { valid: false, error: 'Invalid token format' };
            }
            const header = decoded.header;
            const payload = decoded.payload;
            if (!payload.type || !Object.values(JWTType).includes(payload.type)) {
                return { valid: false, error: 'Invalid or missing JWT type' };
            }
            // Verify with the appropriate public key
            const publicKey = this.getPublicKey(payload.type);
            const verifiedPayload = jwt.verify(token, publicKey, {
                algorithms: [this.algorithm],
                issuer: this.issuer,
                audience: this.audience
            });
            return { valid: true, payload: verifiedPayload };
        }
        catch (error) {
            return {
                valid: false,
                error: error?.message || 'Token verification failed'
            };
        }
    }
    // Get all public keys for JWKS endpoint
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
    // Decode token without verification (for debugging)
    decodeToken(token) {
        return jwt.decode(token, { complete: true });
    }
}
export default new JWTService();
//# sourceMappingURL=jwt.service.js.map