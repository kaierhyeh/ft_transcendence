// user/match_history.ts
import user from './User.js';
import { fetchMatchHistory } from './api.js';
import { createMatchCard, createSkeletonCard, createEmptyState, createErrorState, attachMatchCardListeners } from './components/MatchCard.js';
import type { MatchHistoryResponse } from './types.js';
import { t } from '../i18n/i18n.js';

const API_AUTH_ENDPOINT = `${window.location.origin}/api/auth`;

let currentPage = 1;
let isLoading = false;
let hasMorePages = true;
let profileUserId: number | null = null; // The user whose profile is being viewed
let displayedMatches = 0;

/**
 * Gets the user ID from URL query parameters
 */
function getProfileUserIdFromUrl(): number | null {
    const urlParams = new URLSearchParams(window.location.search);
    const idParam = urlParams.get('id');
    
    if (idParam) {
        const id = parseInt(idParam, 10);
        return isNaN(id) ? null : id;
    }
    
    return null;
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

function showLoadingState(container: Element): void {
    const skeletons = Array(3).fill(null).map(() => createSkeletonCard()).join('');
    container.innerHTML = `
        <div class="match-history-list">
            ${skeletons}
        </div>
    `;
}

function isViewingOwnProfile(): boolean {
    return profileUserId === user.user_id;
}

function renderMatches(container: Element, response: MatchHistoryResponse, append: boolean = false): void {
    const { data: sessions, pagination } = response;
    
    // Update pagination state
    hasMorePages = pagination.next_page !== null;
    if (append)
        displayedMatches += sessions.length;
    else
        displayedMatches = sessions.length;
    
    // Handle empty state
    if (sessions.length === 0 && !append) {
        if (isViewingOwnProfile()) {
            // Show "Play Now" button for current user
            container.innerHTML = createEmptyState();
            attachMatchCardListeners();
        } else {
            // Hide section for other users with no games
            const matchHistorySection = document.getElementById('matchHistorySection');
            if (matchHistorySection) matchHistorySection.style.display = 'none';
        }
        return;
    }
    
    // Create match cards
    const cardsHTML = sessions.map(session => 
        createMatchCard({ 
            session, 
            currentUserId: user.user_id,
            profileUserId: profileUserId 
        })
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
                ${t("showing")} ${displayedMatches} ${t("of")} ${pagination.total_records} ${pagination.total_records !== 1 ? t("matches") : t("match")}
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

    const paginationInfo = container.querySelector('.pagination-info');
    if (paginationInfo)
        paginationInfo.textContent = `${t("showing")} ${displayedMatches} ${t("of")} ${pagination.total_records} ${pagination.total_records !== 1 ? t("matches") : t("match")}`;
    
    // Attach event listeners to player links in match cards
    attachMatchCardListeners();
}

function setupLoadMoreButton(container: Element): void {
    const loadMoreBtn = container.querySelector('.load-more-btn');
    if (!loadMoreBtn) return;
    const existingListenerFlag = '__load_more_attached__';
    if ((loadMoreBtn as any)[existingListenerFlag]) return;
    (loadMoreBtn as any)[existingListenerFlag] = true;

    loadMoreBtn.addEventListener('click', async () => {
        if (isLoading || !hasMorePages) return;

        try {
            isLoading = true;
            loadMoreBtn.textContent = t('loading');
            loadMoreBtn.setAttribute('disabled', 'true');

            currentPage++;
            const response = await fetchMatchHistory({
                userId: profileUserId!,
                page: currentPage
            });

            renderMatches(container, response, true);

            if (hasMorePages)
                loadMoreBtn.textContent = t('loadMore');

        } catch (error) {
            console.error('Failed to load more matches:', error);
            loadMoreBtn.textContent = t('failedToLoad');
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

async function loadMatchHistory(): Promise<void> {
    const matchHistorySection = document.getElementById('matchHistorySection');
    if (!matchHistorySection) return;

    try {
        // Check authentication first
        const isAuthenticated = user.isLoggedIn();
        
        if (!isAuthenticated) {
            const serverAuthenticated = await checkAuth();
            if (serverAuthenticated) {
                await user.fetchAndUpdate();
            } else {
                // Hide section if not authenticated
                matchHistorySection.style.display = 'none';
                return;
            }
        }
        
        // Get profile user ID from URL (if present, otherwise use current logged-in user)
        profileUserId = getProfileUserIdFromUrl();
        
        // If no profile ID in URL, use current logged-in user's ID
        if (profileUserId === null) {
            profileUserId = user.user_id;
        }
        
        if (profileUserId === null) {
            console.error('No user ID available');
            matchHistorySection.style.display = 'none';
            return;
        }

        // Inject the match history structure
        matchHistorySection.innerHTML = `
            <div class="match-history-header">
                <h1 data-i18n="matchHistory">⚔️ ${t("matchHistory")} ⚔️</h1>
            </div>
            <div class="match-history-container"></div>
        `;
        
        // Show the section
        matchHistorySection.style.display = 'block';
        
        const historyContainer = matchHistorySection.querySelector('.match-history-container');
        if (!historyContainer) return;

        // Show loading state
        showLoadingState(historyContainer);
        
        // Reset state
        currentPage = 1;
        hasMorePages = true;
        
        // Fetch match history
        const response = await fetchMatchHistory({
            userId: profileUserId,
            page: currentPage
        });
        
        // Render matches
        renderMatches(historyContainer, response);
        
    } catch (error) {
        console.error('Failed to load match history:', error);
        
        const historyContainer = matchHistorySection.querySelector('.match-history-container');
        
        if (isViewingOwnProfile() && historyContainer) {
            // Show error state with retry for current user
            historyContainer.innerHTML = createErrorState();
            const retryBtn = historyContainer.querySelector('.retry-btn');
            retryBtn?.addEventListener('click', () => loadMatchHistory());
        } else {
            // Hide section for other users or if no container
            matchHistorySection.style.display = 'none';
        }
    }
}

export async function initMatchHistory(): Promise<void> {
    await loadMatchHistory();
}