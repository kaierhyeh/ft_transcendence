import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import speakeasy from 'speakeasy';
import qrcode from 'qrcode';
import redis from '../clients/redis.client';
import authService from '../services/auth.service';
import authUtils from '../utils/auth.utils';

export async function twofaRoutes(fastify: FastifyInstance, options: any) {
	const db = (fastify as any).db;
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
	fastify.post('/2fa/setup', {
		schema: {
			description: 'Setup 2FA for the authenticated user',
			tags: ['2FA'],
			security: [{ bearerAuth: [] }],
			response: {
				200: {
					type: 'object',
					properties: {
						success: { type: 'boolean' },
						qrCode: { type: 'string' },
						secret: { type: 'string' }
					}
				}
			}
		}
	}, async (request: FastifyRequest, reply: FastifyReply) => {
		const userId = (request as any).user.userId;
		const ip = (request as any).ip;

		try {
			logger.info('2FA setup initiated', { userId, ip });

			// Check if user already has 2FA enabled
			const user = db.prepare("SELECT twofa_secret FROM users WHERE id = ?").get(userId) as any;
			if (user?.twofa_secret) {
				logger.warn('2FA setup failed: 2FA already enabled', { userId, ip });
				return reply.code(400).send({ success: false, error: "2FA is already enabled." });
			}

			// Generate a new secret
			const secret = speakeasy.generateSecret({
				name: `42-Transcendence:${userId}`,
				issuer: '42-Transcendence'
			});

			// Generate QR code
			const qrCode = await qrcode.toDataURL(secret.otpauth_url!);

			logger.audit('2FA setup completed successfully', { userId, ip });
			return reply.send({
				success: true,
				qrCode,
				secret: secret.base32
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
	fastify.post("/2fa/activate", async (request: FastifyRequest<{ Body: { token: string } }>, reply: FastifyReply) => {
		try {
			const userId = (request as any).user.userId;
			const { token } = request.body;

			// Token = the verification code entered by the user.
			const secret = await redis.get(`2fa_setup_${userId}`);
			if (!secret)
				return reply.code(400).send({ success: false, error: "2FA setup expired." });

			// Check if the user exists in the database.
			const isValid = speakeasy.totp.verify({ secret, encoding: 'base32', token });

			if (!isValid)
				return reply.code(400).send({ success: false, error: "Invalid verification code." });
			logger.audit('2FA secret verified for user', {
				userId,
				ip: (request as any).ip
			});

			// Finally, store the secret in the database.
			db.prepare("UPDATE users SET twofa_secret = ? WHERE id = ?").run(secret, userId);

			// Remove the temporary secret from Redis.
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

	// 📌 Route: 2fa/verify
	// Route to verify the 2FA token during login.
	// It verifies the token with the secret stored in the database.
	// If the token is valid, it generates the access and refresh tokens.
	// If the token is invalid, it returns an error.
	// The user must enter the verification code from the authenticator app.
	// The tokens are stored cookies for authentication.
	fastify.post("/2fa/verify", async (request: FastifyRequest<{ Body: { token: string; temp_token: string } }>, reply: FastifyReply) => {
		try {
			const { token: twofaCode, temp_token } = request.body;
			// twofaCode: the verification code entered by the user.
			// temp_token: the temporary token sent to the user.

			// Verify the temporary token.
			const payload = await authService.verifyTempToken(temp_token);
			if (!payload.valid || !payload.payload) {
				return reply.code(400).send({ message: 'Invalid or expired temp token.' });
			}
			const user = db.prepare("SELECT * FROM users WHERE id = ?").get((payload.payload as any).userId);

			// Check if user has 2FA enabled.
			if (!user?.twofa_secret)
				return reply.code(400).send({ success: false, error: "2FA is not enabled for this user." });

			// Verify the 2FA code using speakeasy.
			const isValid = speakeasy.totp.verify({
				secret: user.twofa_secret,
				encoding: 'base32',
				token: twofaCode
			});
			if (!isValid)
				return reply.code(400).send({ success: false, error: "Invalid 2FA code." });

			// Generate access and refresh tokens.
			const { accessToken, refreshToken } = await authService.generateTokens(user.id);

			authUtils.ft_setCookie(reply, accessToken, 15);
			authUtils.ft_setCookie(reply, refreshToken, 7);

			return reply.code(200).send({
				success: true,
				message: "2FA verification successful.",
				username: user.username,
				id: user.id
			});
		} catch (error) {
			logger.error('Error during 2FA verification', error as Error, {
				ip: (request as any).ip
			});
			return reply.code(500).send({ success: false, error: "Internal server error during 2FA verification." });
		}
	});

	// 📌 Route: 2fa/disable
	// Route to disable 2FA for the user.
	// It removes the secret from the database.
	// The user can disable 2FA if they have access to their account.
	// It does not require the verification code.
	// The user must be authenticated to disable 2FA.

	fastify.post("/2fa/disable", async (request: FastifyRequest, reply: FastifyReply) => {
		try {
			const userId = (request as any).user.userId;
			// Get the user from the database.
			const user = db.prepare("SELECT password, username, is_google_account, twofa_secret FROM users WHERE id = ?").get(userId);
			if (!user) {
				logger.warn('2FA disable attempt failed: User not found', {
					userId,
					ip: (request as any).ip
				});
				return reply.code(404).send({ success: false, error: "User not found." });
			}
			if (!user.twofa_secret) {
				logger.info('2FA disable attempt failed: 2FA not enabled for user', {
					userId,
					ip: (request as any).ip
				});
				return reply.code(400).send({ success: false, error: "2FA is not enabled." });
			}

			// Remove the 2FA secret from the database.
			db.prepare("UPDATE users SET twofa_secret = NULL WHERE id = ?").run(userId);
			logger.audit('2FA successfully disabled for user', {
				userId,
				ip: (request as any).ip
			});

			return reply.code(200).send({ success: true, message: "2FA has been disabled." });
		} catch (error) {
			logger.error('Error during 2FA disable', error as Error, {
				userId: (request as any).user?.userId,
				ip: (request as any).ip
			});
			return reply.code(500).send({ success: false, error: "Internal server error during 2FA disable." });
		}
	});

	// 📌 Route: 2fa/status
	// Route to check the status of 2FA for the user.
	// It returns whether 2FA is enabled or not.
	// The user must be authenticated to check the status.
	// It does not require any parameters.
	fastify.get("/2fa/status", async (request: FastifyRequest, reply: FastifyReply) => {
		try {
			const userId = (request as any).user.userId;
			const user = db.prepare("SELECT twofa_secret FROM users WHERE id = ?").get(userId);
			if (!user)
				return reply.code(404).send({ success: false, error: "User not found." });
			return reply.code(200).send({ success: true, enabled: !!user.twofa_secret });
		} catch (error) {
			logger.error('Error during 2FA status check', error as Error, {
				userId: (request as any).user?.userId,
				ip: (request as any).ip
			});
			return reply.code(500).send({ success: false, error: "Internal server error during 2FA status check." });
		}
	});
}