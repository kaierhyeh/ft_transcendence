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
import authService from '../services/auth.service.js';
import authUtils from '../utils/auth.utils.js';
import { CONFIG } from '../config.js';
import { JWTType } from '../types.js';
// Fastify middleware for three JWT types with intelligent routing
export async function authMiddleware(fastify, request, reply, done, options) {
    const expectedType = options?.expectedType || 'USER_SESSION';
    const accessToken = request.cookies?.accessToken;
    const refreshToken = request.cookies?.refreshToken;
    // All JWT types require at least an access token (USER_SESSION also uses refresh token for auto-refresh)
    if (!accessToken) {
        fastify.log.warn(`No access token provided for ${expectedType}.`);
        return reply.code(401).send({ error: `No ${expectedType.toLowerCase()} token provided.` });
    }
    try {
        // Route to appropriate validation based on expected type
        switch (expectedType) {
            case 'USER_SESSION':
                return await validateUserSession(fastify, request, reply, done, accessToken, refreshToken);
            case 'GAME_SESSION':
                return await validateGameSession(fastify, request, reply, done, accessToken);
            case 'INTERNAL_ACCESS':
                return await validateInternalAccess(fastify, request, reply, done, accessToken);
            default:
                fastify.log.error(`Unknown JWT type: ${expectedType}`);
                return reply.code(500).send({ error: 'Invalid authentication type configuration.' });
        }
    }
    catch (error) {
        request.log.error(error, 'Auth middleware error.');
        reply.code(500).send({ success: false, error: "Internal authentication error." });
    }
}
// USER_SESSION validation using validate_and_refresh_Tokens
async function validateUserSession(fastify, request, reply, done, accessToken, refreshToken) {
    const result = await authService.validate_and_refresh_Tokens(fastify, accessToken, refreshToken || '');
    if (!result.success) {
        request.log.warn('Invalid or expired user session tokens.');
        return reply
            .code(401)
            .clearCookie('accessToken', CONFIG.COOKIE.OPTIONS)
            .clearCookie('refreshToken', CONFIG.COOKIE.OPTIONS)
            .send({ error: 'Invalid or expired user session.' });
    }
    // If access token was refreshed, update cookie
    if (result.newAccessToken) {
        request.log.info('User access token refreshed.');
        authUtils.ft_setCookie(reply, result.newAccessToken, 15);
    }
    // Store user info with JWT type
    request.user = {
        userId: result.userId,
        jwtType: 'USER_SESSION'
    };
    done();
}
// GAME_SESSION validation for game-specific routes (simple validation, no refresh needed)
async function validateGameSession(fastify, request, reply, done, gameToken) {
    const validation = await authService.validateToken(gameToken, JWTType.GAME_SESSION);
    if (!validation.valid) {
        fastify.log.warn(`Game session validation failed: ${validation.error}`);
        return reply.code(401).send({
            error: 'Invalid or expired game session.',
            details: validation.error
        });
    }
    // Store game session info
    request.user = {
        userId: validation.payload?.userId,
        jwtType: 'GAME_SESSION',
        gameId: validation.payload?.gameId
    };
    done();
}
// INTERNAL_ACCESS validation for service-to-service routes (simple validation, no refresh needed)
async function validateInternalAccess(fastify, request, reply, done, internalToken) {
    const validation = await authService.validateToken(internalToken, JWTType.INTERNAL_ACCESS);
    if (!validation.valid) {
        fastify.log.warn(`Internal access validation failed: ${validation.error}`);
        return reply.code(401).send({
            error: 'Invalid service access token.',
            details: validation.error
        });
    }
    // Store service info
    request.user = {
        userId: 0, // Services don't have user IDs
        jwtType: 'INTERNAL_ACCESS',
        serviceId: validation.payload?.serviceId,
        permissions: validation.payload?.permissions || []
    };
    done();
}
// Convenience middleware creators for specific JWT types
export const userSessionMiddleware = (fastify, request, reply, done) => authMiddleware(fastify, request, reply, done, { expectedType: 'USER_SESSION' });
export const gameSessionMiddleware = (fastify, request, reply, done) => authMiddleware(fastify, request, reply, done, { expectedType: 'GAME_SESSION' });
export const internalAccessMiddleware = (fastify, request, reply, done) => authMiddleware(fastify, request, reply, done, { expectedType: 'INTERNAL_ACCESS' });
//# sourceMappingURL=auth.middleware.js.map