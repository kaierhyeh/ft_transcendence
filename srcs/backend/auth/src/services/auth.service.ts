import jwt, { SignOptions } from 'jsonwebtoken';
import { CONFIG } from '../config';
import jwksService from './jwks.service';
import { JWTType, JWTPayload, UserSessionPayload } from '../types/jwt.types';
import { LocalUserCreationData, UserProfile } from '../clients/UsersClient';
import { LoginCredentials } from '../schemas/auth';
import redis from '../clients/RedisClient';
import jwtService from './jwt.service';
import usersClient from '../clients/UsersClient';
import authUtils from '../utils/auth.utils';

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

export type LoginLocalResult =
    | { step: "2fa_required"; tempToken: string }
    | { step: "done"; accessToken: string; refreshToken: string }

/**
 * Enhanced Authentication Service supporting three JWT types:
 * - USER_SESSION: Traditional user authentication (access + refresh tokens)
 * - GAME_SESSION: Game-specific temporary sessions  
 * - INTERNAL_ACCESS: Service-to-service communication
 */
export class AuthService {

	async loginLocalUser(credentials: LoginCredentials): Promise<LoginLocalResult> {

		const { user_id, two_fa_enabled, two_fa_secret } = await usersClient.resolveLocalUser(credentials);

		if (two_fa_enabled && two_fa_secret) {
			const tempToken = await jwtService.generateTempToken(
				{ userId: user_id }, 
				"2fa", 
				300);
			return { step: "2fa_required", tempToken };
		}
		const tokens = await jwtService.generateTokens(user_id);
		return { step: "done", ...tokens };
	}

	async checkUserExistence(identifier: string): Promise<boolean> {
		try {
			await usersClient.getUser(identifier);
		} catch(error) {
			const status = (error as any).status;
			if (status === 404) {
				return false; // User not found
			}
			if (status === 401) {
				// Authentication issue with users service - log for debugging
				console.error('🔐 Internal auth failed when checking user existence:', {
					identifier: identifier,
					status,
					message: (error as any).message,
					details: (error as any).details
				});
				// Treat as "user not found" for now, but log the issue
				return false;
			}
			// Re-throw other errors (500, network issues, etc.)
			throw error;
		}
		return true;
    }

	async register(data: LocalUserCreationData): Promise< {user_id: number} > {
		const result = usersClient.register(data);
		return result;
	}
	

