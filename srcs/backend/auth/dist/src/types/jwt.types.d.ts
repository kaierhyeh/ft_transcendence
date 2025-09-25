export declare enum JWTType {
    USER_SESSION = "user_session",
    GAME_SESSION = "game_session",
    INTERNAL_ACCESS = "internal"
}
/**
 * Base JWT payload interface containing standard JWT claims
 * Payload: The data portion of a JWT that contains the claims (user info, permissions, etc.)
 * Based on RFC 7519 - JSON Web Token (JWT) specification
 */
export interface BaseJWTPayload {
    iat?: number;
    exp?: number;
    iss?: string;
    aud?: string;
    sub?: string;
    jti?: string;
    type: JWTType;
}
export interface UserSessionPayload extends BaseJWTPayload {
    type: JWTType.USER_SESSION;
    userId: string;
    email: string;
    role: string;
    permissions?: string[];
}
export interface GameSessionPayload extends BaseJWTPayload {
    type: JWTType.GAME_SESSION;
    gameId: string;
    userId: string;
    permissions: string[];
    gameData?: any;
}
export interface InternalAccessPayload extends BaseJWTPayload {
    type: JWTType.INTERNAL_ACCESS;
    service: string;
    scope: string[];
    requestId?: string;
}
export type JWTPayload = UserSessionPayload | GameSessionPayload | InternalAccessPayload;
export interface JWTHeader {
    alg: string;
    typ: string;
    kid: string;
}
//# sourceMappingURL=jwt.types.d.ts.map