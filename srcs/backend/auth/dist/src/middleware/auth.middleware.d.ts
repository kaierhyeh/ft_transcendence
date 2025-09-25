/**
 * Enhanced Authentication Middleware (auth.middleware.ts)
 *
 * WHY MIDDLEWARE IS NECESSARY:
 * - Centralized Authentication: Single point for token validation logic
 * - Security Layer: Prevents unauthorized access to protected routes
 * - Request Enhancement: Automatically adds user context to request object
 * - Error Handling: Consistent authentication error responses
 * - Token Management: Handles refresh tokens for USER_SESSION automatically
 * - Type Safety: Ensures proper JWT type validation for different route categories
 *
 * WITHOUT MIDDLEWARE: Each route would need to duplicate authentication logic
 * WITH MIDDLEWARE: Clean separation of concerns, reusable across all routes
 *
 * Supports three JWT types with appropriate validation:
 * - USER_SESSION: Uses validate_and_refresh_Tokens with auto-refresh capability
 * - GAME_SESSION: Simple token validation (no refresh needed)
 * - INTERNAL_ACCESS: Simple token validation (no refresh needed)
 *
 * Usage: authMiddleware(fastify, request, reply, done, {expectedType: 'GAME_SESSION'})
 * Convenience exports: userSessionMiddleware, gameSessionMiddleware, internalAccessMiddleware
 */
interface AuthenticatedRequest {
    cookies?: {
        accessToken?: string;
        refreshToken?: string;
    };
    user?: {
        userId: number;
        jwtType?: string;
        gameId?: string;
        serviceId?: string;
        permissions?: string[];
    };
    log: any;
}
interface AuthenticatedReply {
    code: (statusCode: number) => AuthenticatedReply;
    send: (payload: any) => void;
    clearCookie: (name: string, options: any) => AuthenticatedReply;
}
export declare function authMiddleware(fastify: any, request: AuthenticatedRequest, reply: AuthenticatedReply, done: () => void, options?: {
    expectedType?: 'USER_SESSION' | 'GAME_SESSION' | 'INTERNAL_ACCESS';
}): Promise<void>;
export declare const userSessionMiddleware: (fastify: any, request: any, reply: any, done: any) => Promise<void>;
export declare const gameSessionMiddleware: (fastify: any, request: any, reply: any, done: any) => Promise<void>;
export declare const internalAccessMiddleware: (fastify: any, request: any, reply: any, done: any) => Promise<void>;
export {};
//# sourceMappingURL=auth.middleware.d.ts.map