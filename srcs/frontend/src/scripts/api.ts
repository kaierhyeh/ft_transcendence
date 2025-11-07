import { user, User, update_user, OtherUser } from './users.js';
import { ASection, go_section, sections, get_type_index, get_url_type, show2FAVerificationModal, update_sections } from './sections.js';
import { showSuccess, showError, showInfo } from './notifications.js';


export async function verify_token(): Promise<void> {
	try {
		const response = await fetch(`/api/verify_token`, {
			method: "POST",
			credentials: 'include'
		});
		const data = await response.json();

		if (!response.ok || !data.success) {
			update_user(undefined);
			return;
		}

		if (user !== undefined && user.name === data.username)
			return;

		if (user?.web_socket && user?.web_socket.readyState === WebSocket.OPEN)
			user.web_socket.close(1000);

		update_user(new User(data.username, data.id, data.email, data.avatar));

	} catch (error) {
		showError("Session expired.");
		update_user(undefined);
	}
}

export async function register(username: string, password: string) {
	try {
		if (username.length > 50 || password.length > 50) {
			showError("Username or Password too long.");
			return;
		}
		const response = await fetch(`/api/register`, {
			method: "POST",
			credentials: "include",
			headers: { "Content-Type": "application/json" },
			body: JSON.stringify({ username: username, password: password })
		});
		const data = await response.json();

		if (!response.ok || !data.success) {
			const errorMessage = data?.error || "Registering failed.";
			showError(errorMessage);
		}
		else if (data.success) {
			update_user(new User(data.username, data.id));
			showSuccess(`Welcome, ${data.username}!`);
		}

	} catch (error) {
		// console.error("/api/register error:", error);
		showError("Sorry, Registering failed.");
	}
}

export async function login(username: string, password: string) {
	try {
		if (username.length > 50 || password.length > 50) {
			showError("Username or Password too long.");
			return;
		}
		const response = await fetch(`/api/login`, {
			method: "POST",
			credentials: "include",
			headers: { "Content-Type": "application/json" },
			body: JSON.stringify({ username, password })
		});
		const data = await response.json();

		if (data.step === "2fa_required") {
			show2FAVerificationModal(data.temp_token, username);
			return;
		}

		if (!response.ok || !data.success) {
			const errorMessage = data?.error || "Login failed.";
			showError(errorMessage);
			return;
		}

		update_user(new User(data.username, data.id, data.email, data.avatar));
		showSuccess(`Welcome back, ${data.username}!`);

	} catch (error) {
		// console.error("/api/login error:", error);
		showError("Sorry, login failed.");
	}
}

export async function logout(): Promise<void> {
	try {
		const response = await fetch(`/api/logout`, {
			method: "POST",
			credentials: 'include'
		});
		const data = await response.json();

		if (response.status === 401 || !response.ok || !data.success) {
			if (user?.web_socket?.readyState === WebSocket.OPEN)
				user.web_socket.close(1000);
			update_user(undefined);
			const errorMessage = data?.error || "Logout failed.";
			showError(errorMessage);
			check_redirect();
			return;
		}

		if (user?.web_socket?.readyState === WebSocket.OPEN)
			user.web_socket.close(1000);
		update_user(undefined);
		showSuccess(`Successfully\nlogged out!`);

	} catch (error) {
		// console.error("/api/logout error:", error);
		showError("Sorry, logout failed.");
	}
}

export async function search(friend_username: string): Promise<OtherUser | Error | undefined> {
	try {
		if (friend_username.length > 50) {
			showError("Username too long.");
			return undefined;
		}
		const response = await fetch(`/api/search/${friend_username}`, {
			method: "GET",
			credentials: 'include'
		});
		const data = await response.json();

		if (response.status === 401) {
			if (user?.web_socket && user?.web_socket.readyState === WebSocket.OPEN)
				user.web_socket.close(1000);
			update_user(undefined);
			const errorMessage = data?.error || "Session expired.";
			showError(errorMessage);
			check_redirect();
			return undefined;
		}

		if (!response.ok || !data.success) {
			const errorMessage = data?.error || "Search failed.";
			showError(errorMessage);
			return undefined;
		}
		else if (data.success) {
			if (data.isFriend)
				return new OtherUser(data.user.username, data.isFriend, data.user.isConnected,
					data.user.friendSince, data.user.winRate, data.user.gamesTogether, data.user.avatar);
			return new OtherUser(data.user.username, data.isFriend, data.user.isConnected,
				data.user.createdAt, data.user.winRate, data.user.gamesPlayed, data.user.avatar);
		}

	} catch (error) {
		// console.error(`/api/search/${friend_username} error:`, error);
		showError("Sorry, search failed.");
	}
	return undefined;
}

