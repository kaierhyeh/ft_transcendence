// user/components/MatchCard.ts
import type { GameSession, PlayerData } from '../types.js';
import { t } from '../../i18n/i18n.js';

interface MatchCardData {
    session: GameSession;
    currentUserId: number | null;
    profileUserId: number | null; // The user whose profile is being viewed
}

/**
 * Formats a date string to relative time (e.g., "2 hours ago", "Yesterday")
 */
function formatRelativeDate(dateString: string): string {
    const date = new Date(dateString + 'Z'); // force UTC interpretation
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffSeconds = Math.floor(diffMs / 1000);
    const diffMinutes = Math.floor(diffSeconds / 60);
    const diffHours = Math.floor(diffMinutes / 60);
    const diffDays = Math.floor(diffHours / 24);

    if (diffSeconds < 60) return `${t("justNow")}`;
    if (diffMinutes < 60) return `${diffMinutes} ${t("minutesAgo")}`;
    if (diffHours < 24) return `${diffHours} ${t("hoursAgo")}`;
    if (diffDays === 1) return `${t("yesterday")}`;
    if (diffDays < 7) return `${diffDays} ${t("daysAgo")}`;

    // Format as "Oct 14, 2024"
    return date.toLocaleDateString('en-US', { 
        month: 'short', 
        day: 'numeric',
        year: 'numeric'
    });
}

/**
 * Formats a UTC date string to local time
 */
