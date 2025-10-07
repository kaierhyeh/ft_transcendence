// Simple header management
const EXCLUDED_ROUTES = ['/login', '/signup'];

async function loadHeader() {
    const currentPath = window.location.pathname;
    
    const headerElement = document.querySelector('header');
    if (!headerElement) return;
    
    // Don't show header on excluded routes
    if (EXCLUDED_ROUTES.includes(currentPath)) {
        headerElement.innerHTML = '';
        return;
    }

    try {
        // Check if user is authenticated
        const isAuthenticated = await checkAuth();
        
        // Load appropriate template
        const templatePath = isAuthenticated 
            ? '/html/header/authenticated.html'
            : '/html/header/unauthenticated.html';
            
        const response = await fetch(templatePath);
        const headerHtml = await response.text();
        
        // Replace header content (not outerHTML since we want to keep the <header> tag)
        headerElement.innerHTML = headerHtml;
        setupHeaderEvents();
    } catch (error) {
        console.error('Header load failed:', error);
    }
}

function removeHeader() {
    const headerElement = document.querySelector('header');
    if (headerElement) {
        headerElement.innerHTML = '';
    }
}

async function checkAuth(): Promise<boolean> {
    try {
        const response = await fetch('/api/auth/verify', {
            method: 'POST',
            credentials: 'include'
        });
        
        if (response.ok) {
            const data = await response.json();
            return data.success;
        }
        return false;
    } catch {
        return false;
    }
}

function setupHeaderEvents() {
    // Dropdown toggle
    const userBtn = document.querySelector('.user-btn');
    const dropdown = document.querySelector('.dropdown');
    
    if (userBtn && dropdown) {
        userBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            dropdown.classList.toggle('show');
        });
        
        document.addEventListener('click', () => {
            dropdown.classList.remove('show');
        });
    }

    // Logout button
    const logoutBtn = document.querySelector('.logout-btn');
    if (logoutBtn) {
        logoutBtn.addEventListener('click', async (e) => {
            e.preventDefault();
            try {
                await fetch('/api/auth/logout', {
                    method: 'POST',
                    credentials: 'include'
                });
                window.location.href = '/';
            } catch (error) {
                console.error('Logout failed:', error);
            }
        });
    }
}

// Export for use in app.ts
export { loadHeader };
