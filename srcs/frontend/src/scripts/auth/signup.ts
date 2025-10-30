import user from "../user/User.js";
import { initiateGoogleLogin } from "../api.js";

const API_AUTH_ENDPOINT = `${window.location.origin}/api/auth`;

export function initSignup() {
	// Check if user is already logged in and redirect if so
	checkAuthStatusAndRedirect();

	const registerBtn = document.getElementById('register-btn') as HTMLButtonElement;
	const googleSignupBtn = document.getElementById('google-signup-btn') as HTMLButtonElement;
	const usernameInput = document.getElementById('username') as HTMLInputElement;
	const emailInput = document.getElementById('email') as HTMLInputElement;
	const passwordInput = document.getElementById('password') as HTMLInputElement;

	// Event listeners
	if (registerBtn)
		registerBtn.addEventListener('click', handleRegister);

	if (googleSignupBtn)
		googleSignupBtn.addEventListener('click', handleGoogleSignup);
	
	// Add Enter key support for signup form
	if (usernameInput && passwordInput) {
		const handleEnterKey = (event: KeyboardEvent) => {
			if (event.key === 'Enter') {
				event.preventDefault();
				handleRegister();
			}
		};
		usernameInput.addEventListener('keypress', handleEnterKey);
		emailInput?.addEventListener('keypress', handleEnterKey);
		passwordInput.addEventListener('keypress', handleEnterKey);
	}

	async function handleRegister() {
		const username = usernameInput?.value.trim();
		const email = emailInput?.value.trim();
		const password = passwordInput?.value.trim();

		if (!username || !password) {
			alert('Please enter username and password.');
			return;
		}

		if (username.length > 50 || password.length > 50) {
			alert('Username or password too long.');
			return;
		}

		try {
			const body: { username: string; password: string; email?: string } = { 
				username, 
				password 
			};
			
			// Only include email if it's not empty
			if (email && email.length > 0) {
				body.email = email;
			}

			const response = await fetch(`${API_AUTH_ENDPOINT}/register`, {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				credentials: 'include',
				body: JSON.stringify(body)
			});

			const data = await response.json();

			if (response.ok && data.success) {
				// update_user(new User(data.username, data.id));
				alert('Registration successful! You are now logged in.');
				await user.fetchAndUpdate();
				redirectAfterLogin();
			} else
				alert(data.error || 'Registration failed.');
		} catch (error) {
			console.error('Registration error:', error);
			alert('Registration failed.');
		}
	}

	async function handleGoogleSignup() { 
		await initiateGoogleLogin(); // Google signup uses the same OAuth flow as login
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