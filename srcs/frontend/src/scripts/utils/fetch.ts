/**
 * Fetch wrapper with automatic token refresh on 401 errors
 * 
 * This function wraps the standard fetch API to automatically handle token expiration.
 * If a request receives a 401 Unauthorized response, it will attempt to refresh the
 * access token and retry the request once.
 * 
 * @param url - The URL to fetch
 * @param options - Standard fetch options (method, headers, body, etc.)
 * @returns The fetch Response object
 * 
 * @example
 * const response = await fetchWithAuth('/api/chat/', { method: 'GET' });
 * if (!response.ok) {
 *   if (response.status === 401) {
 *     // Handle permanent auth failure (refresh also failed)
 *     user.logout();
 *   }
 * }
 */
export async function fetchWithAuth(
    url: string, 
    options: RequestInit = {}
): Promise<Response> {
    // Ensure credentials are always included for cookie-based auth
    const fetchOptions: RequestInit = {
        ...options,
        credentials: 'include'
    };

    // First attempt
    let response = await fetch(url, fetchOptions);

    // If 401, try to refresh token and retry once
    if (response.status === 401) {
        console.log('🔄 Access token expired, attempting refresh...');
        
        const refreshResponse = await fetch('/api/auth/refresh', {
            method: 'POST',
            credentials: 'include'
        });

        if (refreshResponse.ok) {
            console.log('✅ Token refreshed successfully, retrying original request...');
            // Retry original request with new token (set via cookie by refresh endpoint)
            response = await fetch(url, fetchOptions);
        } else {
            console.warn('⚠️ Token refresh failed - user needs to re-authenticate');
            // Return the failed refresh response so caller can handle auth failure
        }
    }

    return response;
}
