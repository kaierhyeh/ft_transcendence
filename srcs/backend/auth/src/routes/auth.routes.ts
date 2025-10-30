import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import authService from '../services/auth.service';
import authUtils from '../utils/auth.utils';
import { GameSessionClaims, gameSessionClaimsSchema, LoginCredentials, loginSchema, signupFormSchema, SignupRequest } from '../schemas/auth';
import * as jwt from 'jsonwebtoken';
import { SignOptions } from 'jsonwebtoken';
import jwksService from '../services/jwks.service';
import { CONFIG } from '../config';
import { internalAuthMiddleware } from '../middleware/service-auth';
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
					step: result.step,
					temp_token: result.tempToken, // Convert camelCase to snake_case for frontend
					message: "2FA verification required",
				});
			}

			const { accessToken, refreshToken } = result;

			// Set cookies with proper token types
			authUtils.ft_setCookie(reply, accessToken, CONFIG.JWT.USER.ACCESS_TOKEN_EXPIRY, 'access');
			authUtils.ft_setCookie(reply, refreshToken, CONFIG.JWT.USER.REFRESH_TOKEN_EXPIRY, 'refresh');


			return reply.code(200).send({
                success: true,
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

			if (error.code === "UNSAFE_INPUT") {
				reply.status(400).send({
					error: error.message || 'Unsafe input detected'
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

			const { username, email, password } = request.body;

			// Security validation (control chars, XSS)
			authUtils.checkInputSafety('username', username);
			
			// Normalize email if provided
			const normalizedEmail = email ? authUtils.normalizeEmail(email) : undefined;

			// Check if user already exists by username
			const existingUser = await authService.checkUserExistence(username);
			if (existingUser) {
				return reply.code(409).send({
					success: false,
					error: 'Username already exists'
				});
			}

			// Create user
			const { user_id } = await authService.register({
				username,
				email: normalizedEmail,
				password,
			});
			console.log("user created: ", user_id);

			// Generate tokens using new USER_SESSION method
			const { accessToken, refreshToken } = await jwtService.generateTokens(user_id);

			// Set cookies with proper token types
			authUtils.ft_setCookie(reply, accessToken, CONFIG.JWT.USER.ACCESS_TOKEN_EXPIRY, 'access');
			authUtils.ft_setCookie(reply, refreshToken, CONFIG.JWT.USER.REFRESH_TOKEN_EXPIRY, 'refresh');

			return reply.code(201).send({
				success: true,
				message: 'User registered successfully'
			});

		} catch (error: any) {

			if (error.code === "UNSAFE_INPUT") {
				reply.status(400).send({
					error: error.message || 'Unsafe input detected'
				});
				return;
			}
			
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

	// Refresh token route
	fastify.post('/refresh', async (request, reply) => {
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
				authUtils.ft_setCookie(reply, result.newAccessToken, CONFIG.JWT.USER.ACCESS_TOKEN_EXPIRY, 'access');
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
	fastify.post('/logout', async (request: AuthenticatedRequest, reply: FastifyReply) => {
		try {
			// Check for access token
			const accessToken = request.cookies?.accessToken;
			
			if (!accessToken) {
				console.warn('⚠️ No access token provided for logout');
				return reply.code(401).send({ 
					success: false, 
					error: 'No access token provided' 
				});
			}

			console.log('🔍 Logout attempt - validating token...');

			// Verify the token
			const result = await authService.validate_and_refresh_Tokens(fastify, accessToken, request.cookies?.refreshToken || '');
			
			if (!result.success || !result.userId) {
				console.warn('⚠️ Invalid token during logout:', {
					reason: result.reason,
					hasUserId: !!result.userId
				});
				return reply.code(401).send({ 
					success: false, 
					error: result.reason || 'Invalid or expired user session' 
				});
			}

			console.log('🗑️ Revoking tokens for user:', { userId: result.userId });

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

		} catch (error: any) {
			return reply.code(500).send({
				success: false,
				error: 'Internal server error during logout'
			});
		}
	});

	// Verify token route - check if user is authenticated
	fastify.post('/verify', async (request, reply) => {
		try {
			const accessToken = request.cookies?.accessToken;
			const refreshToken = request.cookies?.refreshToken;
			
			console.log('🔍 Token verification attempt:', {
				hasAccessToken: !!accessToken,
				hasRefreshToken: !!refreshToken,
				accessTokenLength: accessToken ? accessToken.length : 0,
				refreshTokenLength: refreshToken ? refreshToken.length : 0
			});
			
			if (!accessToken && !refreshToken) {
				console.warn('⚠️ No tokens provided for verification');
				return reply.code(401).send({
					success: false,
					error: 'No authentication token provided'
				});
			}

			const verification = await authService.validate_and_refresh_Tokens(fastify, accessToken || '', refreshToken || '');
			
			if (!verification.success) {
				console.warn('⚠️ Token validation failed:', {
					reason: verification.reason,
					hasAccessToken: !!accessToken,
					hasRefreshToken: !!refreshToken
				});
				return reply.code(401).send({
					success: false,
					error: verification.reason || 'Invalid or expired token'
				});
			}

			// If the access token was refreshed, update the cookie
			if (verification.newAccessToken) {
				authUtils.ft_setCookie(reply, verification.newAccessToken, CONFIG.JWT.USER.ACCESS_TOKEN_EXPIRY, 'access');
			}

			// Get user profile from users service
			const user = await authService.getUserProfileById(verification.userId!);

			return reply.code(200).send({
				success: true,
				id: user.user_id,
				username: user.username,
				avatar_url: user.avatar_url,
				avatar_updated_at: user.avatar_updated_at,
			});

		} catch (error: any) {
			if (error.code === 'USER_NOT_FOUND') {
				return reply.code(404).send({
					success: false,
					error: 'User not found'
				});
			}

			return reply.code(500).send({
				success: false,
				error: 'Internal server error during token verification'
			});
		}
	});


	// TODO - That route might need to be removed
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
