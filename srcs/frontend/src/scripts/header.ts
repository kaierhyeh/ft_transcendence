// Simple header management
import user from './user/User.js';
import { i18n } from './i18n/index.js';

const EXCLUDED_ROUTES = ['/login', '/signup'];
const API_AUTH_ENDPOINT = `${window.location.origin}/api/auth`;

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
        // Check if user is authenticated using User singleton
        const isAuthenticated = user.isLoggedIn();
        
        // If not authenticated, check with server and update user data
        if (!isAuthenticated) {
            const serverAuthenticated = await checkAuth();
            if (serverAuthenticated) {
                await user.fetchAndUpdate();
            }
        }
        
        // Load appropriate template
        const templatePath = (user.isLoggedIn()) 
            ? '/html/header/authenticated.html'
            : '/html/header/unauthenticated.html';
            
        const response = await fetch(templatePath);
        const headerHtml = await response.text();
        
        // Replace header content (not outerHTML since we want to keep the <header> tag)
        headerElement.innerHTML = headerHtml;
        
        // Translate header after loading
        i18n.initializePage();
        
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
        const response = await fetch(`${API_AUTH_ENDPOINT}/verify`, {
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
    // Update user display elements
    const usernameSpan = document.querySelector('.username');
    if (usernameSpan && user.isLoggedIn()) {
        usernameSpan.textContent = user.getDisplayName() || 'User';
    }

    // Setup avatar with user data
    const userAvatar = document.querySelector('.user-avatar') as HTMLImageElement;
    if (userAvatar && user.isLoggedIn()) {
        if (user.avatar_url) {
            userAvatar.src = user.avatar_url;
            userAvatar.style.display = 'block';
        } else {
            userAvatar.style.display = 'none';
        }
        
        userAvatar.addEventListener('error', () => {
            // Fallback to a default avatar or user initials
            userAvatar.style.display = 'none';
            const avatarContainer = userAvatar.parentElement;
            if (avatarContainer) {
                const initial = user.getInitials();
                avatarContainer.innerHTML = `<div class="avatar-fallback">${initial}</div>`;
            }
        });
    }

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
                await fetch(`${API_AUTH_ENDPOINT}/logout`, {
                    method: 'POST',
                    credentials: 'include'
                });
                
                // Clear user data from singleton
                user.logout();
                
                // Redirect to home
                window.location.href = '/';
            } catch (error) {
                console.error('Logout failed:', error);
            }
        });
    }
}

function updateHeaderAvatar() {
    const userAvatar = document.querySelector('.user-avatar') as HTMLImageElement;
    if (userAvatar && user.isLoggedIn()) {
        if (user.avatar_url) {
            userAvatar.src = user.avatar_url;
            userAvatar.style.display = 'block';
        } else {
            userAvatar.style.display = 'none';
        }
    }
}

// Export for use in app.ts
export { loadHeader, updateHeaderAvatar };