function formatLocalDate(dateString: string): string {
    const date = new Date(dateString + 'Z'); // force UTC
    const pad = (n: number) => String(n).padStart(2, '0');
    return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())} ${pad(date.getHours())}:${pad(date.getMinutes())}:${pad(date.getSeconds())}`;
}

/**
 * Calculates game duration in human-readable format
 */
function formatDuration(startedAt: string, endedAt: string): string {
    const start = new Date(startedAt + 'Z'); // force UTC
    const end = new Date(endedAt + 'Z'); // force UTC
    const diffSeconds = Math.floor((end.getTime() - start.getTime()) / 1000);
    
    if (diffSeconds < 60) return `${diffSeconds}s`;
    
    const minutes = Math.floor(diffSeconds / 60);
    const seconds = diffSeconds % 60;
    return `${minutes}m ${seconds}s`;
}

/**
 * Gets the mode badge label and emoji
 */
function getModeBadge(mode: GameSession['mode'], format: GameSession['format']): { label: string; emoji: string } {
    let label = '';
    let emoji = '';
    
    switch (mode) {
        case 'solo':
            emoji = '🤖';
            label = t('labelAI');
            break;
        case 'pvp':
            emoji = '⚔️';
            label = 'PvP';
            break;
        case 'tournament':
            emoji = '🏆';
            label = t('labelTournament');
            break;
    }
    
    // Add format for 2v2
    if (format === '2v2') {
        label += ' · 2v2';
    }
    
    return { label, emoji };
}

/**
 * Checks if viewing own profile
 */
function isOwnProfile(currentUserId: number | null, profileUserId: number | null): boolean {
    return currentUserId !== null && profileUserId !== null && currentUserId === profileUserId;
}

/**
 * Gets team label for 2v2
 */
function getTeamLabel(teamPlayers: PlayerData[], profileUserId: number | null, currentUserId: number | null): string {
    const hasProfileOwner = teamPlayers.some(p => p.user_id === profileUserId);
    
    if (!hasProfileOwner) {
        return t("opponent");
    }
    
    if (isOwnProfile(currentUserId, profileUserId)) {
        return t("yourTeam");
    }
    
    // Find the profile owner's username
    const profileOwner = teamPlayers.find(p => p.user_id === profileUserId);
    if (profileOwner && profileOwner.username) {
        return `${t("beforeOwner")}${profileOwner.username}${t("afterOwner")}`;
    }
    
    return t("team");
}

/**
 * Finds the current user's player data and opponent(s)
 */
function getPlayerInfo(session: GameSession, currentUserId: number | null) {
    const leftPlayer = session.players.find(p => p.team === 'left');
    const rightPlayer = session.players.find(p => p.team === 'right');
    
    // Determine which player is the current user
    let currentPlayer: PlayerData | undefined;
    let opponent: PlayerData | undefined;
    
    if (leftPlayer?.user_id === currentUserId) {
        currentPlayer = leftPlayer;
        opponent = rightPlayer;
    } else if (rightPlayer?.user_id === currentUserId) {
        currentPlayer = rightPlayer;
        opponent = leftPlayer;
    } else {
        // Fallback: current user is left, opponent is right
        currentPlayer = leftPlayer;
        opponent = rightPlayer;
    }
    
    return { currentPlayer, opponent, leftPlayer, rightPlayer };
}

/**
 * Formats player name with appropriate styling
 */
function formatPlayerName(player: PlayerData | undefined, profileUserId: number | null, currentUserId: number | null): string {
    if (!player) return t("formatUnknown");
    
    if (player.type === 'ai') {
        return `<span class="ai-player">${t("formatAiBot")}</span>`;
    }
    
    if (player.type === 'guest') {
        return `<span class="guest-player">${t("formatGuest")}</span>`;
    }
    
    // Registered user
    if (player.username) {
        // If viewing own profile and this is the profile owner, show "You"
        if (player.user_id === profileUserId && isOwnProfile(currentUserId, profileUserId)) {
            return `<span class="you-player">${t("formatYou")}</span>`;
        }
        
        // Otherwise show username with link
        return `<a data-route="/user/profile?id=${player.user_id}" class="player-link">${player.username}</a>`;
    }
    
    return t("formatPlayer");
}

/**
 * Creates a match history card HTML
 */
export function createMatchCard(data: MatchCardData): string {
    const { session, currentUserId, profileUserId } = data;
    
    const modeBadge = getModeBadge(session.mode, session.format);
    const relativeDate = formatRelativeDate(session.created_at);
    const localDate = formatLocalDate(session.created_at);
    const duration = formatDuration(session.started_at, session.ended_at);
    
    // Get teams
    const leftPlayers = session.players.filter(p => p.team === 'left');
    const rightPlayers = session.players.filter(p => p.team === 'right');
    
    if (leftPlayers.length === 0 || rightPlayers.length === 0) {
        console.error('Invalid player data in session:', session);
        return '';
    }
    
    // Get scores and winner status
    const leftScore = leftPlayers[0]?.score ?? 0;
    const rightScore = rightPlayers[0]?.score ?? 0;
    const leftIsWinner = leftPlayers[0]?.winner === 1;
    const rightIsWinner = rightPlayers[0]?.winner === 1;
    
    // Determine if profile owner won
    const profileOwnerOnLeft = leftPlayers.some(p => p.user_id === profileUserId);
    const profileOwnerOnRight = rightPlayers.some(p => p.user_id === profileUserId);
    const profileOwnerWon = (profileOwnerOnLeft && leftIsWinner) || (profileOwnerOnRight && rightIsWinner);
    
    // Create metadata badges
    const badges = [];
    if (session.online === 1) {
        badges.push(`<span class="match-badge online-badge" title="Online match">🌐 ${t("matchCardOnline")}</span>`);
    }
    if (session.tournament_id !== null) {
        badges.push(`<span class="match-badge tournament-badge" title="Tournament match">🏆</span>`);
    }
    const badgesHTML = badges.length > 0 ? `<div class="match-badges">${badges.join('')}</div>` : '';
    
    // Determine outcome message
    let outcomeHTML = '';
    const forfeitFlag = session.forfeit === 1 ? ' <span class="forfeit-flag" title="Match ended due to forfeit">🏳️</span>' : '';
    
    if (profileOwnerWon) {
        outcomeHTML = `<span class="winner-indicator">${t("victory")}${forfeitFlag}</span>`;
    } else {
        outcomeHTML = `<span class="loser-indicator">${t("defeat")}${forfeitFlag}</span>`;
    }
    
    // Build match score HTML based on format
    let matchScoreHTML = '';
    
    if (session.format === '1v1') {
        // 1v1 format - simple player vs player
        const leftPlayer = leftPlayers[0];
        const rightPlayer = rightPlayers[0];
        const leftClass = leftIsWinner ? 'winner' : 'loser';
        const rightClass = rightIsWinner ? 'winner' : 'loser';
        
        matchScoreHTML = `
            <div class="player ${leftClass}">
                <div class="player-name">${formatPlayerName(leftPlayer, profileUserId, currentUserId)}</div>
                <div class="player-score">${leftScore}</div>
            </div>
            
            <div class="match-divider">
                <span class="vs-text">VS</span>
            </div>
            
            <div class="player ${rightClass}">
                <div class="player-name">${formatPlayerName(rightPlayer, profileUserId, currentUserId)}</div>
                <div class="player-score">${rightScore}</div>
            </div>
        `;
    } else {
        // 2v2 format - team label + stacked players (using same .player class) + single score
        const leftLabel = getTeamLabel(leftPlayers, profileUserId, currentUserId);
        const rightLabel = getTeamLabel(rightPlayers, profileUserId, currentUserId);
        const leftClass = leftIsWinner ? 'winner' : 'loser';
        const rightClass = rightIsWinner ? 'winner' : 'loser';
        
        // Sort players by slot
        const leftSorted = [...leftPlayers].sort((a, b) => {
            const order = ['top-left', 'bottom-left'];
            return order.indexOf(a.slot) - order.indexOf(b.slot);
        });
        const rightSorted = [...rightPlayers].sort((a, b) => {
            const order = ['top-right', 'bottom-right'];
            return order.indexOf(a.slot) - order.indexOf(b.slot);
        });
        
        matchScoreHTML = `
            <div class="player ${leftClass}">
                <div class="team-label">${leftLabel}</div>
                ${leftSorted.map(player => `
                    <div class="player-name">${formatPlayerName(player, profileUserId, currentUserId)}</div>
                `).join('')}
                <div class="player-score">${leftScore}</div>
            </div>
            
            <div class="match-divider">
                <span class="vs-text">VS</span>
            </div>
            
            <div class="player ${rightClass}">
                <div class="team-label">${rightLabel}</div>
                ${rightSorted.map(player => `
                    <div class="player-name">${formatPlayerName(player, profileUserId, currentUserId)}</div>
                `).join('')}
                <div class="player-score">${rightScore}</div>
            </div>
        `;
    }
    
    return `
        <div class="match-card" data-format="${session.format}">
            <div class="match-header">
                <span class="mode-badge" data-mode="${session.mode}">
                    <span class="mode-emoji">${modeBadge.emoji}</span>
                    <span class="mode-label">${modeBadge.label}</span>
                </span>
                <span class="match-date" title="${localDate}">${relativeDate}</span>
            </div>
            ${badgesHTML}
            
            <div class="match-score">
                ${matchScoreHTML}
            </div>
            
            <div class="match-footer">
                ${outcomeHTML}
                <span class="match-duration-separator">•</span>
                <span class="match-duration">${duration}</span>
            </div>
        </div>
    `;
}

/**
 * Creates a loading skeleton card
 */
export function createSkeletonCard(): string {
    return `
        <div class="match-card skeleton">
            <div class="match-header">
                <div class="skeleton-badge"></div>
                <div class="skeleton-date"></div>
            </div>
            <div class="match-score">
                <div class="skeleton-player"></div>
                <div class="skeleton-divider"></div>
                <div class="skeleton-player"></div>
            </div>
            <div class="match-footer">
                <div class="skeleton-duration"></div>
            </div>
        </div>
    `;
}

/**
 * Creates an empty state message
 */
export function createEmptyState(): string {
    return `
        <div class="empty-state">
            <div class="empty-icon">🎮</div>
            <h3 data-i18n="noMatchesYet">${t("noMatchesYet")}</h3>
            <p data-i18n="noMatchesExplanation">${t("noMatchesExplanation")}</p>
            <a data-route="/pong" class="match-history-btn" data-i18n="playNow">${t("playNow")}</a>
        </div>
    `;
}

/**
 * Creates an error state message
 */
export function createErrorState(message: string = 'Failed to load match history'): string {
    return `
        <div class="error-state">
            <div class="error-icon">⚠️</div>
            <h3>Oops!</h3>
            <p>${message}</p>
            <button class="btn-secondary retry-btn">Try Again</button>
        </div>
    `;
}

/**
 * Attaches navigation event listeners to match card links
 * Call this after rendering match cards to enable SPA navigation
 */
export function attachMatchCardListeners(): void {
    const matchContainer = document.querySelector('.match-history-container');
    if (!matchContainer) return;
    
    // Attach listeners to player links and "Play Now" button
    matchContainer.querySelectorAll('[data-route]').forEach(link => {
        link.addEventListener('click', (e) => {
            e.preventDefault();
            const path = (e.currentTarget as HTMLElement).dataset.route;
            if (path && (window as any).navigateTo) {
                (window as any).navigateTo(path);
            }
        });
    });
}
