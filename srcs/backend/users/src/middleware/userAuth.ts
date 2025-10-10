/**
 * User JWT Middleware for Users Service
 * 
 * Middleware for verifying USER_SESSION JWT tokens
 * Adds verified user information to request.user
 */

import { FastifyRequest, FastifyReply } from 'fastify';
import { UserSessionPayload, verifyUserSessionJWT } from '../services/JwtVerifierService';


// Extend FastifyRequest to include user auth payload
declare module 'fastify' {
	interface FastifyRequest {
		authUser?: UserSessionPayload;
	}
}

/**
 * Middleware to verify USER_SESSION JWT tokens
 */
export async function userAuthMiddleware(
	request: FastifyRequest,
	reply: FastifyReply
): Promise<void> {
	try {
		let token: string | undefined;

		// Extract token from Authorization header
		const authHeader = request.headers.authorization;
		if (authHeader?.startsWith("Bearer ")) {
			token = authHeader.substring(7); // Remove 'Bearer ' prefix
		}

		if (!token && request.cookies?.accessToken) {
			token = request.cookies.accessToken;
		}

		if (!token) {
			return reply.code(401).send({
				error: 'Unauthorized',
				message: 'No access token provided',
			});
		}


		// Verify the user JWT token
		const payload = await verifyUserSessionJWT(token);
		
		// Add the verified payload to the request
		request.authUser = payload as UserSessionPayload;
		
		// Log the user access
		request.log.info({
			user_id: payload.sub,
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

// this one set user_id == NULL if no valid token is provided
// can be used for routes that support both authenticated and unauthenticated users
export async function userAuthSwitcher(
	request: FastifyRequest,
	reply: FastifyReply
): Promise<void> {
	try {
		let token: string | undefined;

		const authHeader = request.headers.authorization;
		if (authHeader?.startsWith("Bearer ")) {
			token = authHeader.substring(7);
		}

		if (!token && request.cookies?.accessToken) {
			token = request.cookies.accessToken;
		}

		if (!token) {
			request.log.info({
				user_id: null,
				path: request.url,
				method: request.method
			}, 'Guest access');
			return;
		}

		const payload = await verifyUserSessionJWT(token);
		
		request.authUser = payload as UserSessionPayload;
		
		request.log.info({
			user_id: payload.sub,
			path: request.url,
			method: request.method
		}, 'User access');

	} catch (error) {
		request.log.info({
			user_id: null,
			path: request.url,
			method: request.method
		}, 'User access');
	}
}
