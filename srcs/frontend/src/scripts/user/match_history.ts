// user/match_history.ts
import user from './User.js';
import { fetchMatchHistory } from './api.js';
import { createMatchCard, createSkeletonCard, createEmptyState, createErrorState } from './components/MatchCard.js';
import type { MatchHistoryResponse } from './types.js';

const API_AUTH_ENDPOINT = `${window.location.origin}/api/auth`;

let currentPage = 1;
let isLoading = false;
let hasMorePages = true;

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

function showLoadingState(container: Element): void {
    const skeletons = Array(3).fill(null).map(() => createSkeletonCard()).join('');
    container.innerHTML = `
        <div class="match-history-list">
            ${skeletons}
        </div>
    `;
}

function renderMatches(container: Element, response: MatchHistoryResponse, append: boolean = false): void {
    const { data: sessions, pagination } = response;
    
    // Update pagination state
    hasMorePages = pagination.next_page !== null;
    
    // Handle empty state
    if (sessions.length === 0 && !append) {
        container.innerHTML = createEmptyState();
        return;
    }
    
    // Create match cards
    const cardsHTML = sessions.map(session => 
        createMatchCard({ session, currentUserId: user.user_id })
    ).join('');
    
    if (append) {
        // Append to existing list
        const listContainer = container.querySelector('.match-history-list');
        if (listContainer) {
            listContainer.insertAdjacentHTML('beforeend', cardsHTML);
        }
    } else {
        // Create new list
        container.innerHTML = `
            <div class="match-history-list">
                ${cardsHTML}
            </div>
            ${hasMorePages ? '<button class="load-more-btn">Load More</button>' : ''}
            <div class="pagination-info">
                Showing ${pagination.total_records} match${pagination.total_records !== 1 ? 'es' : ''}
            </div>
        `;
    }
    
    // Add load more button if there are more pages
    if (append && hasMorePages) {
        const loadMoreBtn = container.querySelector('.load-more-btn');
        if (!loadMoreBtn) {
            container.insertAdjacentHTML('beforeend', '<button class="load-more-btn">Load More</button>');
        }
    }
    
    // Setup load more button
    setupLoadMoreButton(container);
    
    // Re-attach navigation events for new links
    attachNavigationEvents();
}

function setupLoadMoreButton(container: Element): void {
    const loadMoreBtn = container.querySelector('.load-more-btn');
    if (!loadMoreBtn) return;
    
    loadMoreBtn.addEventListener('click', async () => {
        if (isLoading || !hasMorePages) return;
        
        try {
            isLoading = true;
            loadMoreBtn.textContent = 'Loading...';
            loadMoreBtn.setAttribute('disabled', 'true');
            
            currentPage++;
            const response = await fetchMatchHistory({
                userId: user.user_id!,
                page: currentPage
            });
            
            renderMatches(container, response, true);
            
        } catch (error) {
            console.error('Failed to load more matches:', error);
            loadMoreBtn.textContent = 'Failed to load. Try again?';
        } finally {
            isLoading = false;
            loadMoreBtn.removeAttribute('disabled');
            
            // Remove button if no more pages
            if (!hasMorePages) {
                loadMoreBtn.remove();
            }
        }
    });
}

function attachNavigationEvents(): void {
    // This function should trigger your app's navigation
    document.querySelectorAll('[data-route]').forEach(link => {
        const element = link as HTMLElement;
        if (!element.dataset.route) return;
        
        link.addEventListener('click', (e) => {
            e.preventDefault();
            const path = (e.currentTarget as HTMLElement).dataset.route!;
            // Call your app's navigate function
            (window as any).navigate?.(path);
        });
    });
}

async function loadMatchHistory(): Promise<void> {
    const historyContainer = document.querySelector('.match-history-container');
    if (!historyContainer) return;

    try {
        // Check authentication
        const isAuthenticated = user.isLoggedIn();
        
        if (!isAuthenticated) {
            const serverAuthenticated = await checkAuth();
            if (serverAuthenticated) {
                await user.fetchAndUpdate();
            } else {
                historyContainer.innerHTML = `
                    <div class="auth-required">
                        <h3>Login Required</h3>
                        <p>Please log in to view your match history.</p>
                        <a href="/login" data-route="/login" class="btn-primary">Log In</a>
                    </div>
                `;
                attachNavigationEvents();
                return;
            }
        }

        // Show loading state
        showLoadingState(historyContainer);
        
        // Reset state
        currentPage = 1;
        hasMorePages = true;
        
        // Fetch match history
        const response = await fetchMatchHistory({
            userId: user.user_id!,
            page: currentPage
        });
        
        // Render matches
        renderMatches(historyContainer, response);
        
    } catch (error) {
        console.error('Failed to load match history:', error);
        historyContainer.innerHTML = createErrorState();
        
        // Setup retry button
        const retryBtn = historyContainer.querySelector('.retry-btn');
        retryBtn?.addEventListener('click', () => loadMatchHistory());
    }
}

export async function initMatchHistory(): Promise<void> {
    await loadMatchHistory();
}