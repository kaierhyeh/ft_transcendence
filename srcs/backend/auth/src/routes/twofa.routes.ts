import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import speakeasy from 'speakeasy';
import qrcode from 'qrcode';
import redis from '../clients/RedisClient';
import usersClient from '../clients/UsersClient';
import authService from '../services/auth.service';
import jwtService from '../services/jwt.service';
import authUtils from '../utils/auth.utils';
import { CONFIG } from '../config';
import { userSessionMiddleware } from '../middleware/user-auth';

export default async function twofaRoutes(fastify: FastifyInstance, options: any) {
	const logger = (fastify as any).logger;

	// 📌 Route: 2fa/setup
	// Route to setup 2FA for the user.
	// It generates a secret and QR code for the user to scan with an authenticator app.
	// And it returns the otpauth_url and QR code data URL.
	// The secret is temporarily stored until the user verifies it.
	// The QR code is generated from the otpauth_url.
	// The user must scan the QR code and enter the verification code to activate 2FA.
	// The secret is  stored in the database only after successful verification.
	// The QR code is displayed in the frontend for the user to scan.
	fastify.post('/setup', {
		preHandler: userSessionMiddleware
	}, async (request: FastifyRequest, reply: FastifyReply) => {
		let userId, ip;
		try {
			userId = (request as any).user.userId;
			ip = 'unknown';

			// Check if user already has 2FA enabled via usersClient
			const twoFAStatus = await usersClient.get2FAStatus(userId);
			if (twoFAStatus.enabled) {
				logger.warn('2FA setup failed: 2FA already enabled', { userId, ip });
				return reply.code(400).send({ success: false, error: "2FA is already enabled." });
			}

			// Generate a new secret
			const secret = speakeasy.generateSecret({
				name: `ft_transcendence (${userId})`,
				issuer: 'ft_transcendence'
			});

			// Store the secret temporarily in Redis (expires in 10 minutes)
			await redis.setex(`2fa_setup_${userId}`, 600, secret.base32);

			// Generate QR code
			const qrCode = await qrcode.toDataURL(secret.otpauth_url!);

			return reply.send({
				success: true,
				qrCode,
				secret: secret.base32,
				otpauth_url: secret.otpauth_url
			});
		} catch (error) {
			logger.error('2FA setup failed', error as Error, { userId, ip });
			return reply.code(500).send({ success: false, error: "Internal server error." });
		}
	});

	// 📌 Route: 2fa/activate
	// Route to activate 2FA for the user.
	// It verifies the token entered by the user with the secret.
	// If the token is valid, it stores the secret in the database.
	// If the token is invalid, it returns an error.
	// The user must enter the verification code from the authenticator app.
	fastify.post<{ Body: { token: string } }>("/activate", {
		preHandler: userSessionMiddleware
	}, async (request: FastifyRequest<{ Body: { token: string } }>, reply: FastifyReply) => {
		try {
			const userId = (request as any).user.userId;
			const { token } = request.body;

			// Get the temporary secret from Redis
			const secret = await redis.get(`2fa_setup_${userId}`);
			if (!secret)
				return reply.code(400).send({ success: false, error: "2FA setup expired. Please start setup again." });

			// Verify the token with the secret
			const isValid = speakeasy.totp.verify({ secret, encoding: 'base32', token });

			if (!isValid)
				return reply.code(400).send({ success: false, error: "Invalid verification code." });

			// Store the secret in the users database via usersClient
			await usersClient.update2FASettings(userId, true, secret);

			// Remove the temporary secret from Redis
			await redis.del(`2fa_setup_${userId}`);

			return reply.code(200).send({ success: true, message: "2FA successfully activated." });
		} catch (error) {
			logger.error('Error during 2FA activation', error as Error, {
				userId: (request as any).user?.userId,
				ip: (request as any).ip
			});
			return reply.code(500).send({ success: false, error: "Internal server error during 2FA activation." });
		}
	});

	// 📌 Route: /verify
	// Route to verify the 2FA token during login.
	// It verifies the token with the secret stored in the database.
	// If the token is valid, it generates the access and refresh tokens.
	// If the token is invalid, it returns an error.
	// The user must enter the verification code from the authenticator app.
	// The tokens are stored in cookies for authentication.
	fastify.post("/verify", async (request: FastifyRequest<{ Body: { token: string; temp_token: string } }>, reply: FastifyReply) => {
		try {
			const { token: twofaCode, temp_token } = request.body;

			console.log('🔐 2FA verification attempt:', {
				hasTwofaCode: !!twofaCode,
				hasTempToken: !!temp_token,
				tempTokenPreview: temp_token ? temp_token.substring(0, 20) + '...' : 'none'
			});

			// Verify the temporary token
			const payload = await authService.verifyTempToken(temp_token);
			
			console.log('🔍 Temp token verification result:', {
				valid: payload.valid,
				hasPayload: !!payload.payload,
				error: payload.error
			});
			
			if (!payload.valid || !payload.payload)
				return reply.code(400).send({ success: false, error: 'Invalid or expired temp token.' });

			// Support both userId (normal login) and user_id (OAuth) formats
			const userId = (payload.payload as any).userId || (payload.payload as any).user_id;
			
			console.log('👤 Extracted userId from temp token:', userId);
			
			// Check if user has 2FA enabled via usersClient
			const twoFAStatus = await usersClient.get2FAStatus(userId);
			
			if (!twoFAStatus.enabled || !twoFAStatus.secret)
				return reply.code(400).send({ success: false, error: "2FA is not enabled for this user." });

			// Verify the 2FA code using speakeasy
			const isValid = speakeasy.totp.verify({
				secret: twoFAStatus.secret,
				encoding: 'base32',
				token: twofaCode
			});
			
			if (!isValid)
				return reply.code(400).send({ success: false, error: "Invalid 2FA code." });

			// Generate access and refresh tokens
			const { accessToken, refreshToken } = await jwtService.generateTokens(userId);

			authUtils.ft_setCookie(reply, accessToken, CONFIG.JWT.USER.ACCESS_TOKEN_EXPIRY, 'access');
			authUtils.ft_setCookie(reply, refreshToken, CONFIG.JWT.USER.REFRESH_TOKEN_EXPIRY, 'refresh');

			// Get user profile
			const userProfile = await usersClient.getUserProfile(userId);

			return reply.code(200).send({
				success: true,
				message: "2FA verification successful.",
				username: userProfile.username,
				id: userProfile.user_id
			});
		} catch (error) {
			logger.error('Error during 2FA verification', error as Error, {
				ip: (request as any).ip
			});
			return reply.code(500).send({ success: false, error: "Internal server error during 2FA verification." });
		}
	});

	// 📌 Route: /disable
	// Route to disable 2FA for the user.
	// It removes the secret from the database.
	// The user can disable 2FA if they have access to their account.
	// The user must be authenticated to disable 2FA.
	fastify.post("/disable", {
		preHandler: userSessionMiddleware
	}, async (request: FastifyRequest, reply: FastifyReply) => {
		try {
			const userId = (request as any).user.userId;
			
			// Check if user has 2FA enabled
			const twoFAStatus = await usersClient.get2FAStatus(userId);
			
			if (!twoFAStatus.enabled) {
				logger.info('2FA disable attempt failed: 2FA not enabled for user', {
					userId,
					ip: (request as any).ip
				});
				return reply.code(400).send({ success: false, error: "2FA is not enabled." });
			}

			// Disable 2FA by setting enabled=false and removing secret
			await usersClient.update2FASettings(userId, false, null);

			return reply.code(200).send({ success: true, message: "2FA has been disabled." });
		} catch (error) {
			logger.error('Error during 2FA disable', error as Error, {
				userId: (request as any).user?.userId,
				ip: (request as any).ip
			});
			return reply.code(500).send({ success: false, error: "Internal server error during 2FA disable." });
		}
	});

	// 📌 Route: /status
	// Route to check the status of 2FA for the user.
	// It returns whether 2FA is enabled or not.
	// The user must be authenticated to check the status.
	fastify.get("/status", {
		preHandler: userSessionMiddleware
	}, async (request: FastifyRequest, reply: FastifyReply) => {
		try {
			const userId = (request as any).user.userId;
			const twoFAStatus = await usersClient.get2FAStatus(userId);
			
			return reply.code(200).send({ 
				success: true, 
				enabled: twoFAStatus.enabled 
			});
		} catch (error) {
			logger.error('Error during 2FA status check', error as Error);
			return reply.code(500).send({ success: false, error: "Internal server error during 2FA status check." });
		}
	});
}