export async function add(friend_username: string): Promise<boolean | Error> {
	try {
		if (friend_username.length > 50) {
			showError("Username too long.");
			return false;
		}
		const response = await fetch(`/api/add/${friend_username}`, {
			method: "POST",
			credentials: 'include'
		});
		const data = await response.json();

		if (response.status === 401) {
			if (user?.web_socket && user?.web_socket.readyState === WebSocket.OPEN)
				user.web_socket.close(1000);
			update_user(undefined);
			const errorMessage = data?.error || "Session expired.";
			showError(errorMessage);
			check_redirect();
			return false;
		}

		if (!response.ok || !data.success) {
			const errorMessage = data?.error || "Adding friend failed.";
			showError(errorMessage);
			return false;
		}
		showInfo(`User ${friend_username}\nAdded!`);
		return data.success;

	} catch (error) {
		// console.error(`/api/add/${friend_username} error:`, error);
		showError("Sorry, adding friend failed.");
		return false;
	}
}

export async function remove(friend_username: string): Promise<boolean | Error> {
	try {
		if (friend_username.length > 50) {
			showError("Username too long.");
			return false;
		}
		const response = await fetch(`/api/remove/${friend_username}`, {
			method: "DELETE",
			credentials: 'include'
		});
		const data = await response.json();

		if (response.status === 401) {
			if (user?.web_socket && user?.web_socket.readyState === WebSocket.OPEN)
				user.web_socket.close(1000);
			update_user(undefined);
			const errorMessage = data?.error || "Session expired.";
			showError(errorMessage);
			check_redirect();
			return false;
		}

		if (!response.ok || !data.success) {
			const errorMessage = data?.error || "Remove friend failed.";
			showError(errorMessage);
			return false;
		}
		showInfo(`User ${friend_username}\nremoved from friends!`);
		return data.success;

	} catch (error) {
		// console.error(`/api/remove/${friend_username} error:`, error);
		showError("Sorry, removing friend failed.");
		return false;
	}
}

export async function send(message: string, type: string, to: string = ''): Promise<boolean> {
	let url;
	let body;

	try {
		if (type === 'livechat') {
			url = '/api/live_chat_message';
			body = { message: message };
		}
		else /*(type === 'direct_message') */ {
			url = '/api/direct_chat_message';
			body = { to: to, message: message };
		}
		const response = await fetch(url, {
			method: "POST",
			credentials: 'include',
			headers: { "Content-Type": "application/json" },
			body: JSON.stringify(body)
		});
		const data = await response.json();

		if (response.status === 401) {
			if (user?.web_socket && user?.web_socket.readyState === WebSocket.OPEN)
				user.web_socket.close(1000);
			update_user(undefined);
			const errorMessage = data?.error || "Session expired.";
			showError(errorMessage);
			check_redirect();
			return false;
		}

		if (!response.ok || !data.success) {
			const errorMessage = data?.error || "Sending message failed.";
			alert(errorMessage);
			return false;
		}
		return data.success;

	} catch (error) {
		// console.error(`/api/${type} error:`, error);
		showError("Sorry, sending message failed.");
		return false;
	}
}

export interface t_DirectMessage {
	id: number;
	content: string;
	sent_at: string;
	sender: string;
}

export interface ChatResponse { messages: t_DirectMessage[]; }

export async function get_direct_messages(username: string): Promise<ChatResponse | undefined> {
	try {
		const response = await fetch(`/api/chats/${username}`, {
			method: "GET",
			credentials: 'include'
		});
		const data = await response.json();

		if (response.status === 401) {
			if (user?.web_socket && user?.web_socket.readyState === WebSocket.OPEN)
				user.web_socket.close(1000);
			update_user(undefined);
			const errorMessage = data?.error || "Session expired.";
			showError(errorMessage);
			check_redirect();
			return undefined;
		}

		if (!response.ok || !data.success) {
			const errorMessage = data?.error || "Getting messages history failed.";
			showError(errorMessage);
			return undefined;
		}
		return data;
	} catch (error) {
		// console.error(`/api/chats/${username} error:`, error);
		showError("Sorry, fetching messages failed.");
		return undefined;
	}
}