		// Verify temporary token (OAuth state, email verification, etc.)
	async verifyTempToken(token: string) {
		try {
			const payload = jwt.verify(token, CONFIG.JWT.USER.TEMP_SECRET); // Keep using symmetric for temp tokens
			
			// Only delete the temp token if verification succeeds (single use)
			await redis.del(`temp_${token}`);
			
			return { valid: true, payload };
		} catch (error: any) {
			return { valid: false, error: error.message };
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
			? CONFIG.JWT.INTERNAL 
			: CONFIG.JWT.GAME;

		// Verify JWT signature and expiry using RSA public key
		const decoded = jwt.verify(token, jwtConfig.PUBLIC_KEY, { 
			algorithms: [jwtConfig.ALGORITHM] 
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
				console.warn('⚠️ No access token provided.');
				throw new Error('No access token provided.');
			}
			console.log('🔍 ACCESS TOKEN CHECK...');

			// Check if the token is valid using RSA public key
			const decoded = jwt.verify(accessToken, CONFIG.JWT.USER.PUBLIC_KEY, { 
				algorithms: [CONFIG.JWT.USER.ALGORITHM],
				issuer: CONFIG.JWT.USER.ISSUER
			}) as UserSessionPayload;
			
			// Extract userId from sub field
			const user_id = parseInt(decoded.sub);

			// Check if the token is blacklisted
			const isBlacklisted = await redis.get(`blacklist_${accessToken}`);
			if (isBlacklisted) {
				console.warn('⚠️ Token is blacklisted.');
				throw new Error('Token is blacklisted.');
			}

			// Check if user exists in the database
			try {
				await this.checkUserExistence(user_id.toString());
			} catch(error) {
				if ((error as any).status === 404) {
					console.warn('⚠️ User not found in the users service, revoking tokens...');
					await this.revokeTokens(user_id);
					throw new Error('User not found in the users service, tokens revoked.');
				}
			}

			// Verify if the token is the latest
			const currentAccessToken = await redis.get(`access_${user_id}`);
			if (accessToken !== currentAccessToken) {
				throw new Error('Token is not the latest one.');
			}

			return {
				success: true,
				userId: user_id
			};

		} catch (error) {
			// If the access token is expired, try to refresh it using the refresh token
			if (!refreshToken) {
				return { success: false, reason: 'No refresh token provided.' };
			}

			try {
				const result = await this.refreshAccessToken(fastify, refreshToken, accessToken);
				if (!result.success) {
					return { success: false, reason: 'Failed to refresh access token, invalid refresh token.' };
				}
				return {
					success: true,
					userId: result.userId,
					newAccessToken: result.newAccessToken,
				};
			} catch (refreshError) {
				return { success: false, reason: 'Fail to verify refresh token.' };
			}
		}
	}

	// Refresh the access token using the refresh token
	async refreshAccessToken(fastify: any, refreshToken: string, oldAccessToken?: string) {
		try {
			// Check if the token is valid using RSA public key
			const decoded = jwt.verify(refreshToken, CONFIG.JWT.USER.PUBLIC_KEY, { 
				algorithms: [CONFIG.JWT.USER.ALGORITHM],
				issuer: CONFIG.JWT.USER.ISSUER
			}) as UserSessionPayload;
			
			// Extract userId from sub field
			const user_id = parseInt(decoded.sub);

			// Check if the token is blacklisted
			const isBlacklisted = await redis.get(`blacklist_${refreshToken}`);
			if (isBlacklisted) {
				console.warn('⚠️ refreshToken is blacklisted.');
				return { success: false, reason: 'refreshToken is blacklisted.' };
			}

			// Check if user exists in the database
			try {
				await this.checkUserExistence(user_id.toString());
			} catch(error) {
				if ((error as any).status === 404) {
					console.warn('⚠️ User not found in the users service, revoking tokens...');
					await this.revokeTokens(user_id);
					return { success: false, reason: 'User not found in the database, tokens revoked' };
				}
			}

			// Check if it's the current refresh token
			const currentRefreshToken = await redis.get(`refresh_${user_id}`);
			if (refreshToken !== currentRefreshToken) {
				console.warn(`⚠️ Token is not the latest one.`);
				return { success: false, reason: 'Token is not the latest one.' };
			}

			// Blacklist the old access token (if provided)
			if (oldAccessToken) {
				await jwtService.blacklistToken(oldAccessToken);
				console.log('🗑️ Old access token has been blacklisted.');
			}

			// Create a new access token using RSA private key
			const keyId = jwksService.getKeyIdForType(JWTType.USER_SESSION);
			if (!keyId) {
				throw new Error('USER_SESSION key ID not available in JWKS service');
			}
			
			const newAccessToken = jwt.sign(
				{ 
					sub: user_id.toString(),  // JWT standard: sub as string
					type: JWTType.USER_SESSION,  // Proper JWT type
						token_type: 'access',  // Distinguish access vs refresh
						iss: CONFIG.JWT.USER.ISSUER
					},
					CONFIG.JWT.USER.PRIVATE_KEY,
					{ 
					algorithm: CONFIG.JWT.USER.ALGORITHM,
					expiresIn: CONFIG.JWT.USER.ACCESS_TOKEN_EXPIRY,
					keyid: keyId
				} as SignOptions
			);

			// Store the new token using centralized duration parser
			const expiryInSeconds = authUtils.parseDurationToSeconds(CONFIG.JWT.USER.ACCESS_TOKEN_EXPIRY);
			await redis.setex(`access_${user_id}`, expiryInSeconds, newAccessToken);
			return {
						success: true,
						userId: user_id,
						newAccessToken
			};
		} catch (error) {
			console.error('❌ Fail to verify refresh token.', error);
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
				accessToken ? jwtService.blacklistToken(accessToken) : null,
				refreshToken ? jwtService.blacklistToken(refreshToken) : null
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

	async getUserProfileById(userId: number): Promise<UserProfile> {
		return await usersClient.getUserProfile(userId);
	}

	// TODO -to remove (not used)
	async getUserProfileByLogin(login: string): Promise<UserProfile> {
		return await usersClient.getUser(login);
	}
	
}

export default new AuthService();