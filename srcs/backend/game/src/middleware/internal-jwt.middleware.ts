/**
 * Internal JWT Middleware
 * 
 * Middleware for verifying INTERNAL_ACCESS JWT tokens for service-to-service communication
 * Can be easily added to any microservice that needs to authenticate other services
 * 
 * Usage:
 * - Add to routes that need service-to-service authentication
 * - Automatically verifies INTERNAL_ACCESS tokens from Authorization header
 * - Adds verified payload to request.internalAuth
 */

import { FastifyRequest, FastifyReply } from 'fastify';
import { verifyInternalJWT } from '../utils/jwt-verifier.js';

interface InternalAuthPayload {
	service: string;
	scope: string[];
	requestId?: string;
}

// Extend FastifyRequest to include internal auth payload
declare module 'fastify' {
	interface FastifyRequest {
		internalAuth?: InternalAuthPayload;
	}
}

/**
 * Middleware to verify INTERNAL_ACCESS JWT tokens
 */
export async function internalJWTMiddleware(
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

		// Verify the internal JWT token
		const payload = await verifyInternalJWT(token);
		
		// Add the verified payload to the request
		request.internalAuth = payload as InternalAuthPayload;
		
		// Log the internal service access
		request.log.info({
			service: payload.service,
			scope: payload.scope,
			requestId: payload.requestId,
			path: request.url,
			method: request.method
		}, 'Internal service access');

	} catch (error) {
		request.log.warn({
			error: error instanceof Error ? error.message : String(error),
			path: request.url,
			method: request.method,
			ip: request.ip
		}, 'Internal JWT verification failed');

		return reply.code(401).send({
			error: 'Unauthorized',
			message: 'Invalid or expired internal access token'
		});
	}
}

/**
 * Factory function to create middleware with specific scope requirements
 */
export function requireInternalScope(...requiredScopes: string[]) {
	return async (request: FastifyRequest, reply: FastifyReply): Promise<void> => {
		// First run the base internal JWT middleware
		await internalJWTMiddleware(request, reply);
		
		// If the reply was already sent (error), return early
		if (reply.sent) {
			return;
		}

		// Check if the internal auth has required scopes
		const internalAuth = request.internalAuth;
		if (!internalAuth) {
			return reply.code(401).send({
				error: 'Unauthorized',
				message: 'Internal authentication required'
			});
		}

		// Check scope requirements
		const hasRequiredScope = requiredScopes.every(scope => 
			internalAuth.scope.includes(scope)
		);

		if (!hasRequiredScope) {
			request.log.warn({
				service: internalAuth.service,
				userScopes: internalAuth.scope,
				requiredScopes,
				path: request.url
			}, 'Insufficient internal service scope');

			return reply.code(403).send({
				error: 'Forbidden',
				message: `Insufficient scope. Required: ${requiredScopes.join(', ')}`
			});
		}
	};
}

/**
 * Convenience middleware for common internal service operations
 */
export const requireInternalRead = requireInternalScope('read');
export const requireInternalWrite = requireInternalScope('write');
export const requireInternalAdmin = requireInternalScope('admin');