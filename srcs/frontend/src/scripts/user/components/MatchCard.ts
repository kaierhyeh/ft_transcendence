// user/components/MatchCard.ts
import type { GameSession, PlayerData } from '../types.js';

interface MatchCardData {
    session: GameSession;
    currentUserId: number | null;
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

    if (diffSeconds < 60) return 'Just now';
    if (diffMinutes < 60) return `${diffMinutes}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays === 1) return 'Yesterday';
    if (diffDays < 7) return `${diffDays} days ago`;
    
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
function getModeBadge(mode: GameSession['mode']): { label: string; emoji: string } {
    switch (mode) {
        case 'solo':
            return { label: 'Solo', emoji: '🤖' };
        case 'pvp':
            return { label: 'PvP', emoji: '⚔️' };
        case 'tournament':
            return { label: 'Tournament', emoji: '🏆' };
    }
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
function formatPlayerName(player: PlayerData | undefined): string {
    if (!player) return 'Unknown';
    
    if (player.type === 'ai') {
        return '<span class="ai-player">AI Bot</span>';
    }
    
    if (player.type === 'guest') {
        return '<span class="guest-player">Guest</span>';
    }
    
    // Registered user with link to profile
    if (player.username) {
        return `<a href="/user/profile?id=${player.user_id}" class="player-link">${player.username}</a>`;
    }
    
    return 'Player';
}

/**
 * Creates a match history card HTML
 */
export function createMatchCard(data: MatchCardData): string {
    const { session, currentUserId } = data;
    const { currentPlayer, opponent } = getPlayerInfo(session, currentUserId);
    
    if (!currentPlayer || !opponent) {
        console.error('Invalid player data in session:', session);
        return '';
    }
    
    const modeBadge = getModeBadge(session.mode);
    const relativeDate = formatRelativeDate(session.created_at);
    const localDate = formatLocalDate(session.created_at);
    const duration = formatDuration(session.started_at, session.ended_at);
    
    const isCurrentPlayerWinner = currentPlayer.winner === 1;
    const currentPlayerClass = isCurrentPlayerWinner ? 'winner' : 'loser';
    const opponentClass = isCurrentPlayerWinner ? 'loser' : 'winner';
    
    return `
        <div class="match-card">
            <div class="match-header">
                <span class="mode-badge" data-mode="${session.mode}">
                    <span class="mode-emoji">${modeBadge.emoji}</span>
                    <span class="mode-label">${modeBadge.label}</span>
                </span>
                <span class="match-date" title="${localDate}">${relativeDate}</span>
            </div>
            
            <div class="match-score">
                <div class="player ${currentPlayerClass}">
                    <div class="player-name">${formatPlayerName(currentPlayer)}</div>
                    <div class="player-score">${currentPlayer.score}</div>
                </div>
                
                <div class="match-divider">
                    <span class="vs-text">VS</span>
                </div>
                
                <div class="player ${opponentClass}">
                    <div class="player-name">${formatPlayerName(opponent)}</div>
                    <div class="player-score">${opponent.score}</div>
                </div>
            </div>
            
            <div class="match-footer">
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
            <h3>No matches yet</h3>
            <p>Your match history will appear here after you play some games!</p>
            <a href="/pong" class="match-history-btn">Play Now</a>
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