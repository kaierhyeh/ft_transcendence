// TODO - this file should be removed if we are sure we don't need it anymore

// /**
//  * Enhanced Authentication Middleware (auth.middleware.ts)
//  * 
//  * WHY MIDDLEWARE IS NECESSARY:
//  * - Centralized Authentication: Single point for token validation logic
//  * - Security Layer: Prevents unauthorized access to protected routes
//  * - Request Enhancement: Automatically adds user context to request object
//  * - Error Handling: Consistent authentication error responses
//  * - Token Management: Handles refresh tokens for USER_SESSION automatically
//  * - Type Safety: Ensures proper JWT type validation for different route categories
//  * 
//  * WITHOUT MIDDLEWARE: Each route would need to duplicate authentication logic
//  * WITH MIDDLEWARE: Clean separation of concerns, reusable across all routes
//  * 
//  * Supports three JWT types with appropriate validation:
//  * - USER_SESSION: Uses validate_and_refresh_Tokens with auto-refresh capability
//  * - GAME_SESSION: Simple token validation (no refresh needed)
//  * - INTERNAL_ACCESS: Simple token validation (no refresh needed)
//  * 
//  * Usage: authMiddleware(fastify, request, reply, done, {expectedType: 'GAME_SESSION'})
//  * Convenience exports: userSessionMiddleware, gameSessionMiddleware, internalAccessMiddleware
//  */

// import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
// import authService from '../services/auth.service';
// import authUtils from '../utils/auth.utils';
// import { JWTType, UserSessionPayload, GameSessionPayload, InternalAccessPayload } from '../types';
// import { CONFIG } from '../config';

// interface AuthenticatedRequest {
// 	cookies?: { accessToken?: string; refreshToken?: string };
// 	user?: { 
// 		userId: number; 
// 		jwtType?: string;
// 		gameId?: string;
// 		serviceId?: string;
// 		permissions?: string[];
// 	};
// 	log: any;
// }

// // Fastify middleware for three JWT types with intelligent routing
// export async function authMiddleware(
// 	fastify: any, 
// 	request: AuthenticatedRequest, 
// 	reply: FastifyReply, 
// 	done: () => void,
// 	options?: { expectedType?: 'USER_SESSION' | 'GAME_SESSION' | 'INTERNAL_ACCESS' }
// ) {
// 	const expectedType = options?.expectedType || 'USER_SESSION';
// 	const accessToken = request.cookies?.accessToken;
// 	const refreshToken = request.cookies?.refreshToken;

// 	// All JWT types require at least an access token (USER_SESSION also uses refresh token for auto-refresh)
// 	if (!accessToken) {
// 		fastify.log.warn(`No access token provided for ${expectedType}.`);
// 		return reply.code(401).send({ error: `No ${expectedType.toLowerCase()} token provided.` });
// 	}

// 	try {
// 		// Route to appropriate validation based on expected type
// 		switch (expectedType) {
// 			case 'USER_SESSION':
// 				return await validateUserSession(fastify, request, reply, done, accessToken!, refreshToken);
			
// 			case 'GAME_SESSION':
// 				return await validateGameSession(fastify, request, reply, done, accessToken!);
			
// 			case 'INTERNAL_ACCESS':
// 				return await validateInternalAccess(fastify, request, reply, done, accessToken!);
			
// 			default:
// 				fastify.log.error(`Unknown JWT type: ${expectedType}`);
// 				return reply.code(500).send({ error: 'Invalid authentication type configuration.' });
// 		}

// 	} catch (error) {
// 		request.log.error(error, 'Auth middleware error.');
// 		reply.code(500).send({ success: false, error: "Internal authentication error." });
// 	}
// }

// // USER_SESSION validation using validate_and_refresh_Tokens
// async function validateUserSession(
// 	fastify: any,
// 	request: AuthenticatedRequest,
// 	reply: FastifyReply,
// 	done: () => void,
// 	accessToken: string,
// 	refreshToken?: string
// ) {
// 	const result = await authService.validate_and_refresh_Tokens(fastify, accessToken, refreshToken || '');

// 	if (!result.success) {
// 		request.log.warn('Invalid or expired user session tokens.');
// 		reply.clearCookie('accessToken', {
// 			path: '/',
// 			secure: true,
// 			httpOnly: true,
// 			sameSite: 'none' as any
// 		});
// 		reply.clearCookie('refreshToken', {
// 			path: '/',
// 			secure: true,
// 			httpOnly: true,
// 			sameSite: 'none' as any
// 		});
// 		return reply.code(401).send({ error: 'Invalid or expired user session.' });
// 	}

// 	// If access token was refreshed, update cookie
// 	if (result.newAccessToken) {
// 		request.log.info('User access token refreshed.');
// 		authUtils.ft_setCookie(reply, result.newAccessToken, CONFIG.JWT.USER.ACCESS_TOKEN_EXPIRY);
// 	}

// 	// Store user info with JWT type
// 	request.user = { 
// 		userId: result.userId!, 
// 		jwtType: 'USER_SESSION' 
// 	};
	
// 	done();
// }

// // GAME_SESSION validation for game-specific routes (simple validation, no refresh needed)
// async function validateGameSession(
// 	fastify: any,
// 	request: AuthenticatedRequest,
// 	reply: FastifyReply,
// 	done: () => void,
// 	gameToken: string
// ) {
// 	const validation = await authService.validateToken(gameToken, JWTType.GAME_SESSION);
	
// 	if (!validation.valid) {
// 		fastify.log.warn(`Game session validation failed: ${validation.error}`);
// 		return reply.code(401).send({ 
// 			error: 'Invalid or expired game session.',
// 			details: validation.error
// 		});
// 	}

// 	// Store game session info
// 	request.user = { 
// 		userId: (validation.payload as any)?.userId,
// 		jwtType: 'GAME_SESSION',
// 		gameId: (validation.payload as any)?.gameId
// 	};
	
// 	done();
// }

// // INTERNAL_ACCESS validation for service-to-service routes (simple validation, no refresh needed)
// async function validateInternalAccess(
// 	fastify: any,
// 	request: AuthenticatedRequest,
// 	reply: FastifyReply,
// 	done: () => void,
// 	internalToken: string
// ) {
// 	const validation = await authService.validateToken(internalToken, JWTType.INTERNAL_ACCESS);
	
// 	if (!validation.valid) {
// 		fastify.log.warn(`Internal access validation failed: ${validation.error}`);
// 		return reply.code(401).send({ 
// 			error: 'Invalid service access token.',
// 			details: validation.error
// 		});
// 	}

// 	// Store service info
// 	request.user = { 
// 		userId: 0, // Services don't have user IDs
// 		jwtType: 'INTERNAL_ACCESS',
// 		serviceId: (validation.payload as any)?.serviceId,
// 		permissions: (validation.payload as any)?.permissions || []
// 	};
	
// 	done();
// }

// // Convenience middleware creators for specific JWT types
// export const userSessionMiddleware = (fastify: any, request: any, reply: any, done: any) => 
// 	authMiddleware(fastify, request, reply, done, { expectedType: 'USER_SESSION' });

// export const gameSessionMiddleware = (fastify: any, request: any, reply: any, done: any) => 
// 	authMiddleware(fastify, request, reply, done, { expectedType: 'GAME_SESSION' });

// export const internalAccessMiddleware = (fastify: any, request: any, reply: any, done: any) => 
// 	authMiddleware(fastify, request, reply, done, { expectedType: 'INTERNAL_ACCESS' });