export declare enum JWTType {
    USER_SESSION = "USER_SESSION",
    GAME_SESSION = "GAME_SESSION",
    INTERNAL_ACCESS = "INTERNAL_ACCESS"
}
export interface JWTPayload {
    type: JWTType;
    iat?: number;
    exp?: number;
    iss?: string;
    aud?: string;
    userId?: number;
    gameId?: string;
    serviceId?: string;
    permissions?: string[];
}
export interface UserSessionPayload extends JWTPayload {
    type: JWTType.USER_SESSION;
    userId: number;
    username: string;
    roles?: string[];
}
export interface GameSessionPayload extends JWTPayload {
    type: JWTType.GAME_SESSION;
    userId: number;
    gameId: string;
    gameMode: string;
    permissions: string[];
}
export interface InternalAccessPayload extends JWTPayload {
    type: JWTType.INTERNAL_ACCESS;
    serviceId: string;
    serviceName: string;
    permissions: string[];
    accessLevel: 'read' | 'write' | 'admin';
}
export interface JWTHeader {
    alg: string;
    typ: string;
    kid?: string;
}
//# sourceMappingURL=types.d.ts.map