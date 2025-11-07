/**
 * User JWT Middleware for WebSocket Authentication
 * 
 * Middleware for verifying USER_SESSION JWT tokens in WebSocket connections
 * Sets request.authUser if successful
 */

import { FastifyRequest } from 'fastify';
import { UserSessionPayload, verifyUserSessionJWT } from '../services/JwtVerifierService';

// Extend FastifyRequest to include user auth payload
declare module 'fastify' {
	interface FastifyRequest {
		authUser?: UserSessionPayload;
	}
}

/**
 * Verify USER_SESSION JWT token from WebSocket request
 * @param request - FastifyRequest with cookies or authorization header
 * @returns true if authentication successful, false otherwise
 */
export async function userWsAuthMiddleware(
	request: FastifyRequest
): Promise<boolean> {
	try {
		// Extract token from Authorization header or cookies
		let token: string | undefined;

		const authHeader = request.headers.authorization;
		if (authHeader?.startsWith("Bearer ")) {
			token = authHeader.substring(7); // Remove 'Bearer ' prefix
		}

		if (!token && request.cookies?.accessToken) {
			token = request.cookies.accessToken;
		}

		if (!token) {
			return false;
		}

		// Verify the user JWT token
		const payload = await verifyUserSessionJWT(token);
		
		// Set the verified payload on the request
		request.authUser = payload as UserSessionPayload;
		
		return true;
	} catch (error) {
		return false;
	}
}
