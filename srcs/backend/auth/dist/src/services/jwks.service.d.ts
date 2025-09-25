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
export declare class JWKSService {
    private jwks;
    private lastGenerated;
    private authService;
    constructor();
    setAuthService(authService: any): Promise<void>;
    generateJWKS(): Promise<void>;
    private createJWKFromPublicKey;
    private generateLegacyJWKS;
    getJWKS(): Promise<JWKS>;
    getJWKSWithCacheInfo(): Promise<JWKSWithCache>;
    refresh(): Promise<void>;
    findKeyById(kid: string): JWK | undefined;
    getCurrentKeyId(): string;
    private generateKeyId;
    getKeyIdForType(jwtType: string): string | null;
}
declare const _default: JWKSService;
export default _default;
//# sourceMappingURL=jwks.service.d.ts.map