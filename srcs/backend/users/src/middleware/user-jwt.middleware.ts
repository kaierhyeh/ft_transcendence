/**
 * User JWT Middleware for Users Service
 * 
 * Middleware for verifying USER_SESSION JWT tokens
 * Adds verified user information to request.user
 */

import { FastifyRequest, FastifyReply } from 'fastify';
import { verifyUserSessionJWT } from '../utils/jwt-verifier.js';

interface UserPayload {
	userId: string;
	email: string;
	role: string;
	permissions?: string[];
}

// Extend FastifyRequest to include user auth payload
declare module 'fastify' {
	interface FastifyRequest {
		userAuth?: UserPayload;
	}
}

/**
 * Middleware to verify USER_SESSION JWT tokens
 */
export async function userJWTMiddleware(
	request: FastifyRequest,
	reply: FastifyReply
): Promise<void> {
	try {
		// Extract token from Authorization header
		const authHeader = request.headers.authorization;
		if (!authHeader || !authHeader.startsWith('Bearer ')) {
			return reply.code(401).send({
				error: 'Unauthorized',
				message: 'Missing or invalid Authorization header'
			});
		}

		const token = authHeader.substring(7); // Remove 'Bearer ' prefix

		// Verify the user JWT token
		const payload = await verifyUserSessionJWT(token);
		
		// Add the verified payload to the request
		request.userAuth = payload as UserPayload;
		
		// Log the user access
		request.log.info({
			userId: payload.userId,
			email: payload.email,
			path: request.url,
			method: request.method
		}, 'User access');

	} catch (error) {
		request.log.warn({
			error: error instanceof Error ? error.message : String(error),
			path: request.url,
			method: request.method,
			ip: request.ip
		}, 'User JWT verification failed');

		return reply.code(401).send({
			error: 'Unauthorized',
			message: 'Invalid or expired access token'
		});
	}
}

/**
 * Factory function to create middleware with role requirements
 */
export function requireRole(...requiredRoles: string[]) {
	return async (request: FastifyRequest, reply: FastifyReply): Promise<void> => {
		// First run the base user JWT middleware
		await userJWTMiddleware(request, reply);
		
		if (reply.sent) {
			return;
		}

		const user = request.userAuth;
		if (!user) {
			return reply.code(401).send({
				error: 'Unauthorized',
				message: 'User authentication required'
			});
		}

		// Check role requirements  
		if (!requiredRoles.includes(user.role)) {
			request.log.warn({
				userId: user.userId,
				userRole: user.role,
				requiredRoles,
				path: request.url
			}, 'Insufficient user role');

			return reply.code(403).send({
				error: 'Forbidden',
				message: `Insufficient role. Required: ${requiredRoles.join(', ')}`
			});
		}
	};
}

/**
 * Convenience middlewares for common roles
 */
export const requireAdmin = requireRole('admin');
export const requireUser = requireRole('user', 'admin'); // admin can do user operations