export async function get_blocked_users(): Promise<Array<string> | undefined> {
	try {
		const response = await fetch(`/api/blocked`, {
			method: "GET",
			credentials: 'include'
		});
		const data = await response.json();

		if (response.status === 401) {
			if (user?.web_socket && user?.web_socket.readyState === WebSocket.OPEN)
				user.web_socket.close(1000);
			update_user(undefined);
			const errorMessage = data?.error || "Session expired.";
			showError(errorMessage);
			check_redirect();
			return undefined;
		}

		if (!response.ok || !data.success)
			return undefined;

		return data.blockedUsers;
	} catch (error) {
		// console.error(`/api/blocked error:`, error);
		showError("Sorry, getting blocked users failed.");
		return undefined;
	}
}

export async function block(username: string): Promise<boolean> {
	try {
		if (username.length > 50) {
			showError("Username too long.");
			return false;
		}
		const response = await fetch(`/api/block/${username}`, {
			method: "POST",
			credentials: 'include'
		});
		const data = await response.json();

		if (response.status === 401) {
			if (user?.web_socket && user?.web_socket.readyState === WebSocket.OPEN)
				user.web_socket.close(1000);
			update_user(undefined);
			const errorMessage = data?.error || "Session expired.";
			showError(errorMessage);
			check_redirect();
			return false;
		}

		if (!response.ok || !data.success) {
			const errorMessage = data?.error || "Blocking user failed.";
			showError(errorMessage);
			return false;
		}
		showInfo(`User ${username}\nBlocked!`);
		return data.success;

	} catch (error) {
		// console.error(`/api/block/${username} error:`, error);
		showError("Sorry, blocking user failed.");
		return false;
	}
}

export async function unblock(username: string): Promise<boolean> {
	try {
		if (username.length > 50) {
			showError("Username too long.");
			return false;
		}
		const response = await fetch(`/api/unblock/${username}`, {
			method: "DELETE",
			credentials: 'include'
		});
		const data = await response.json();

		if (response.status === 401) {
			if (user?.web_socket && user?.web_socket.readyState === WebSocket.OPEN)
				user.web_socket.close(1000);
			update_user(undefined);
			const errorMessage = data?.error || "Session expired";
			showError(errorMessage);
			check_redirect();
			return false;
		}

		if (!response.ok || !data.success) {
			const errorMessage = data?.error || "Unblocking user failed";
			showError(errorMessage);
			return false;
		}
		showInfo(`User ${username}\nUnblocked !`);
		return data.success;

	} catch (error) {
		// console.error(`/api/unblock/${username} error:`, error);
		showError("Sorry, unblocking user failed.");
		return false;
	}
}

export async function setup2fa(): Promise<{ otpauth_url: string, qrCode: string, secret: string } | undefined> {
	try {
		const response = await fetch('/api/auth/2fa/setup', {
			method: 'POST',
			credentials: 'include'
		});
		const data = await response.json();

		if (response.status === 401) {
			if (user?.web_socket && user?.web_socket.readyState === WebSocket.OPEN)
				user.web_socket.close(1000);
			update_user(undefined);
			const errorMessage = data?.error || "Session expired.";
			showError(errorMessage);
			check_redirect();
			return undefined;
		}

		if (!response.ok || !data.success) {
			const errorMessage = data?.error || "2FA setup failed.";
			showError(errorMessage);
			return undefined;
		}

		return {
			otpauth_url: data.otpauth_url || `otpauth://totp/ft_transcendence:${user?.name}?secret=${data.secret}&issuer=ft_transcendence`,
			qrCode: data.qrCode,
			secret: data.secret
		};
	} catch (error) {
		showError("Sorry, 2FA setup failed.");
		return undefined;
	}
}

export async function activate2fa(token: string): Promise<boolean> {
	try {
		const response = await fetch('/api/auth/2fa/activate', {
			method: 'POST',
			credentials: 'include',
			headers: {
				'Content-Type': 'application/json'
			},
			body: JSON.stringify({ token })
		});
		const data = await response.json();

		if (response.status === 401) {
			if (user?.web_socket && user?.web_socket.readyState === WebSocket.OPEN)
				user.web_socket.close(1000);
			update_user(undefined);
			const errorMessage = data?.error || "Session expired.";
			showError(errorMessage);
			check_redirect();
			return false;
		}

		if (!response.ok || !data.success) {
			const errorMessage = data?.error || "2FA activation failed.";
			showError(errorMessage);
			return false;
		}
		showInfo(`2FA activated!`);
		return data.success;
	} catch (error) {
		showError("Sorry, 2FA activation failed.");
		return false;
	}
}

