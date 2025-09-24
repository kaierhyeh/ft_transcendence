import bcrypt from 'bcrypt';

export class AuthUtils {
	// Hash password with bcrypt
	async hashPassword(password, saltRounds = 10) {
		try {
			return await bcrypt.hash(password, saltRounds);
		} catch (error) {
			console.error('Password hashing error:', error);
			throw new Error('Failed to hash password');
		}
	}

	// Verify password with bcrypt
	async verifyPassword(password, hashedPassword) {
		try {
			return await bcrypt.compare(password, hashedPassword);
		} catch (error) {
			console.error('Password verification error:', error);
			throw new Error('Failed to verify password');
		}
	}

	// Configure and set cookies with flexible expiration time
	ft_setCookie(reply, token, duration) {
		const cookieOptions = {
			path: '/',
			secure: true,
			httpOnly: true,
			sameSite: 'None',
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

	checkUsername(fastify, username) {
		fastify.log.info(`Checking username: ${username}`);

		// Check for null/undefined
		if (username === null || username === undefined) {
			fastify.log.warn("Search failed: username is null or undefined");
			return { error: "Username is required" };
		}

		// Make sure username is a string
		if (typeof username !== 'string') {
			fastify.log.warn("Search failed: username is not a string");
			return { error: "Username must be a text value" };
		}

		const trimmedUsername = username.trim();
		if (!trimmedUsername.length) {
			fastify.log.warn("Search failed: username is empty after trimming");
			return { error: "Username is required" };
		}

		// Check for control characters and escape sequences
		if (/[\x00-\x1F\x7F]/.test(trimmedUsername)) {
			fastify.log.warn("Search failed: username contains control characters");
			return { error: "Username contains invalid characters" };
		}

		// Check for various XSS patterns (more comprehensive)
		if (/<[^>]*>|script|alert|onerror|onclick|javascript:|&lt;|\"|\'|%3C/.test(trimmedUsername.toLowerCase())) {
			fastify.log.warn("Search failed: username contains potentially malicious patterns");
			return { error: "Username contains invalid characters" };
		}

		// Check for excessive repetition of characters (ie. aaaaaaa)
		if (/(.)\1{3,}/.test(trimmedUsername)) {
			fastify.log.warn("Search failed: username contains excessive repeated characters");
			return { error: "Username cannot contain more than 3 repeated characters in a row" };
		}

		const capitalizedUsername = trimmedUsername.charAt(0).toUpperCase() + trimmedUsername.slice(1).toLowerCase();
		const usernameRegex = /^[a-zA-Z][a-zA-Z0-9_]{3,15}$/;
		if (!usernameRegex.test(capitalizedUsername)) {
			return { error: "Username must be 3-15 characters, letters/numbers/underscores only." };
		}

		return capitalizedUsername;
	}
}

export default new AuthUtils();