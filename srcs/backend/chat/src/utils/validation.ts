//  draft from ft_transcendence/backend/auth/auth.service.js

import fastify from "fastify";

	
async validate_and_refresh_Tokens(fastify, accessToken, refreshToken) {
	try {
		if (!accessToken) {
			fastify.log.warn('No access token provided');
			throw new Error('No access token provided');
		}
		fastify.log.info('ACCESS TOKEN CHECK...');

		// Check if the token is valid
		const decoded = jwt.verify(accessToken, JWT_SECRET);

		// Check if the token is blacklisted
		const isBlacklisted = await redis.get(`blacklist_${accessToken}`);
		if (isBlacklisted) {
			fastify.log.warn('Token is blacklisted');
			throw new Error('Token is blacklisted');
		}

		// Check if user exists in the database
		if (fastify.db) {
			const userExists = fastify.db.prepare("SELECT id FROM users WHERE id = ?").get(decoded.userId);
				if (!userExists) {
				fastify.log.warn('User not found in the database, revoking tokens...');
				await this.revokeTokens(decoded.userId);
				throw new Error('User not found in the database, tokens revoked');
			}
		}

		// Verify if the token is the latest
		const currentAccessToken = await redis.get(`access_${decoded.userId}`);
		if (accessToken !== currentAccessToken) {
			// fastify.log.info(`Token cookies: ${accessToken}`);
			// fastify.log.info(`Token Back: ${currentAccessToken}`);
			fastify.log.warn(`Token is not the latest one.`);
			throw new Error('Token is not the latest one.');
		}

		fastify.log.info('Access Token is valid\n');
		return {
			success: true,
			userId: decoded.userId
		};
	} catch (error) {
		fastify.log.warn('Access token invalid, Attempting to refresh it...');
		fastify.log.info('REFRESH TOKEN CHECK...');

		// If the access token is expired, try to refresh it using the refresh token
		if (!refreshToken) {
			fastify.log.error(error, 'No refresh token provided.');
			return { success: false, reason: 'No refresh token provided' };
		}

		try {
			const result = await this.refreshAccessToken(fastify, refreshToken, accessToken);
			if (!result.success) {
				fastify.log.warn(`Failed to refresh access token, invalid refresh token.`);
				return { success: false, reason: 'Failed to refresh access token, invalid refresh token.' };
			}
			fastify.log.info(`Nouveau access token généré avec succès.`);
			return {
				success: true,
				userId: result.userId,
				newAccessToken: result.newAccessToken,
			};
		} catch (refreshError) {
			fastify.log.error(refreshError, 'Fail to verify refresh token.');
			return { success: false, reason: 'Fail to verify refresh token.' };
		}
	}
}