export async function disable2fa(): Promise<boolean> {
	try {
		const response = await fetch('/api/auth/2fa/disable', {
			method: 'POST',
			credentials: 'include'
		});
		const data = await response.json();

		if (response.status === 401) {
			if (user?.web_socket && user?.web_socket.readyState === WebSocket.OPEN)
				user.web_socket.close(1000);
			update_user(undefined);
			const errorMessage = data?.error || "Session expired.";
			showError(errorMessage);
			check_redirect();
			return false;
		}

		if (!response.ok || !data.success) {
			const errorMessage = data?.error || "2FA disable failed.";
			showError(errorMessage);
			return false;
		}
		showInfo(`2FA disabled!`);
		return data.success;
	} catch (error) {
		showError("Sorry, 2FA disable failed.");
		return false;
	}
}

export async function get2faStatus(): Promise<boolean> {
	try {
		console.log('get2faStatus: Fetching status from /api/auth/2fa/status');
		const response = await fetch('/api/auth/2fa/status', {
			method: 'GET',
			credentials: 'include'
		});
		console.log('get2faStatus: Response status:', response.status);
		const data = await response.json();
		console.log('get2faStatus: Response data:', data);

		if (response.status === 401) {
			console.log('get2faStatus: Unauthorized');
			return false;
		}

		if (!response.ok || !data.success) {
			console.log('get2faStatus: Response not ok or not successful');
			return false;
		}
		
		console.log('get2faStatus: Returning enabled status:', data.enabled);
		return data.enabled || false;
	} catch (error) {
		console.error('get2faStatus: Error:', error);
		return false;
	}
}

export async function update(
	username: string, email: string, new_password: string): Promise<{success: boolean, user: any} | false> {
	try {

		let body = { username: username.trim(), email: email.trim(), new_password: new_password.trim() };
		if (username.length > 50 || email.length > 50 || new_password.length > 50) {
			showError("Username, Email or Password too long.");
			return false;
		}
		const response = await fetch('/api/update', {
			method: 'PUT',
			credentials: 'include',
			headers: {
				'Content-Type': 'application/json'
			},
			body: JSON.stringify(body)
		});
		const data = await response.json();

		if (response.status === 401) {
			if (user?.web_socket && user?.web_socket.readyState === WebSocket.OPEN)
				user.web_socket.close(1000);
			update_user(undefined);
			const errorMessage = data?.error || "Session expired.";
			showError(errorMessage);
			check_redirect();
			return false;
		}
		if (!response.ok || !data.success) {
			const errorMessage = data?.error || "Updating account failed.";
			showError(errorMessage);
			return false;
		}
		showSuccess(`Account updated!`);
		return data;
	} catch (error) {
		// console.error('/api/update error:', error);
		showError("Sorry, updating account failed.");
	}
	return false;
}

export async function verify2fa(token: string, temp_token: string): Promise<boolean> {
	try {
		console.log('🔐 verify2fa called with:', { token: token.substring(0, 3) + '***', temp_token: temp_token.substring(0, 20) + '...' });
		
		const response = await fetch('/api/auth/2fa/verify', {
			method: 'POST',
			credentials: 'include',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify({ token, temp_token })
		});
		
		console.log('🔐 verify2fa response status:', response.status);
		const data = await response.json();
		console.log('🔐 verify2fa response data:', data);

		if (!response.ok || !data.success) {
			const errorMessage = data?.error || "2FA verification failed.";
			showError(errorMessage);
			check_redirect();
			return false;
		}

		// Don't update user state here - let the router/header handle it after navigation
		// This ensures cookies are fully set before checking authentication
		if (data.success) {
			showSuccess(`Welcome back, ${data.username}!`);
		}

		console.log('🔐 verify2fa returning:', data.success);
		return data.success;
	} catch (error) {
		console.error('🔐 verify2fa error:', error);
		showError("Sorry, 2FA verification failed.");
		return false;
	}
}

export async function getUserAccountType(): Promise<{ is_google_account: boolean, has_password: boolean } | undefined> {
	try {
		const response = await fetch('/api/auth/account_type', {
			method: 'GET',
			credentials: 'include'
		});
		const data = await response.json();

		if (response.status === 401) {
			if (user?.web_socket && user?.web_socket.readyState === WebSocket.OPEN)
				user.web_socket.close(1000);
			update_user(undefined);
			const errorMessage = data?.error || "Session expired.";
			showError(errorMessage);
			check_redirect();
			return undefined;
		}

		if (!response.ok || !data.success)
			return undefined;

		return data.data;
	} catch (error) {
		// console.error('/api/auth/account_type error:', error);
		showError("Sorry, impossible to get your account.");
		return undefined;
	}
}

