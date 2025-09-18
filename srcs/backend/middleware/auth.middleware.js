import authService from '../auth/auth.service.js';
import authUtils from '../auth/auth.utils.js';
import * as wsUtils from '../ws/ws.utils.js';
import jwt from 'jsonwebtoken';

// Fastify middleware handles authentication, checking valid JWT tokens b4 accessing API routes.
// It verifies if the token is valid and not expired.
// If the access token is expired, it tries to refresh it using the refresh token.
// If both tokens are invalid, it returns a 401 error and clears the cookies.
export async function authMiddleware(fastify, request, reply, done) {
	const accessToken = request.cookies?.accessToken;
	const refreshToken = request.cookies?.refreshToken;

	// Check if access and refresh token are provided.
	if (!accessToken && !refreshToken) {
		fastify.log.warn('No access nor refresh tokens provided.');
		return reply.code(401).send({ error: "No token provided." });
	}

	// Set cookie options.
	const cookieOptions = {
		path: '/',
		secure: true,
		httpOnly: true,
		sameSite: 'none'
	};

	try {
		// Check if the access token is valid, otherwise try to refresh it.
		const result = await authService.validate_and_refresh_Tokens(fastify, accessToken, refreshToken);

		// If the access and the refresh tokens are invalid.
		if (!result.success) {
			request.log.warn('Invalid or expired tokens.');
			return reply
				.code(401)
				.clearCookie('accessToken', cookieOptions)
				.clearCookie('refreshToken', cookieOptions)
				.send({ error: 'Invalid or expired tokens.' });
		}

		// If the access token is refreshed, update the cookie.
		if (result.newAccessToken) {
			request.log.info('Access token refreshed.');
			authUtils.ft_setCookie(reply, result.newAccessToken, 15);
		}

		// If the tokens are valid, store the user info in the request object.
		request.user = { userId: result.userId };
		done();
	} catch (error) {
		request.log.error(error, 'Auth middleware error.');
		reply.code(500).send({ success: false, error: "Internal authentication error." });
	}
}