import user from '../user/User.js';
import { initiateGoogleLogin, processGoogleOAuth } from '../api.js';

const API_AUTH_ENDPOINT = `${window.location.origin}/api/auth`;
const API_TWOFA_ENDPOINT = `${window.location.origin}/api/auth/2fa`;

export function initLogin() {
	// Check if user is already logged in and redirect if so
	checkAuthStatusAndRedirect();

	const loginBtn = document.getElementById('login-btn') as HTMLButtonElement;
	const googleLoginBtn = document.getElementById('google-login-btn') as HTMLButtonElement;
	const twofaBtn = document.getElementById('2fa-btn') as HTMLButtonElement;
	const loginInput = document.getElementById('login') as HTMLInputElement;
	const passwordInput = document.getElementById('password') as HTMLInputElement;

	// Event listeners
	if (loginBtn)
		loginBtn.addEventListener('click', handleLogin);

	if (googleLoginBtn)
		googleLoginBtn.addEventListener('click', handleGoogleLogin);

	// if (twofaBtn)
	// 	twofaBtn.addEventListener('click', handle2FASetup);

	async function handleLogin() {
		const login = loginInput?.value.trim();
		const password = passwordInput?.value.trim();

		if (!login || !password) {
			alert('Please enter both username and password.');
			return;
		}

		try {
			const response = await fetch(`${API_AUTH_ENDPOINT}/login`, {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				credentials: 'include',
				body: JSON.stringify({ login, password })
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
			const response = await fetch(`${API_TWOFA_ENDPOINT}/verifiy`, {
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
	}	// async function handle2FASetup() {
	// 	try {
	// 		const response = await setup2fa();
	// 		if (!response) {
	// 			console.error("Failed to set up 2FA");
	// 			return;
	// 		}

	// 		// Show the QR code and secret key
	// 		const qrcodeImg = document.getElementById('qrcode-img') as HTMLImageElement;
	// 		qrcodeImg.src = response.qrCode;

	// 		const secretKey = document.getElementById('secret-key') as HTMLElement;
	// 		const secretMatch = response.otpauth_url.match(/secret=([A-Z0-9]+)/i);
	// 		if (secretMatch && secretMatch[1]) {
	// 			secretKey.textContent = secretMatch[1];
	// 		}

	// 		// Show the modal
	// 		const twofaModal = document.getElementById('2fa-modal') as HTMLElement;
	// 		twofaModal.style.display = 'flex';

	// 		// Setup modal event handlers
	// 		const activateBtn = document.getElementById('activate-2fa-btn') as HTMLButtonElement;
	// 		const cancelBtn = document.getElementById('cancel-2fa-btn') as HTMLButtonElement;
	// 		const closeBtn = document.getElementById('close-2fa-modal') as HTMLElement;

	// 		const closeModal = () => {
	// 			twofaModal.style.display = 'none';
	// 			const twofaErrorMsg = document.getElementById('2fa-error') as HTMLElement;
	// 			if (twofaErrorMsg) twofaErrorMsg.textContent = '';
	// 			const twofaTokenInput = document.getElementById('2fa-token') as HTMLInputElement;
	// 			if (twofaTokenInput) twofaTokenInput.value = '';
	// 		};

	// 		cancelBtn.onclick = closeModal;
	// 		closeBtn.onclick = closeModal;

	// 		activateBtn.onclick = async () => {
	// 			const twofaTokenInput = document.getElementById('2fa-token') as HTMLInputElement;
	// 			const token = twofaTokenInput.value.trim();

	// 			if (token.length !== 6 || !/^\d+$/.test(token)) {
	// 				const twofaErrorMsg = document.getElementById('2fa-error') as HTMLElement;
	// 				twofaErrorMsg.textContent = "The code must contain 6 digits";
	// 				return;
	// 			}

	// 			const success = await activate2fa(token);
	// 			if (success) {
	// 				closeModal();
	// 				alert("2FA activated successfully!");
	// 				// Update the button text
	// 				if (twofaBtn) twofaBtn.textContent = "Disable 2FA";
	// 			} else {
	// 				const twofaErrorMsg = document.getElementById('2fa-error') as HTMLElement;
	// 				twofaErrorMsg.textContent = "Invalid or expired code. Please try again.";
	// 			}
	// 		};

	// 	} catch (error) {
	// 		console.error("Error setting up 2FA:", error);
	// 		alert("Failed to set up 2FA. Please try again.");
	// 	}
	// }

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
			// Clear the stored page and redirect to it
			sessionStorage.removeItem('previousPage');
			window.location.href = previousPage;
		} else {
			// Default redirect to homepage
			window.location.href = '/';
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
		window.location.href = '/profile';
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
			window.location.href = '/profile';
		}
	} else {
		hideOAuthLoadingOverlay();
		window.location.href = '/profile';
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
	if (overlay) {
		overlay.remove();
	}
}
