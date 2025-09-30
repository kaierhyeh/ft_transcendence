import jwt, { SignOptions } from 'jsonwebtoken';
import { config } from '../config.js';
import jwksService from './jwks.service.js';
import { JWTType, JWTPayload } from '../types.js';
import { LocalUserCreationData, UserData, UserClient, UserProfile } from '../clients/UserClient.js';
import { LoginRequest } from '../schemas/auth.js';
import authUtils from '../utils/auth.utils.js';

// JWT Types for three-tier system - using imported enum
export type { JWTType, JWTPayload } from '../types.js';

export interface TokenValidationResult {
	valid: boolean;
	payload?: JWTPayload;
	expired?: boolean;
	blacklisted?: boolean;
	error?: string;
}

export interface TokenPair {
	accessToken: string;
	refreshToken: string;
}

export interface ValidationResult {
	success: boolean;
	userId?: number;
	newAccessToken?: string;
	reason?: string;
}

/**
 * Enhanced Authentication Service supporting three JWT types:
 * - USER_SESSION: Traditional user authentication (access + refresh tokens)
 * - GAME_SESSION: Game-specific temporary sessions  
 * - INTERNAL_ACCESS: Service-to-service communication
 */
export class AuthService {

	private userClient: UserClient;

	constructor() {
		this.userClient = new UserClient();
	}

	async validateLocalUser(data: LoginRequest): Promise<User> {

		const raw_user = await this.userClient.getUserByLogin(data.login);

		if (raw_user.google_sub) {
			const error = new Error('Not a local user');
			(error as any).code = 'NOT_A_LOCAL_USER';
			throw error;
		}

		const is_valid_password = await authUtils.verifyPassword(data.password, raw_user.password_hash);
		if (!is_valid_password) {
			const error = new Error('Invalid credentials');
			(error as any).code = 'INVALID_CREDENTIALS';
			throw error;
		}

		const { google_sub, ...user } = raw_user;
		return { ...user };
	}

	async getUserById(userId: number): Promise<User> {
		const raw_user = await this.userClient.getUserById(userId);
		if (!raw_user) {
			const error = new Error('User not found');
			(error as any).code = 'USER_NOT_FOUND';
			throw error;
		}

		const { google_sub, ...user } = raw_user;
		return { ...user };
	}

	async checkUserExistence(login: string): Promise<boolean> {
		try {
			await this.userClient.getUserByLogin(login);
		} catch(error) {
			if ((error as any).status === 404)
				return false;
			throw error;
		}
		return true;
    }

	async register(data: LocalUserCreationData): Promise< {user_id: number} > {
		const result = this.userClient.register(data);
		return result;
	}
	// Generate a new access token and refresh token for the user using the userId and JWT manager
	// The access token is valid for 15 minutes and the refresh token for 7 days
	// The tokens are stored in Redis with the userId as key
	// The access token is used to authenticate the user and the refresh token is used to generate a new access token
	async generateTokens(userId: number): Promise<TokenPair> {
		// Check if tokens already exist for this user
		const [existingAccessToken, existingRefreshToken] = await Promise.all([
			redis.get(`access_${userId}`),
			redis.get(`refresh_${userId}`)
		]);

		let accessToken = null;
		let refreshToken = null;

		// Handle existing access token
		if (existingAccessToken) {
			try {
				// Verify if the token is still valid using RSA public key
				jwt.verify(existingAccessToken, config.jwt.user.publicKey, { algorithms: [config.jwt.user.algorithm] });
				accessToken = existingAccessToken;
			} catch (error) {
				// If invalid, blacklist it and prepare to generate a new one
				await this.blacklistToken(existingAccessToken);
			}
		}

		// Handle existing refresh token
		if (existingRefreshToken) {
			try {
				// Verify the token is still valid using RSA public key
				jwt.verify(existingRefreshToken, config.jwt.user.publicKey, { algorithms: [config.jwt.user.algorithm] });
				refreshToken = existingRefreshToken;
			} catch (error) {
				// If invalid, blacklist it and prepare to generate a new one
				await this.blacklistToken(existingRefreshToken);
			}
		}

		// Generate new access token if needed
		if (!accessToken) {
			const signOptions: SignOptions = {
				algorithm: config.jwt.user.algorithm,
				expiresIn: config.jwt.user.accessTokenExpiry as any,
				keyid: jwksService.getCurrentKeyId()
			};
			accessToken = jwt.sign({ userId, type: 'access' }, config.jwt.user.privateKey!, signOptions);
			// Convert expiry to seconds for Redis
			const expiryInSeconds = config.jwt.user.accessTokenExpiry === '15m' ? 15 * 60 : parseInt(config.jwt.user.accessTokenExpiry);
			await redis.setex(`access_${userId}`, expiryInSeconds, accessToken);
		}

		// Generate new refresh token if needed
		if (!refreshToken) {
			const signOptions: SignOptions = {
				algorithm: config.jwt.user.algorithm,
				expiresIn: config.jwt.user.refreshTokenExpiry as any,
				keyid: jwksService.getCurrentKeyId()
			};
			refreshToken = jwt.sign({ userId, type: 'refresh' }, config.jwt.user.privateKey!, signOptions);
			// Convert expiry to seconds for Redis
			const expiryInSeconds = config.jwt.user.refreshTokenExpiry === '7d' ? 7 * 24 * 60 * 60 : parseInt(config.jwt.user.refreshTokenExpiry);
			await redis.setex(`refresh_${userId}`, expiryInSeconds, refreshToken);
		}
		
		return { accessToken, refreshToken };
	}

