import user from './User.js';

const API_AUTH_ENDPOINT = `${window.location.origin}/api/auth`;

export async function initMatchHistory(): Promise<void> {
	// Check if user is already logged in and redirect if so
	checkAuthStatusAndRedirect();

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
            }
        }
        // If not logged in, do nothing and let the login page show
    } catch (error) {
        console.error('Auth check error:', error);
        // If error checking auth, assume not logged in and continue
        redirectAfterLogin();

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