export async function initiateGoogleLogin() {
	try {
		// Fetch Google OAuth configuration from backend
		const configResponse = await fetch('/api/auth/google/config', {
			method: 'GET',
			credentials: 'include'
		});

		if (!configResponse.ok) {
			showError('Google OAuth is not configured.');
			return;
		}

		const configData = await configResponse.json();
		
		if (!configData.success || !configData.clientId) {
			showError('Google OAuth is not available.');
			return;
		}

		const clientId = configData.clientId;
		const redirectUri = configData.redirectUri || 'https://localhost:4443/auth/google/callback';
		const scope = 'email profile';
		const responseType = 'code';
		const accessType = 'offline';
		const prompt = 'consent';

		const googleAuthUrl = `https://accounts.google.com/o/oauth2/v2/auth?` +
			`client_id=${encodeURIComponent(clientId)}` +
			`&redirect_uri=${encodeURIComponent(redirectUri)}` +
			`&response_type=${encodeURIComponent(responseType)}` +
			`&scope=${encodeURIComponent(scope)}` +
			`&access_type=${encodeURIComponent(accessType)}` +
			`&prompt=${encodeURIComponent(prompt)}`;

		window.location.href = googleAuthUrl;

	} catch (error) {
		console.error('Failed to initiate Google login:', error);
		showError('Failed to start Google login.');
	}
}

export async function processGoogleOAuth(code: string): Promise<void> {
	try {
		const response = await fetch('/api/auth/google', {
			method: 'POST',
			headers: {
				'Content-Type': 'application/json'
			},
			credentials: 'include',
			body: JSON.stringify({ code })
		});

		const data = await response.json();

		if (response.status === 202 && data.step === "choose_username") {
			// Hide overlay to show prompt
			const hideOverlay = (window as any).hideOAuthLoadingOverlay;
			if (hideOverlay)
				hideOverlay();
			const username = prompt("Please choose a username:.");
			if (username) {
				if (username.length > 50) {
					showError("Username too long.");
					return;
				}
				// Show overlay again while submitting username
				const showOverlay = (window as any).showOAuthLoadingOverlay;
				if (showOverlay)
					showOverlay();
				await completeGoogleRegistration(username, data.temp_token);
			} else {
				showError("Username is required.");
			}
			return;
		} else if (response.ok && data.requires_2fa) {
			// User has 2FA enabled, hide loading overlay and show verification modal
			const hideOverlay = (window as any).hideOAuthLoadingOverlay;
			if (hideOverlay)
				hideOverlay();
			show2FAVerificationModal(data.temp_token, "your Google account");
			return;
		} else if (response.ok && data.success) {
			// IMPORTANT: When using SPA navigation (navigateTo), we must manually hide the overlay
			// because the page doesn't reload (unlike window.location.href which reloads everything)
			const hideOverlay = (window as any).hideOAuthLoadingOverlay;
			if (hideOverlay)
				hideOverlay();
			// Don't set user state here - let loadHeader() handle it after navigation
			// This ensures proper authentication flow with fully set cookies
			showSuccess(`Welcome back, ${data.username}!`);
			// Small delay to ensure cookies are set before redirecting
			await new Promise(resolve => setTimeout(resolve, 100));
			// Redirect to home page after successful login (SPA navigation)
			(window as any).navigateTo("/");
		} else {
			const hideOverlay = (window as any).hideOAuthLoadingOverlay;
			if (hideOverlay)
				hideOverlay();
			showError("Failed to process Google OAuth.");
		}

	} catch (error) {
		// console.error("api/auth/google error:", error);
		const hideOverlay = (window as any).hideOAuthLoadingOverlay;
		if (hideOverlay)
			hideOverlay();
		showError("Failed to process Google OAuth.");
	}
}