	async generateTempToken(payload: any, type = "generic", expiresInSeconds = 300) {
		const token = jwt.sign({ ...payload, type }, config.jwt.user.tempSecret, {
			expiresIn: expiresInSeconds
		});

		await redis.setex(`temp_${token}`, expiresInSeconds, 'valid');

		return token;
	}

		// Verify temporary token (OAuth state, email verification, etc.)
	async verifyTempToken(token: string) {
		try {
			const payload = jwt.verify(token, config.jwt.user.tempSecret); // Keep using symmetric for temp tokens
			return { valid: true, payload };
		} catch (error: any) {
			return { valid: false, error: error.message };
		} finally {
			// Always delete the temp token after verification (single use)
			await redis.del(`temp_${token}`);
		}
	}

	// Simple token validation for GAME_SESSION and INTERNAL_ACCESS (no refresh capability)
	async validateToken(token: string, expectedType: JWTType): Promise<TokenValidationResult> {
		try {
			if (!token) {
				return { valid: false, error: 'No token provided' };
			}

		// Get the correct config for the JWT type
		const jwtConfig = expectedType === JWTType.INTERNAL_ACCESS 
			? config.jwt.internal 
			: config.jwt.game;

		// Verify JWT signature and expiry using RSA public key
		const decoded = jwt.verify(token, jwtConfig.publicKey, { 
			algorithms: [jwtConfig.algorithm] 
		}) as JWTPayload;			// Check if token type matches expected type
			if (decoded.type !== expectedType) {
				return { 
					valid: false, 
					error: `Invalid token type. Expected: ${expectedType}, Got: ${decoded.type}` 
				};
			}

			// Check if token is blacklisted
			const isBlacklisted = await redis.get(`blacklist_${token}`);
			if (isBlacklisted) {
				return { valid: false, blacklisted: true, error: 'Token is blacklisted' };
			}

			// Return the full decoded payload without adding undefined fields
			return {
				valid: true,
				payload: decoded
			};

		} catch (error: any) {
			if (error.name === 'TokenExpiredError') {
				return { valid: false, expired: true, error: 'Token has expired' };
			}
			return { valid: false, error: error.message };
		}
	}

