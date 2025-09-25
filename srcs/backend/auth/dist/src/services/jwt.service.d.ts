import { JWTType, JWTPayload, UserSessionPayload, GameSessionPayload, InternalAccessPayload } from '../types';
export declare class JWTService {
    private keys;
    private algorithm;
    private issuer;
    private audience;
    constructor();
    /**
     * Load private keys for each JWT type
     * In production, these should be loaded from /secrets folder
     */
    private loadKeys;
    private generateKeyPair;
    private generateKeyId;
    private getPrivateKey;
    getPublicKey(type: JWTType): string;
    generateUserSessionToken(payload: Omit<UserSessionPayload, 'type' | 'iat' | 'exp' | 'iss' | 'aud'>): string;
    generateGameSessionToken(payload: Omit<GameSessionPayload, 'type' | 'iat' | 'exp' | 'iss' | 'aud'>): string;
    generateInternalAccessToken(payload: Omit<InternalAccessPayload, 'type' | 'iat' | 'exp' | 'iss' | 'aud'>): string;
    verifyToken(token: string): {
        valid: boolean;
        payload?: JWTPayload;
        error?: string;
    };
    getAllPublicKeys(): Record<JWTType, {
        publicKey: string;
        keyId: string;
    }>;
    decodeToken(token: string): any;
}
declare const _default: JWTService;
export default _default;
//# sourceMappingURL=jwt.service.d.ts.map