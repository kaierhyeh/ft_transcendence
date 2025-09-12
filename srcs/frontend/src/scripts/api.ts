// API functions for authentication and OAuth

export async function initiateGoogleLogin() {
	try {
		const clientId = '831735139130-5j7vdkeoqqc7arpnqm3j1q49gq3h8d2e.apps.googleusercontent.com';
		const redirectUri = `https://localhost:4443/auth/google/callback`; // Fixed to match backend
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
	}
}

export async function processGoogleOAuth(code: string): Promise<void> {
	try {
		const response = await fetch('/auth/google', {
			method: 'POST',
			headers: {
				'Content-Type': 'application/json'
			},
			credentials: 'include',
			body: JSON.stringify({ code })
		});

		const data = await response.json();

		if (response.status === 202 && data.step === "choose_username") {
			const username = prompt("Please choose a username:");
			if (username) {
				if (username.length > 50) {
					alert("Username too long");
					return;
				}
				await completeGoogleRegistration(username, data.temp_token);
			}
			return;
		} else if (response.status === 202 && data.step === "2fa_required") {
			// Handle 2FA - you can implement a modal here
			alert("2FA required: " + data.message);
			return;
		} else if (response.ok && data.success) {
			alert(`Welcome back, ${data.username}!`);
			// Redirect to main app
			window.location.href = '/';
		} else {
			alert("Failed to process Google OAuth");
		}

	} catch (error) {
		console.error("Google OAuth error:", error);
		alert("Failed to process Google OAuth");
	}
}

async function completeGoogleRegistration(username: string, tempToken: string): Promise<void> {
	try {
		const response = await fetch('/auth/google/username', {
			method: 'POST',
			headers: {
				'Content-Type': 'application/json'
			},
			credentials: 'include',
			body: JSON.stringify({
				username,
				temp_token: tempToken
			})
		});

		const data = await response.json();

		if (response.status === 202 && data.step === "2fa_required") {
			alert("2FA required: " + data.message);
			return;
		} else if (response.ok && data.success) {
			alert(`Welcome, ${data.username}!`);
			// Redirect to main app
			window.location.href = '/';
		} else {
			alert("Failed to complete Google registration");
		}

	} catch (error) {
		console.error("Google registration error:", error);
		alert("Failed to complete Google registration");
	}
}
