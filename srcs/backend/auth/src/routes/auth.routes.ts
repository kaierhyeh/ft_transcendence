import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import authService from '../services/auth.service.js';
import authUtils from '../utils/auth.utils.js';
import { authMiddleware } from '../middleware/auth.middleware.js';
import { type ILoggerService, type LogContext } from '../container.js';

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

			// Find user by username
			const user = db.prepare(
				"SELECT * FROM users WHERE username = ? COLLATE NOCASE"
			).get(username);

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

			// Use username as email if it contains @, otherwise create a dummy email
			const email = username.includes('@') ? username : `${username}@localhost.local`;

			// Validate username
			const checkedUsername = authUtils.checkUsername(fastify, username);
			if (typeof checkedUsername === 'object' && checkedUsername.error) {
				return reply.code(400).send({ 
					success: false, 
					error: checkedUsername.error 
				});
			}

			// Check if user already exists
			const existingUser = db.prepare(
				"SELECT id FROM users WHERE username = ? COLLATE NOCASE OR email = ?"
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
}
