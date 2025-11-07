import user from '../user/User.js';
import { initiateGoogleLogin, processGoogleOAuth } from '../api.js';

const API_AUTH_ENDPOINT = `${window.location.origin}/api/auth`;
const API_TWOFA_ENDPOINT = `${window.location.origin}/api/auth/2fa`;

export function initLogin() {
	// Check if user is already logged in and redirect if so
	checkAuthStatusAndRedirect();

	const loginBtn = document.getElementById('login-btn') as HTMLButtonElement;
	const googleLoginBtn = document.getElementById('google-login-btn') as HTMLButtonElement;
	const usernameInput = document.getElementById('username') as HTMLInputElement;
	const passwordInput = document.getElementById('password') as HTMLInputElement;

	// Event listeners
	if (loginBtn)
		loginBtn.addEventListener('click', handleLogin);

	if (googleLoginBtn)
		googleLoginBtn.addEventListener('click', handleGoogleLogin);

	// Add Enter key support for login form
	if (usernameInput && passwordInput) {
		const handleEnterKey = (event: KeyboardEvent) => {
			if (event.key === 'Enter') {
				event.preventDefault();
				handleLogin();
			}
		};
		usernameInput.addEventListener('keypress', handleEnterKey);
		passwordInput.addEventListener('keypress', handleEnterKey);
	}

	async function handleLogin() {
		const username = usernameInput?.value.trim();
		const password = passwordInput?.value.trim();

		if (!username || !password) {
			alert('Please enter both username and password.');
			return;
		}

		try {
			const response = await fetch(`${API_AUTH_ENDPOINT}/login`, {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				credentials: 'include',
				body: JSON.stringify({ username, password })
			});

			const data = await response.json();

			if (response.status === 202 && data.step === "2fa_required") {
				const token = prompt("Please enter your 2FA code:");
				if (token)
					await handle2FA(token, data.temp_token);
				return;
			} else if (response.ok && data.success) {
				// Login successful - fetch user data and redirect
				await user.fetchAndUpdate();
				redirectAfterLogin();
			} else
				alert(data.error || 'Login failed.');
		} catch (error) {
			console.error('Login error:', error);
			alert('Login failed.');
		}
	}

	async function handle2FA(token: string, tempToken: string) {
		try {
			const response = await fetch(`${API_TWOFA_ENDPOINT}/verify`, {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				credentials: 'include',
				body: JSON.stringify({
					token,
					temp_token: tempToken
				})
			});

			const data = await response.json();

			if (response.ok && data.success) {
				// 2FA verification successful - redirect to previous page or homepage
				redirectAfterLogin();
			} else
				alert(data.error || '2FA verification failed.');
		} catch (error) {
			console.error('2FA verification error:', error);
			alert('2FA verification failed.');
		}
	}

	async function handleGoogleLogin() {
		await initiateGoogleLogin();
	}

	async function checkAuthStatusAndRedirect() {
		try {
			const response = await fetch(`${API_AUTH_ENDPOINT}/verify`, {
				method: 'POST',
				credentials: 'include'
			});

			if (response.ok) {
				const data = await response.json();
				if (data.success) {
					// User is already logged in, fetch user data and redirect
					await user.fetchAndUpdate();
					redirectAfterLogin();
				}
			}
			// If not logged in, do nothing and let the login page show
		} catch (error) {
			console.error('Auth check error:', error);
			// If error checking auth, assume not logged in and continue
		}
	}

	function redirectAfterLogin() {
		// Try to get the previous page from sessionStorage
		const previousPage = sessionStorage.getItem('previousPage');
		
		if (previousPage && previousPage !== '/login' && previousPage !== '/signup') {
			// Clear the stored page and redirect to it using SPA navigation
			sessionStorage.removeItem('previousPage');
			(window as any).navigateTo(previousPage);
		} else {
			// Default redirect to homepage using SPA navigation
			(window as any).navigateTo('/');
		}
	}

}

export async function handleOAuthCallback() {
	// Show loading overlay immediately
	showOAuthLoadingOverlay();
	
	const urlParams = new URLSearchParams(window.location.search);
	const code = urlParams.get('code');
	const error = urlParams.get('error');

	if (error) {
		hideOAuthLoadingOverlay();
		alert('OAuth error: ' + error);
		(window as any).navigateTo("/profile");
		return;
	}

	if (code) {
		try {
			await processGoogleOAuth(code);
			// The processGoogleOAuth function handles the redirect
		} catch (error) {
			hideOAuthLoadingOverlay();
			console.error('OAuth callback error:', error);
			alert('OAuth authentication failed.');
			(window as any).navigateTo("/profile");
		}
	} else {
		hideOAuthLoadingOverlay();
		(window as any).navigateTo("/profile");
	}
}

function showOAuthLoadingOverlay() {
	// Create overlay element
	const overlay = document.createElement('div');
	overlay.id = 'oauth-loading-overlay';
	overlay.style.cssText = `
		position: fixed;
		top: 0;
		left: 0;
		width: 100%;
		height: 100%;
		background: rgba(0, 0, 0, 0.8);
		display: flex;
		flex-direction: column;
		justify-content: center;
		align-items: center;
		z-index: 9999;
		color: white;
		font-family: Arial, sans-serif;
	`;
	
	// Create spinner
	const spinner = document.createElement('div');
	spinner.style.cssText = `
		border: 4px solid rgba(255, 255, 255, 0.3);
		border-top: 4px solid white;
		border-radius: 50%;
		width: 50px;
		height: 50px;
		animation: spin 1s linear infinite;
		margin-bottom: 20px;
	`;
	
	// Create text
	const text = document.createElement('div');
	text.textContent = 'Authenticating with Google...';
	text.style.cssText = `
		font-size: 18px;
		font-weight: 500;
	`;
	
	// Add CSS animation for spinner
	const style = document.createElement('style');
	style.textContent = `
		@keyframes spin {
			0% { transform: rotate(0deg); }
			100% { transform: rotate(360deg); }
		}
	`;
	document.head.appendChild(style);
	
	overlay.appendChild(spinner);
	overlay.appendChild(text);
	document.body.appendChild(overlay);
}

function hideOAuthLoadingOverlay() {
	const overlay = document.getElementById('oauth-loading-overlay');

	if (overlay)
		overlay.remove();
}

// Export to window so it can be called from other modules
(window as any).showOAuthLoadingOverlay = showOAuthLoadingOverlay;
(window as any).hideOAuthLoadingOverlay = hideOAuthLoadingOverlay;