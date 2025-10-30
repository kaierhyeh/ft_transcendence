import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { google } from 'googleapis';
import authService from '../services/auth.service';
import jwtService from '../services/jwt.service';
import authUtils from '../utils/auth.utils';
import usersClient from '../clients/UsersClient';
import { CONFIG } from '../config';
const oauth2Client = new google.auth.OAuth2(
	CONFIG.OAUTH.GOOGLE_CLIENT_ID,
	CONFIG.OAUTH.GOOGLE_CLIENT_SECRET,
	CONFIG.OAUTH.GOOGLE_REDIRECT_URI
);

// 📌 Route: google/token
// Trade the authorization code for tokens and user info
// This route is used to authenticate the user with Google OAuth
// and create or update the user in the database
// It also handles 2FA if enabled for the user
// It returns the access and refresh tokens in cookies
export default async function oauthRoutes(fastify: FastifyInstance, options: any) {
	const logger = (fastify as any).logger;
	
	// GET /api/auth/google/config - Serve Google OAuth client configuration
	fastify.get('/config', async (request: FastifyRequest, reply: FastifyReply) => {
		try {
			if (!CONFIG.OAUTH.GOOGLE_CLIENT_ID) {
				return reply.code(503).send({ 
					success: false, 
					error: 'Google OAuth is not configured' 
				});
			}

			return reply.code(200).send({
				success: true,
				clientId: CONFIG.OAUTH.GOOGLE_CLIENT_ID,
				redirectUri: CONFIG.OAUTH.GOOGLE_REDIRECT_URI || 'https://localhost:4443/auth/google/callback'
			});
		} catch (error) {
			logger.error('Error fetching Google OAuth config', error as Error);
			return reply.code(500).send({ 
				success: false, 
				error: 'Failed to fetch OAuth configuration' 
			});
		}
	});
	
	fastify.post('/', async (request: FastifyRequest<{ Body: { code: string } }>, reply: FastifyReply) => {
		try {
			const { code } = request.body;
			if (!code)
				return reply.code(400).send({ success: false, error: 'Authorization code is required' });

			// Trade the authorization code for tokens
			const { tokens } = await oauth2Client.getToken(code);
			oauth2Client.setCredentials(tokens);

			// Get user info from Google
			const oauth2 = google.oauth2({ version: 'v2', auth: oauth2Client });
			const { data } = await oauth2.userinfo.get();

			if (!data.id) {
				return reply.code(400).send({ success: false, error: 'Invalid Google user data' });
			}

			// Check if user exists via usersClient using google_sub
			let user;
			try {
				user = await usersClient.getUserByGoogleSub(data.id);
			} catch (error: any) {
				if (error.status !== 404) {
					throw error; // Re-throw if not "user not found"
				}
				// User doesn't exist, continue to registration flow
			}

			// Send a temporary token to the frontend for username selection
			if (!user) {
				const tempPayload = {
					google_sub: data.id,
					google_name: data.given_name || data.name,
					google_email: data.email,
					avatar_url: data.picture
				};

				const tempToken = await jwtService.generateTempToken(tempPayload, "google_oauth", 600);

				// Answer with a 202 status code and a message to choose a username
				return reply.code(202).send({
					step: "choose_username",
					message: "Please choose a username to complete your Google account setup",
					temp_token: tempToken
				});
			}

			// Check if 2FA is enabled for the user
			const twoFAStatus = await usersClient.get2FAStatus(user.user_id);
			
			if (twoFAStatus.enabled) {
				// User has 2FA enabled, require 2FA verification
				const tempPayload = {
					user_id: user.user_id,
					requires_2fa: true
				};

				const tempToken = await jwtService.generateTempToken(tempPayload, "2fa_pending", 300); // 5 min expiry

				return reply.code(200).send({
					success: true,
					requires_2fa: true,
					temp_token: tempToken,
					user_id: user.user_id
				});
			}
			
			// No 2FA required, proceed with normal login
			const { accessToken, refreshToken } = await jwtService.generateTokens(user.user_id);

			// Set cookies with tokens
			authUtils.ft_setCookie(reply, accessToken, CONFIG.JWT.USER.ACCESS_TOKEN_EXPIRY, 'access');
			authUtils.ft_setCookie(reply, refreshToken, CONFIG.JWT.USER.REFRESH_TOKEN_EXPIRY, 'refresh');

			return reply.code(200).send({
				success: true,
				id: user.user_id,
				username: user.username,
				avatar_url: user.avatar_url
			});

		} catch (error) {
			logger.error('Google OAuth error', error as Error, {
				ip: (request as any).ip
			});
			return reply.code(500).send({ success: false, error: 'Internal server error while processing Google OAuth.' });
		}
	});

	fastify.post("/username", async (request: FastifyRequest<{ Body: { username: string; temp_token: string } }>, reply: FastifyReply) => {
		try {
			const { username, temp_token } = request.body;
			
			// Verify token and get the payload from it
			const payload = await authService.verifyTempToken(temp_token);
		
			if (!payload.valid || !payload.payload) {
				return reply.code(401).send({
					success: false,
					error: 'Invalid temporary token'
				});
			}

			const payloadData = payload.payload as any;

			// Security validation
			authUtils.checkInputSafety('username', username);

			// Check if username already exists
			try {
				await usersClient.getUser(username);
				return reply.code(400).send({ success: false, error: "Username already taken." });
			} catch (error: any) {
				if (error.status !== 404) {
					throw error;
				}
				// Username doesn't exist, continue
			}

			// Create the user via usersClient
			const { user_id } = await usersClient.registerGoogleUser({
				google_sub: payloadData.google_sub,
				username: username,
				email: payloadData.google_email,
				alias: payloadData.google_name
			});

			// Get user profile
			const user = await usersClient.getUserProfile(user_id);

			// TODO: Check if 2FA is enabled (should not happen during registration)
			// For now, skip 2FA check during registration

			// Generate access and refresh tokens
			const { accessToken, refreshToken } = await jwtService.generateTokens(user_id);

			// Send the response with tokens in cookies
			authUtils.ft_setCookie(reply, accessToken, CONFIG.JWT.USER.ACCESS_TOKEN_EXPIRY, 'access');
			authUtils.ft_setCookie(reply, refreshToken, CONFIG.JWT.USER.REFRESH_TOKEN_EXPIRY, 'refresh');

			return reply.code(201).send({
				success: true,
				id: user.user_id,
				username: user.username,
				avatar_url: user.avatar_url,
				avatar_updated_at: user.avatar_updated_at,
				message: "Google account created and user authenticated."
			});

		} catch (error: any) {
			if (error.code === "UNSAFE_INPUT") {
				return reply.status(400).send({
					error: error.message || 'Unsafe input detected'
				});
			}
			
			logger.error('Google OAuth complete-register error', error as Error, {
				ip: (request as any).ip
			});
			return reply.code(500).send({ success: false, error: 'Internal server error while completing Google account registration.' });
		}
	});

	// Google OAuth callback route
	fastify.get('/callback', async (request: FastifyRequest<{ Querystring: { code?: string; error?: string } }>, reply: FastifyReply) => {
		try {
			const { code, error } = request.query;
			
			if (error) {
				// Redirect to frontend with error
				return reply.redirect(`https://localhost:4443/auth/google/callback?error=${encodeURIComponent(error)}`);
			}
			
			if (code) {
				// Redirect to frontend with authorization code
				return reply.redirect(`https://localhost:4443/auth/google/callback?code=${encodeURIComponent(code)}`);
			}
			
			// No code or error, redirect to profile
			return reply.redirect('https://localhost:4443/profile');
			
		} catch (error) {
			logger.error('Error in Google OAuth callback', error as Error, {
				ip: (request as any).ip
			});
			return reply.redirect(`https://localhost:4443/auth/google/callback?error=server_error`);
		}
	});
}