import user from "../user/User.js";

export function initSignup() {
	// Check if user is already logged in and redirect if so
	checkAuthStatusAndRedirect();

	const registerBtn = document.getElementById('register-btn') as HTMLButtonElement;
	const googleLoginBtn = document.getElementById('google-login-btn') as HTMLButtonElement;
	const loginInput = document.getElementById('login') as HTMLInputElement;
	const passwordInput = document.getElementById('password') as HTMLInputElement;


	// Event listeners
	if (registerBtn)
		registerBtn.addEventListener('click', handleRegister);

	// if (googleLoginBtn)
	// 	googleLoginBtn.addEventListener('click', handleGoogleLogin);

	async function handleRegister() {
		const login = loginInput?.value.trim();
		const password = passwordInput?.value.trim();

		if (!login || !password) {
			alert('Please enter both username and password.');
			return;
		}

		if (login.length > 50 || password.length > 50) {
			alert('Username or password too long.');
			return;
		}

		try {
			const response = await fetch('/api/auth/register', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				credentials: 'include',
				body: JSON.stringify({ login, password })
			});

			const data = await response.json();

			if (response.ok && data.success) {
				// update_user(new User(data.username, data.id));
				alert('Registration successful! You are now logged in.');
				redirectAfterLogin();
			} else
				alert(data.error || 'Registration failed.');
		} catch (error) {
			console.error('Registration error:', error);
			alert('Registration failed.');
		}
	}

	// async function handleGoogleLogin() { await initiateGoogleLogin(); }

	async function checkAuthStatusAndRedirect() {
		try {
			const response = await fetch('/api/auth/verify', {
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

// export async function handleOAuthCallback() {
// 	const urlParams = new URLSearchParams(window.location.search);
// 	const code = urlParams.get('code');
// 	const error = urlParams.get('error');

// 	if (error) {
// 		alert('OAuth error: ' + error);
// 		// Redirect to profile page
// 		window.location.href = '/profile';
// 		return;
// 	}

// 	if (code) {
// 		try {
// 			await processGoogleOAuth(code);
// 			// The processGoogleOAuth function handles the redirect
// 		} catch (error) {
// 			console.error('OAuth callback error:', error);
// 			alert('OAuth authentication failed.');
// 			window.location.href = '/profile';
// 		}
// 	} else {
// 		// No code parameter, redirect to profile
// 		window.location.href = '/profile';
// 	}
// }
