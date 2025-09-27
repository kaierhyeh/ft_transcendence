import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import authService from '../services/auth.service.js';
import authUtils from '../utils/auth.utils.js';
import { authMiddleware } from '../middleware/auth.middleware.js';
import { type ILoggerService, type LogContext } from '../container.js';
import { GameSessionClaims, gameSessionClaimsSchema } from '../schemas/auth.js';
import * as jwt from 'jsonwebtoken';
import { SignOptions } from 'jsonwebtoken';
import jwksService from '../services/jwks.service.js';
import { config } from '../config.js';


interface LoginRequest {
	username: string;
	password: string;
}

interface AuthenticatedRequest extends FastifyRequest {
	user?: {
		userId: number;
		type?: string;
	};
}

export async function authRoutes(fastify: FastifyInstance, options: any) {
	const db = (fastify as any).db;
	const logger: ILoggerService = (fastify as any).logger;

	// Login route
	fastify.post('/auth/login', async (request: FastifyRequest<{ Body: LoginRequest }>, reply: FastifyReply) => {
		let username = ''; // Declare for logging context
		try {
			const { username: reqUsername, password } = request.body;
			username = reqUsername;

			if (!username || !password) {
				return reply.code(400).send({ 
					success: false, 
					error: 'Username and password are required' 
				});
			}

			// Find user by username or email (case-insensitive)
			const user = db.prepare(
				"SELECT * FROM users WHERE username = ? COLLATE NOCASE OR email = ? COLLATE NOCASE"
			).get(username, username);

			if (!user) {
				return reply.code(401).send({ 
					success: false, 
					error: 'Invalid credentials' 
				});
			}

			// For Google accounts, password login not allowed
			if (user.is_google_account && !user.password) {
				return reply.code(400).send({
					success: false,
					error: 'This account was created with Google. Please use Google Sign-In.'
				});
			}

			// Verify password
			const isValidPassword = await authUtils.verifyPassword(password, user.password);
			if (!isValidPassword) {
				return reply.code(401).send({ 
					success: false, 
					error: 'Invalid credentials' 
				});
			}

			// Check for 2FA
			if (user.twofa_secret) {
				const tempToken = await authService.generateTempToken(
					{ userId: user.id }, 
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
			const { accessToken, refreshToken } = await authService.generateTokens(user.id);

			// Set cookies
			authUtils.ft_setCookie(reply, accessToken, 15);
			authUtils.ft_setCookie(reply, refreshToken, 7);

			return reply.code(200).send({
				success: true,
				id: user.id,
				username: user.username,
				email: user.email,
				avatar: user.avatar
			});

		} catch (error) {
			logger.error('Login error', error as Error, {
				username,
				ip: (request as any).ip
			});
			return reply.code(500).send({ 
				success: false, 
				error: 'Internal server error during login' 
			});
		}
	});

	// Register route
	fastify.post('/auth/register', async (request: FastifyRequest<{ Body: LoginRequest }>, reply: FastifyReply) => {
		try {
			const { username, password } = request.body;

			if (!username || !password) {
				return reply.code(400).send({
					success: false,
					error: 'Username and password are required.'
				});
			}

			// Validate username (now accepts both traditional usernames and email addresses)
			const checkedUsername = authUtils.checkUsername(fastify, username);
			if (typeof checkedUsername === 'object' && checkedUsername.error) {
				return reply.code(400).send({ 
					success: false, 
					error: checkedUsername.error 
				});
			}

			// Determine if the username is an email address
			const isEmail = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(username);

			// If it's an email, use it as both username and email
			// If it's a traditional username, create a dummy email
			const email = isEmail ? username : `${username}@localhost.local`;

			// Check if user already exists (check both username and email fields)
			const existingUser = db.prepare(
				"SELECT id FROM users WHERE username = ? COLLATE NOCASE OR email = ? COLLATE NOCASE"
			).get(checkedUsername, email);

			if (existingUser) {
				return reply.code(409).send({
					success: false,
					error: 'Username or email already exists'
				});
			}

			// Hash password
			const hashedPassword = await authUtils.hashPassword(password);

			// Create user
			const result = db.prepare(`
				INSERT INTO users (username, password, email)
				VALUES (?, ?, ?)
			`).run(checkedUsername, hashedPassword, email);

			const userId = result.lastInsertRowid;

			// Generate tokens using new USER_SESSION method
			const { accessToken, refreshToken } = await authService.generateTokens(userId);

			// Set cookies
			authUtils.ft_setCookie(reply, accessToken, 15);
			authUtils.ft_setCookie(reply, refreshToken, 7);

			return reply.code(201).send({
				success: true,
				id: userId,
				username: checkedUsername,
				email: email,
				avatar: '/avatar/avatar.png',
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
						player_id: claims.player_id,
						player_type: claims.player_type,
						tournament_id: claims.tournament_id,
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



}
