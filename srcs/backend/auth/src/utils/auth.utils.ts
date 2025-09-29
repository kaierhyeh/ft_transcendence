import bcrypt from 'bcrypt';
import type { FastifyReply, FastifyInstance } from 'fastify';

export class AuthUtils {
	// Hash password with bcrypt
	async hashPassword(password: string, saltRounds: number = 10): Promise<string> {
		try {
			return await bcrypt.hash(password, saltRounds);
		} catch (error) {
			console.error('Password hashing error:', error);
			throw new Error('Failed to hash password');
		}
	}

	// Verify password with bcrypt
	async verifyPassword(password: string, hashedPassword: string): Promise<boolean> {
		try {
			return await bcrypt.compare(password, hashedPassword);
		} catch (error) {
			console.error('Password verification error:', error);
			throw new Error('Failed to verify password');
		}
	}

	// Configure and set cookies with flexible expiration time
	ft_setCookie(reply: any, token: string, duration: number): void {
		const cookieOptions = {
			path: '/',
			secure: true,
			httpOnly: true,
			sameSite: 'none' as const,
		};

		// Accepted cases: 1min (debug), 5min, 15min or 7days
		if (duration === 1) { // 🔧 Debug purpose only
			reply.setCookie('accessToken', token, {
				...cookieOptions,
				maxAge: 60 // 1 minute
			});
		} else if (duration === 5 || duration === 15) {
			reply.setCookie('accessToken', token, {
				...cookieOptions,
				maxAge: duration * 60
			});
		} else if (duration === 7) {
			reply.setCookie('refreshToken', token, {
				...cookieOptions,
				maxAge: duration * 24 * 60 * 60
			});
		} else {
			throw new Error("Invalid duration: only 1 (debug), 5, 15 (minutes) or 7 (days) are allowed.");
		}
		return reply;
	}

	/**
	 * Security validation for login input (username or email)
	 * Performs security checks that can't be handled by JSON schema
	 * 
	 * @param fastify - Fastify instance for logging
	 * @param login - The login input (username or email)
	 * @returns Sanitized login string or error object
	 */
	checkLogin(fastify: any, login: string): { error: string } | string {
		fastify.log.info(`Security check for login: ${login}`);

		// Note: Basic format validation is handled by JSON schema
		// This function focuses on security concerns

		// Check for control characters and escape sequences
		if (/[\x00-\x1F\x7F]/.test(login)) {
			fastify.log.warn("Security check failed: login contains control characters");
			return { error: "Login contains invalid characters" };
		}

		// Check for XSS patterns
		if (/<[^>]*>|script|alert|onerror|onclick|javascript:|&lt;|\"|\'|%3C/.test(login.toLowerCase())) {
			fastify.log.warn("Security check failed: login contains potentially malicious patterns");
			return { error: "Login contains invalid characters" };
		}

		// Check for excessive repetition of characters (security concern)
		if (/(.)\1{6,}/.test(login)) {
			fastify.log.warn("Security check failed: login contains excessive repeated characters");
			return { error: "Login cannot contain more than 6 repeated characters in a row" };
		}

		// Normalize the login:
		// - Email addresses: lowercase
		// - Usernames: capitalize first letter
		const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
		if (emailRegex.test(login)) {
			return login.toLowerCase();
		} else {
			// Traditional username normalization
			return login.charAt(0).toUpperCase() + login.slice(1).toLowerCase();
		}
	}
}

export default new AuthUtils();