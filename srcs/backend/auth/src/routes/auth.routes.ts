import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import authService from '../services/auth.service.js';
import authUtils from '../utils/auth.utils.js';
import { authMiddleware } from '../middleware/auth.middleware.js';
import { type ILoggerService, type LogContext } from '../container.js';
import { GameSessionClaims, gameSessionClaimsSchema, LoginRequest, loginSchema, signupFormSchema, SignupRequest } from '../schemas/auth.js';
import * as jwt from 'jsonwebtoken';
import { SignOptions } from 'jsonwebtoken';
import jwksService from '../services/jwks.service.js';
import { config } from '../config.js';


interface AuthenticatedRequest extends FastifyRequest {
	user?: {
		userId: number;
		type?: string;
	};
}

export async function authRoutes(fastify: FastifyInstance, options: any) {
	const logger: ILoggerService = (fastify as any).logger;

	// Login route
	fastify.post<{ Body: LoginRequest }>(
		'/auth/login',
		{ schema: { body: loginSchema } },
		async (request, reply) => {
		try {
			const data = request.body;
			const user = await authService.validateLocalUser(data);

			// Check for 2FA
			if (user.two_fa_enabled) {
				const tempToken = await authService.generateTempToken(
					{ userId: user.user_id }, 
					"2fa", 
					300
				);
				
				return reply.code(202).send({
					step: "2fa_required",
					message: "2FA verification required",
					temp_token: tempToken
				});
			}

			// Generate tokens using new USER_SESSION method
			const { accessToken, refreshToken } = await authService.generateTokens(user.user_id);

			// Set cookies
			authUtils.ft_setCookie(reply, accessToken, 15);
			authUtils.ft_setCookie(reply, refreshToken, 7);

			return reply.code(200).send({
				success: true,
				id: user.user_id,
				username: user.username,
			});

		} catch (error: any) {
			 if (error.code === 'INVALID_CREDENTIALS') {
				reply.status(401).send({
					error: "Invalid credentials"
				});
				return;
			}

			 if (error.code === 'NOT_A_LOCAL_USER') {
				reply.status(400).send({
					error: "This account was created with Google. Please use Google Sign-In."
				});
				return;
			}

			// User not found
			if (error.code === 'USER_NOT_FOUND') {
				reply.status(404).send({ 
					error: "User not found" 
				});
				return;
			}

			logger.error('Login error', error as Error, {
				ip: (request as any).ip
			});
			return reply.code(500).send({ 
				success: false, 
				error: 'Internal server error during login' 
			});
		}
	});

	// Register route
	fastify.post<{ Body: SignupRequest }>(
		'/auth/register',
		{ schema: { body: signupFormSchema } },
		async (request, reply) => {
		try {
			const { login, password } = request.body;

			// Security validation (JSON schema handles format/length validation)
			const checked_login = authUtils.checkLogin(fastify, login);
			if (typeof checked_login !== 'string') {
					return reply.code(400).send({ 
						success: false, 
						error: checked_login.error 
					});
			}

			// Determine if the username is an email address
			const isEmail = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(login);

			// If it's an email, use it as both username and email
			// If it's a traditional username, create a dummy email
			const email = isEmail ? login : `${login}@localhost.local`;

			// Check if user already exists (check both username and email fields)
			const existingUser = await authService.checkUserExistence(login);
			if (existingUser) {
				return reply.code(409).send({
					success: false,
					error: 'Username or email already exists'
				});
			}

			// Hash password
			const password_hash = await authUtils.hashPassword(password);

			// Create user
			const { user_id } = await authService.register({
				username: checked_login,
				email,
				password_hash
			});

			// Generate tokens using new USER_SESSION method
			const { accessToken, refreshToken } = await authService.generateTokens(user_id);

			// Set cookies
			authUtils.ft_setCookie(reply, accessToken, 15);
			authUtils.ft_setCookie(reply, refreshToken, 7);

			return reply.code(201).send({
				success: true,
				id: user_id,
				username: checked_login,
				email: email,
				message: 'User registered successfully'
			});

		} catch (error) {
			logger.error('Registration error', error as Error, {
				ip: (request as any).ip
			});
			return reply.code(500).send({
				success: false,
				error: 'Internal server error during registration'
			});
		}
	});

	// Refresh token route
	fastify.post('/auth/refresh', async (request, reply) => {
		try {
			const refreshToken = request.cookies?.refreshToken;
			
			if (!refreshToken) {
				return reply.code(401).send({
					success: false,
					error: 'Refresh token required'
				});
			}

			const result = await authService.refreshAccessToken(fastify, refreshToken);
			
			if (!result.success) {
				return reply.code(401).send({
					success: false,
					error: result.reason || 'Invalid refresh token'
				});
			}

			// Set new access token cookie
			if (result.newAccessToken) {
				authUtils.ft_setCookie(reply, result.newAccessToken, 15);
			}

			return reply.code(200).send({
				success: true,
				message: 'Token refreshed successfully'
			});

		} catch (error) {
			logger.error('Token refresh error', error as Error, {
				ip: (request as any).ip
			});
			return reply.code(500).send({
				success: false,
				error: 'Internal server error during token refresh'
			});
		}
	});

	// Logout route - requires USER_SESSION authentication
	fastify.post('/auth/logout', async (request: AuthenticatedRequest, reply: FastifyReply) => {
		try {
			// Check for access token
			const accessToken = request.cookies?.accessToken;
			
			if (!accessToken) {
				return reply.code(401).send({ 
					success: false, 
					error: 'No access token provided' 
				});
			}

			// Verify the token
			const result = await authService.validate_and_refresh_Tokens(fastify, accessToken, request.cookies?.refreshToken || '');
			
			if (!result.success || !result.userId) {
				return reply.code(401).send({ 
					success: false, 
					error: result.reason || 'Invalid or expired user session' 
				});
			}

			// Revoke tokens
			await authService.revokeTokens(result.userId);

			const cookieOptions = {
				path: '/',
				secure: true,
				httpOnly: true,
				sameSite: 'none' as const
			};

			reply.clearCookie('accessToken', cookieOptions);
			reply.clearCookie('refreshToken', cookieOptions);
			
			return reply.code(200).send({
				success: true,
				message: 'Logged out successfully!'
			});

		} catch (error) {
			logger.error('Logout error', error as Error, {
				userId: (request as any).user?.userId,
				ip: (request as any).ip
			});
			return reply.code(500).send({
				success: false,
				error: 'Internal server error during logout'
			});
		}
	});

	// Verify token route - check if user is authenticated
	fastify.post('/auth/verify', async (request, reply) => {
		try {
			const accessToken = request.cookies?.accessToken;
			const refreshToken = request.cookies?.refreshToken;
			
			if (!accessToken && !refreshToken) {
				return reply.code(401).send({
					success: false,
					error: 'No authentication token provided'
				});
			}

			const verification = await authService.validate_and_refresh_Tokens(fastify, accessToken || '', refreshToken || '');
			
			if (!verification.success) {
				return reply.code(401).send({
					success: false,
					error: 'Invalid or expired token'
				});
			}

			// If the access token was refreshed, update the cookie
			if (verification.newAccessToken) {
				authUtils.ft_setCookie(reply, verification.newAccessToken, 15);
			}

			// Get user details
			const user = db.prepare("SELECT id, username, email, avatar FROM users WHERE id = ?")
				.get(verification.userId);

			if (!user) {
				return reply.code(404).send({
					success: false,
					error: 'User not found'
				});
			}

			return reply.code(200).send({
				success: true,
				id: user.id,
				username: user.username,
				email: user.email,
				avatar: user.avatar
			});

		} catch (error) {
			logger.error('Token verification error', error as Error, {
				ip: (request as any).ip
			});
			return reply.code(500).send({
				success: false,
				error: 'Internal server error during token verification'
			});
		}
	});

	// Generate game session jwt [Requires Internal JWT]
	fastify.post<{ Body: GameSessionClaims }>(
    	"/auth/game-jwt",
    	{ schema: { body: gameSessionClaimsSchema } },
		async (request, reply) => {
			  try {
				const claims: GameSessionClaims = request.body;
				const sign_options: SignOptions = {
					algorithm: config.jwt.game.algorithm,
					expiresIn: config.jwt.game.accessTokenExpiry as any,
					keyid: jwksService.getCurrentKeyId()
				};
				const game_jwt = jwt.sign(
					{
						// Standard JWT claims
						sub: claims.sub,
						iss: config.jwt.game.issuer,
						type: config.jwt.game.type,

						// Game specific claims
						game_id: claims.game_id,
					},
					config.jwt.game.privateKey,
					sign_options
				);
				
				reply.status(201).send({ token: game_jwt });
			} catch (error) {
				logger.error('Game JWT generation error', error as Error, {
					ip: (request as any).ip
				});
				return reply.status(500).send({
					error: 'Internal server error during game JWT generation'
				});
			}
	});

	// Generate internal JWT route - for service-to-service communication
	fastify.post('/auth/internal/token', {
		schema: {
			description: 'Generate internal access token for service-to-service communication',
			tags: ['Auth', 'Internal'],
			response: {
				200: {
					type: 'object',
					properties: {
						token: { type: 'string' },
						expires_in: { type: 'string' }
					}
				}
			}
		}
	}, async (request: FastifyRequest, reply: FastifyReply) => {
		try {
			// Generate internal JWT
			const sign_options: SignOptions = {
				algorithm: config.jwt.internal.algorithm,
				expiresIn: config.jwt.internal.accessTokenExpiry as any,
				keyid: jwksService.getCurrentKeyId()
			};

			const internal_jwt = jwt.sign(
				{
					type: config.jwt.internal.type,
					iss: config.jwt.internal.issuer,
				},
				config.jwt.internal.privateKey,
				sign_options
			);
			
			reply.status(200).send({ 
				token: internal_jwt,
				expires_in: config.jwt.internal.accessTokenExpiry 
			});

		} catch (error) {
			logger.error('Internal JWT generation error', error as Error, {
				ip: (request as any).ip
			});
			return reply.status(500).send({
				error: 'Internal server error during internal JWT generation'
			});
		}
	});

}
