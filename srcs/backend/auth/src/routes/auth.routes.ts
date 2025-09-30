import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import authService from '../services/auth.service.js';
import authUtils from '../utils/auth.utils.js';
import { type ILoggerService } from '../container.js';
import { GameSessionClaims, gameSessionClaimsSchema, LoginRequest, loginSchema, PasswordUpdateData, passwordUpdateSchema, signupFormSchema, SignupRequest } from '../schemas/auth.js';
import * as jwt from 'jsonwebtoken';
import { SignOptions } from 'jsonwebtoken';
import jwksService from '../services/jwks.service.js';
import { config } from '../config.js';
import { internalAuthMiddleware } from '../middleware/internal-auth.middleware';


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
				avatar_url: user.avatar_url,
				message: "Login successful"
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

			// Get user profile from users service
			const user = await authService.getUserProfile(verification.userId!);

			return reply.code(200).send({
				success: true,
				id: user.user_id,
				username: user.username,
				avatar_url: user.avatar_url
			});

		} catch (error: any) {
			if (error.code === 'USER_NOT_FOUND') {
				return reply.code(404).send({
					success: false,
					error: 'User not found'
				});
			}
			
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
    	"/auth/game/token",
    	{ 
			schema: { body: gameSessionClaimsSchema },
			preHandler: internalAuthMiddleware
		},
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

	// Generate internal JWT route - OAuth2-like client credentials flow
	fastify.post('/auth/internal/token', {
		schema: {
			description: 'Generate internal access token using client credentials (OAuth2-like flow)',
			tags: ['Auth', 'Internal'],
			body: {
				type: 'object',
				properties: {
					client_id: { type: 'string' },
					client_secret: { type: 'string' },
					grant_type: { type: 'string', enum: ['client_credentials'] }
				},
				required: ['client_id', 'client_secret', 'grant_type']
			},
			response: {
				200: {
					type: 'object',
					properties: {
						access_token: { type: 'string' },
						token_type: { type: 'string' },
						expires_in: { type: 'number' }
					}
				}
			}
		}
	}, async (request: FastifyRequest<{
		Body: {
			client_id: string;
			client_secret: string;
			grant_type: string;
		}
	}>, reply: FastifyReply) => {
		try {
			const { client_id, client_secret, grant_type } = request.body;
			
			// Validate grant type
			if (grant_type !== 'client_credentials') {
				return reply.status(400).send({
					error: 'unsupported_grant_type',
					error_description: 'Only client_credentials grant type is supported'
				});
			}

			// Find client in our credentials
			const clientCreds = Object.values(config.clientCredentials).find(
				creds => creds.id === client_id
			);

			if (!clientCreds || clientCreds.secret !== client_secret) {
				console.warn(`� Invalid client credentials for: ${client_id}`);
				return reply.status(401).send({
					error: 'invalid_client',
					error_description: 'Invalid client credentials'
				});
			}

			console.log(`🔑 Internal token granted to client: ${client_id}`);

			// Generate internal JWT using centralized method
			const internal_jwt = authUtils.generateInternalJWT();
			
			// Parse expiry time to seconds
			const expiresInSeconds = config.jwt.internal.accessTokenExpiry === '1h' ? 3600 : 3600;
			
			reply.status(200).send({ 
				access_token: internal_jwt,
				token_type: 'Bearer',
				expires_in: expiresInSeconds
			});

		} catch (error) {
			logger.error('Internal JWT generation error', error as Error, {
				ip: (request as any).ip
			});
			return reply.status(500).send({
				error: 'server_error',
				error_description: 'Internal server error during token generation'
			});
		}
	});

	// Update password hash route - for internal service communication
	fastify.put<{ Body: PasswordUpdateData }>(
		"/auth/hash-password",
		{ 
			schema: { body: passwordUpdateSchema },
			preHandler: internalAuthMiddleware
		},
		async (request, reply) => {
			try {
				const data = request.body;
				const password_hash = await authService.updatePasswordHash(
					data.old_hash,
					data.old_password,
					data.new_password
				);
				
				reply.send({ password_hash });
			} catch (error: any) {
				if (error.code === 'INVALID_CURRENT_PASSWORD') {
					return reply.status(401).send({
						error: "Invalid current password"
					});
				}

				if (error.code === 'USER_NOT_FOUND') {
					return reply.status(404).send({
						error: "User not found"
					});
				}

				logger.error('Password hash update error', error as Error, {
					ip: (request as any).ip
				});
				return reply.status(500).send({
					error: 'Internal server error during password hash update'
				});
			}
		}
	);

}
