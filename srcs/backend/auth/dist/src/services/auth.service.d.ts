import jwt from 'jsonwebtoken';
import { JWTType, JWTPayload } from '../types.js';
export type { JWTType, JWTPayload } from '../types.js';
export interface TokenValidationResult {
    valid: boolean;
    payload?: JWTPayload;
    expired?: boolean;
    blacklisted?: boolean;
    error?: string;
}
export interface TokenPair {
    accessToken: string;
    refreshToken: string;
}
export interface ValidationResult {
    success: boolean;
    userId?: number;
    newAccessToken?: string;
    reason?: string;
}
/**
 * Enhanced Authentication Service supporting three JWT types:
 * - USER_SESSION: Traditional user authentication (access + refresh tokens)
 * - GAME_SESSION: Game-specific temporary sessions
 * - INTERNAL_ACCESS: Service-to-service communication
 */
export declare class AuthService {
    generateTokens(userId: number): Promise<TokenPair>;
    generateTempToken(payload: any, type?: string, expiresInSeconds?: number): Promise<string>;
    verifyTempToken(token: string): Promise<{
        valid: boolean;
        payload: string | jwt.JwtPayload;
        error?: undefined;
    } | {
        valid: boolean;
        error: any;
        payload?: undefined;
    }>;
    validateToken(token: string, expectedType: JWTType): Promise<TokenValidationResult>;
    validate_and_refresh_Tokens(fastify: any, accessToken: string, refreshToken: string): Promise<{
        success: boolean;
        userId: number;
        reason?: undefined;
        newAccessToken?: undefined;
    } | {
        success: boolean;
        reason: string;
        userId?: undefined;
        newAccessToken?: undefined;
    } | {
        success: boolean;
        userId: number | undefined;
        newAccessToken: string | undefined;
        reason?: undefined;
    }>;
    refreshAccessToken(fastify: any, refreshToken: string, oldAccessToken?: string): Promise<{
        success: boolean;
        reason: string;
        userId?: undefined;
        newAccessToken?: undefined;
    } | {
        success: boolean;
        userId: number;
        newAccessToken: string;
        reason?: undefined;
    }>;
    revokeTokens(userId: number): Promise<boolean>;
    blacklistToken(token: string): Promise<boolean>;
}
declare const _default: AuthService;
export default _default;
//# sourceMappingURL=auth.service.d.ts.map