	// Verify if the access token is valid (not blacklisted, user exists, in redis, not expired)
	// If the token is expired, it tries to refresh it using the refresh token
	// If both tokens are invalid, it clears the cookies and returns a 401 error
	async validate_and_refresh_Tokens(fastify: any, accessToken: string, refreshToken: string) {
		try {
			if (!accessToken) {
				fastify.log.warn('No access token provided.');
				throw new Error('No access token provided.');
			}
			fastify.log.info('ACCESS TOKEN CHECK...');

			// Check if the token is valid using RSA public key
			const decoded = jwt.verify(accessToken, config.jwt.user.publicKey, { algorithms: [config.jwt.user.algorithm] }) as { userId: number; type: string };

			// Check if the token is blacklisted
			const isBlacklisted = await redis.get(`blacklist_${accessToken}`);
			if (isBlacklisted) {
				fastify.log.warn('Token is blacklisted.');
				throw new Error('Token is blacklisted.');
			}

			// Check if user exists in the database
			if (fastify.db) {
				const userExists = fastify.db.prepare("SELECT id FROM users WHERE id = ?").get(decoded.userId);

				if (!userExists) {
					fastify.log.warn('User not found in the database, revoking tokens...');
					await this.revokeTokens(decoded.userId);
					throw new Error('User not found in the database, tokens revoked.');
				}
			}

			// Verify if the token is the latest
			const currentAccessToken = await redis.get(`access_${decoded.userId}`);
			if (accessToken !== currentAccessToken) {
				fastify.log.warn(`Token is not the latest one.`);
				throw new Error('Token is not the latest one.');
			}

			fastify.log.info('Access Token is valid.\n');
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
				return { success: false, reason: 'No refresh token provided.' };
			}

			try {
				const result = await this.refreshAccessToken(fastify, refreshToken, accessToken);
				if (!result.success) {
					fastify.log.warn(`Failed to refresh access token, invalid refresh token.`);
					return { success: false, reason: 'Failed to refresh access token, invalid refresh token.' };
				}
				fastify.log.info(`New access token generated successfully.`);
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

	// Refresh the access token using the refresh token
	async refreshAccessToken(fastify: any, refreshToken: string, oldAccessToken?: string) {
		try {
			// Check if the token is valid using RSA public key
			const decoded = jwt.verify(refreshToken, config.jwt.user.publicKey, { algorithms: [config.jwt.user.algorithm] }) as { userId: number; type: string };

			// Check if the token is blacklisted
			const isBlacklisted = await redis.get(`blacklist_${refreshToken}`);
			if (isBlacklisted) {
				fastify.log.warn('refreshToken is blacklisted.');
				return { success: false, reason: 'refreshToken is blacklisted.' };
			}

			// Check if user exists in the database
			if (fastify.db) {
				const userExists = fastify.db.prepare("SELECT id FROM users WHERE id = ?").get(decoded.userId);

				if (!userExists) {
					fastify.log.warn('User not found in the database, revoking tokens...');
					await this.revokeTokens(decoded.userId);
					return { success: false, reason: 'User not found in the database, tokens revoked' };
				}
			}

			// Check if it's the current refresh token
			const currentRefreshToken = await redis.get(`refresh_${decoded.userId}`);
			if (refreshToken !== currentRefreshToken) {
				fastify.log.warn(`Token is not the latest one.`);
				return { success: false, reason: 'Token is not the latest one.' };
			}

			// Blacklist the old access token (if provided)
			if (oldAccessToken) {
				await this.blacklistToken(oldAccessToken);
				fastify.log.info('Old access token has been blacklisted.');
			}

			// Create a new access token using RSA private key
			const newAccessToken = jwt.sign(
				{ userId: decoded.userId, type: 'access' },
				config.jwt.user.privateKey,
				{ 
					algorithm: config.jwt.user.algorithm,
					expiresIn: config.jwt.user.accessTokenExpiry,
					keyid: jwksService.getCurrentKeyId() // Add key ID to JWT header
				} as SignOptions
			);

			// Store the new token
			const expiryInSeconds = config.jwt.user.accessTokenExpiry === '15m' ? 15 * 60 : parseInt(config.jwt.user.accessTokenExpiry);
			await redis.setex(`access_${decoded.userId}`, expiryInSeconds, newAccessToken);

			return {
				success: true,
				userId: decoded.userId,
				newAccessToken
			};
		} catch (error) {
			fastify.log.error(error, 'Fail to verify refresh token.');
			return { success: false, reason: 'Fail to verify refresh token.' };
		}
	}

	// Revoke tokens for a user by userId
	async revokeTokens(userId: number) {
		try {
			// Retrieve the current access and refresh tokens from Redis
			const [accessToken, refreshToken] = await Promise.all([
				redis.get(`access_${userId}`),
				redis.get(`refresh_${userId}`)
			]);

			// Blacklist the tokens
			const blacklistPromises = [
				accessToken ? this.blacklistToken(accessToken) : null,
				refreshToken ? this.blacklistToken(refreshToken) : null
			].filter(Boolean);

			// Delete the tokens from Redis
			const cleanupPromises = [
				redis.del(`access_${userId}`),
				redis.del(`refresh_${userId}`)
			];

			// Wait for all promises to resolve
			await Promise.all([...blacklistPromises, ...cleanupPromises]);
			return true;
		} catch (error) {
			console.error('Token revocation error:', error);
			return false;
		}
	}

	async getUserProfile(userId: number): Promise<UserProfile> {
		return await this.userClient.getUserProfile(userId);
	}

	async updatePasswordHash(old_hash: string, old_password: string, new_password: string): Promise<string> {
		// First verify the old password matches the old hash
		const valid = await authUtils.verifyPassword(old_password, old_hash);
		if (!valid) {
			const error = new Error('Invalid current password');
			(error as any).code = 'INVALID_CURRENT_PASSWORD';
			throw error;
		}

		// If verification passes, hash the new password
		return await authUtils.hashPassword(new_password);
	}

	// Blacklist a token by adding it to the Redis blacklist with its remaining duration
	async blacklistToken(token: string) {
		try {
			// Get the decoded token to check its expiry time
			const decoded = jwt.decode(token) as { exp: number } | null;
			if (!decoded) return false;

			// Calculate the remaining duration of the token
			const expiryTime = decoded.exp;
			const now = Math.floor(Date.now() / 1000);
			const timeRemaining = Math.max(expiryTime - now, 0);

			// Add to the blacklist with the exact remaining duration
			if (timeRemaining > 0) {
				await redis.setex(`blacklist_${token}`, timeRemaining, 'true');
				return true;
			}

			return false;
		} catch (error) {
			console.error('Token blacklisting error:', error);
			return false;
		}
	}
}

export default new AuthService();