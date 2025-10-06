import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import authService from '../services/auth.service';
import authUtils from '../utils/auth.utils';
import { GameSessionClaims, gameSessionClaimsSchema, LoginCredentials, loginSchema, signupFormSchema, SignupRequest } from '../schemas/auth';
import * as jwt from 'jsonwebtoken';
import { SignOptions } from 'jsonwebtoken';
import jwksService from '../services/jwks.service';
import { CONFIG } from '../config';
import { internalAuthMiddleware } from '../middleware/internal-auth.middleware';
import jwtService from '../services/jwt.service';


interface AuthenticatedRequest extends FastifyRequest {
	user?: {
		userId: number;
		type?: string;
	};
}

export default async function authRoutes(fastify: FastifyInstance, options: any) {
	const logger = (fastify as any).logger;

	// Login route
	fastify.post<{ Body: LoginCredentials }>(
		'/login',
		{ schema: { body: loginSchema } },
		async (request, reply) => {
		try {
			const credentials = request.body;
			const result = await authService.loginLocalUser(credentials);

			if (result.step === "2fa_required") {
				return reply.code(202).send({
					...result,
					message: "2FA verification required",
				});
			}

			const { accessToken, refreshToken } = result;

			// Set cookies
			authUtils.ft_setCookie(reply, accessToken, 15);
			authUtils.ft_setCookie(reply, refreshToken, 7);

			const user = await authService.getUserProfileByLogin(credentials.login);

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
				reply.status(405).send({
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
		'/register',
		{ schema: { body: signupFormSchema } },
		async (request, reply) => {
		try {
			const { login, password } = request.body;

			// Security validation (JSON schema handles format/length validation)
			const checked_login = authUtils.checkLoginInput(fastify, login);
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

			// Create user
			const { user_id } = await authService.register({
				username: checked_login,
				email,
				password,
			});
			console.log("user created: ", user_id);

			// Generate tokens using new USER_SESSION method
			const { accessToken, refreshToken } = await jwtService.generateTokens(user_id);

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

		} catch (error: any) {
			logger.error('Registration error', error as Error, {
				ip: (request as any).ip,
				login: request.body?.login,
				errorStatus: error.status,
				errorMessage: error.message,
				errorDetails: error.details
			});
			
			// Handle specific error cases
			if (error.status === 401) {
				return reply.code(401).send({
					success: false,
					error: error.message || 'Unauthorized access to user service'
				});
			}
			
			if (error.status === 409) {
				return reply.code(409).send({
					success: false,
					error: error.message || 'User already exists'
				});
			}
			
			if (error.status === 400) {
				return reply.code(400).send({
					success: false,
					error: error.message || 'Invalid user data'
				});
			}
			
			// Generic server error
			return reply.code(500).send({
				success: false,
				error: 'Internal server error during registration'
			});
		}
	});

	// // Refresh token route
	// fastify.post('/refresh', async (request, reply) => {
	// 	try {
	// 		const refreshToken = request.cookies?.refreshToken;
			
	// 		if (!refreshToken) {
	// 			return reply.code(401).send({
	// 				success: false,
	// 				error: 'Refresh token required'
	// 			});
	// 		}

	// 		const result = await authService.refreshAccessToken(fastify, refreshToken);
			
	// 		if (!result.success) {
	// 			return reply.code(401).send({
	// 				success: false,
	// 				error: result.reason || 'Invalid refresh token'
	// 			});
	// 		}

	// 		// Set new access token cookie
	// 		if (result.newAccessToken) {
	// 			authUtils.ft_setCookie(reply, result.newAccessToken, 15);
	// 		}

	// 		return reply.code(200).send({
	// 			success: true,
	// 			message: 'Token refreshed successfully'
	// 		});

	// 	} catch (error) {
	// 		logger.error('Token refresh error', error as Error, {
	// 			ip: (request as any).ip
	// 		});
	// 		return reply.code(500).send({
	// 			success: false,
	// 			error: 'Internal server error during token refresh'
	// 		});
	// 	}
	// });

	// // Logout route - requires USER_SESSION authentication
	// fastify.post('/logout', async (request: AuthenticatedRequest, reply: FastifyReply) => {
	// 	try {
	// 		// Check for access token
	// 		const accessToken = request.cookies?.accessToken;
			
	// 		if (!accessToken) {
	// 			return reply.code(401).send({ 
	// 				success: false, 
	// 				error: 'No access token provided' 
	// 			});
	// 		}

	// 		// Verify the token
	// 		const result = await authService.validate_and_refresh_Tokens(fastify, accessToken, request.cookies?.refreshToken || '');
			
	// 		if (!result.success || !result.userId) {
	// 			return reply.code(401).send({ 
	// 				success: false, 
	// 				error: result.reason || 'Invalid or expired user session' 
	// 			});
	// 		}

	// 		// Revoke tokens
	// 		await authService.revokeTokens(result.userId);

	// 		const cookieOptions = {
	// 			path: '/',
	// 			secure: true,
	// 			httpOnly: true,
	// 			sameSite: 'none' as const
	// 		};

	// 		reply.clearCookie('accessToken', cookieOptions);
	// 		reply.clearCookie('refreshToken', cookieOptions);
			
	// 		return reply.code(200).send({
	// 			success: true,
	// 			message: 'Logged out successfully!'
	// 		});

	// 	} catch (error) {
	// 		logger.error('Logout error', error as Error, {
	// 			userId: (request as any).user?.userId,
	// 			ip: (request as any).ip
	// 		});
	// 		return reply.code(500).send({
	// 			success: false,
	// 			error: 'Internal server error during logout'
	// 		});
	// 	}
	// });

	// // Verify token route - check if user is authenticated
	// fastify.post('/verify', async (request, reply) => {
	// 	try {
	// 		const accessToken = request.cookies?.accessToken;
	// 		const refreshToken = request.cookies?.refreshToken;
			
	// 		if (!accessToken && !refreshToken) {
	// 			return reply.code(401).send({
	// 				success: false,
	// 				error: 'No authentication token provided'
	// 			});
	// 		}

	// 		const verification = await authService.validate_and_refresh_Tokens(fastify, accessToken || '', refreshToken || '');
			
	// 		if (!verification.success) {
	// 			return reply.code(401).send({
	// 				success: false,
	// 				error: 'Invalid or expired token'
	// 			});
	// 		}

	// 		// If the access token was refreshed, update the cookie
	// 		if (verification.newAccessToken) {
	// 			authUtils.ft_setCookie(reply, verification.newAccessToken, 15);
	// 		}

	// 		// Get user profile from users service
	// 		const user = await authService.getUserProfile(verification.userId!);

	// 		return reply.code(200).send({
	// 			success: true,
	// 			id: user.user_id,
	// 			username: user.username,
	// 			avatar_url: user.avatar_url
	// 		});

	// 	} catch (error: any) {
	// 		if (error.code === 'USER_NOT_FOUND') {
	// 			return reply.code(404).send({
	// 				success: false,
	// 				error: 'User not found'
	// 			});
	// 		}
			
	// 		logger.error('Token verification error', error as Error, {
	// 			ip: (request as any).ip
	// 		});
	// 		return reply.code(500).send({
	// 			success: false,
	// 			error: 'Internal server error during token verification'
	// 		});
	// 	}
	// });


	// fastify.get('/account_type', async (request: FastifyRequest, reply: FastifyReply) => {
	// 	try {
	// 		const userId = (request as any).user.userId;

	// 		if (!userId)
	// 			return reply.code(401).send({ success: false, error: "Unauthorized." });

	// 		const user = (fastify as any).db.prepare(`SELECT is_google_account, password FROM users WHERE id = ?`).get(userId);

	// 		if (!user)
	// 			return reply.code(404).send({ success: false, error: "User not found." });

	// 		const isGoogle = !!user.is_google_account;
	// 		const hasPassword = !!(user.password && user.password.trim().length > 0);

	// 		return reply.code(200).send({
	// 			success: true,
	// 			message: "User account type retrieved.",
	// 			data: {
	// 				is_google_account: isGoogle,
	// 				has_password: hasPassword
	// 			}
	// 		});
	// 	} catch (error) {
	// 		logger.error('Error retrieving user account type', error as Error, {
	// 			userId: (request as any).user?.userId,
	// 			ip: (request as any).ip
	// 		});
	// 		return reply.code(500).send({ success: false, error: "Internal server error while retrieving user account type." });
	// 	}
	// });


	// Generate game session jwt [Requires Internal JWT]
	fastify.post<{ Body: GameSessionClaims }>(
        "/token/game",
        { 
            schema: { body: gameSessionClaimsSchema },
            preHandler: internalAuthMiddleware
        },
        async (request, reply) => {
            try {
                const claims: GameSessionClaims = request.body;
                
                // Generate game JWT using centralized method
                const game_jwt = authUtils.generateGameJWT({
                    sub: claims.sub,
                    game_id: claims.game_id
                });
                
                reply.status(201).send({ token: game_jwt });
            } catch (error) {
                logger.error('Game JWT generation error', error as Error, {
                    ip: (request as any).ip,
                    game_id: request.body?.game_id
                });
                return reply.status(500).send({
                    error: 'Internal server error during game JWT generation'
                });
            }
        }
    );

	// Generate internal JWT route - OAuth2-like client credentials flow
	fastify.post('/token/internal', {
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
			const clientCreds = Object.values(CONFIG.CLIENT_CREDENTIALS).find(
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
			const expiresInSeconds = CONFIG.JWT.INTERNAL.ACCESS_TOKEN_EXPIRY === '1h' ? 3600 : 3600;
			
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


}