async function completeGoogleRegistration(username: string, tempToken: string): Promise<void> {
	try {
		const response = await fetch('/api/auth/google/username', {
			method: 'POST',
			headers: { 'Content-Type': 'application/json' },
			credentials: 'include',
			body: JSON.stringify({
				username,
				temp_token: tempToken
			})
		});

		const data = await response.json();

		if (response.status === 202 && data.step === "2fa_required") {
			const hideOverlay = (window as any).hideOAuthLoadingOverlay;
			if (hideOverlay)
				hideOverlay();
			show2FAVerificationModal(data.temp_token, username);
			return;
		} else if (response.ok && data.success) {
			// IMPORTANT: Hide overlay before SPA navigation
			const hideOverlay = (window as any).hideOAuthLoadingOverlay;
			if (hideOverlay)
				hideOverlay();
			// Don't set user state here - let loadHeader() handle it after navigation
			showSuccess(`Welcome, ${data.username}!`);
			// Redirect to home page after successful registration (SPA navigation)
			(window as any).navigateTo("/");
		} else {
			const hideOverlay = (window as any).hideOAuthLoadingOverlay;
			if (hideOverlay)
				hideOverlay();
			showError("Failed to complete Google registration.");
		}

	} catch (error) {
		// console.error("api/auth/google/username error:", error);
		const hideOverlay = (window as any).hideOAuthLoadingOverlay;
		if (hideOverlay)
			hideOverlay();
		showError("Failed to complete Google registration.");
	}
}

export async function updateAvatar(file: File): Promise<boolean> {
	try {
		const maxSize = 2 * 1024 * 1024;
		if (file.size > maxSize) {
			showError("File size exceeds 2MB.");
			return false;
		}

		const formData = new FormData();
		formData.append('avatar', file);

		const response = await fetch('/api/update_avatar', {
			method: 'PUT',
			body: formData,
			credentials: 'include'
		});

		const text = await response.text();
		let data;
		try {
			data = JSON.parse(text);
		} catch (e) {
			showError("Updating avatar failed.");
			return false;
		}

		if (response.status === 401) {
			if (user?.web_socket && user?.web_socket.readyState === WebSocket.OPEN)
				user.web_socket.close(1000);
			update_user(undefined);
			const errorMessage = data?.error || "Session expired.";
			showError(errorMessage);
			check_redirect();
			return false;
		}

		if (!response.ok) {
			const errorMessage = data?.error || "Updating avatar failed";
			showError(errorMessage);
			return false;
		}

		if (data.success && user) {
			const avatarElements = document.querySelectorAll('.avatar.logged-in') as NodeListOf<HTMLImageElement>;
			avatarElements.forEach(avatar => {
				avatar.src = `${data.user.avatar}?${Date.now()}`;
			});
			showInfo("Avatar updated successfully!.");
			user.avatar_path = data.user.avatar;
			return true;
		}
		return false;
	} catch (error) {
		// console.error('/api/update_avatar error:', error);
		showError("Updating avatar failed.");
		return false;
	}
}

export async function getGameHistory(userId: string) {
	try {
		const response = await fetch(`/api/game/history/${userId}`, {
			method: 'GET',
			credentials: 'include',
			headers: { "Content-Type": "application/json" }
		});
		const data = await response.json();
		if (response.status === 401) {
			if (user?.web_socket && user?.web_socket.readyState === WebSocket.OPEN)
				user.web_socket.close(1000);
			update_user(undefined);
			const errorMessage = data?.error || "Session expired";
			showError(errorMessage);
			check_redirect();
			throw new Error('Failed to fetch game history');
		}
		if (!response.ok || !data.success)
			throw new Error('Failed to fetch game history');
		return data.games;
	} catch (error) {
		// console.error('/api/game/history error:', error);
		showError("Fetching game history failed.");
		return;
	}
}

export async function unregister(): Promise<boolean> {
	try {
		const response = await fetch("/api/unregister", {
			method: "POST",
			headers: { "Content-Type": "application/json", },
			body: JSON.stringify({ }),
			credentials: "include",
		});

		const data = await response.json();

		if (response.status === 401) {
			if (user?.web_socket?.readyState === WebSocket.OPEN)
				user.web_socket.close(1000);
			update_user(undefined);
			const errorMessage = data?.error || "Session expired.";
			showError(errorMessage);
			check_redirect();
			return false;
		}

		else if (!response.ok || !data.success) {
			const errorMessage = data?.error || "Unregistering failed.";
			showError(errorMessage);
			return false;
		}

		if (user?.web_socket?.readyState === WebSocket.OPEN)
			user.web_socket.close(1000);
		update_user(undefined);
		showSuccess("Account unregistered successfully!");
		return true;

	} catch (error) {
		// console.error('/api/unregister error:', error);
		showError("Sorry, unregistering failed.");
		return false;
	}
}

async function check_redirect() {
	let type = get_url_type(window.location.pathname);
	let type_index = get_type_index(type);
	
	if (type_index === undefined || (sections[type_index] as ASection).protected === true)
		await go_section('home', '');
	else
		update_sections();
}