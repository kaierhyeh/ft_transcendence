// user/api.ts
import type { MatchHistoryResponse } from './types.js';

const API_USERS_ENDPOINT = `${window.location.origin}/api/users`;

export interface FetchMatchHistoryOptions {
    userId: number;
    page?: number;
    pageSize?: number;
}

export interface LeaderboardEntry {
    user_id: number;
    username: string;
    total_points_scored: number;
}

/**
 * Fetches match history for a user
 */
export async function fetchMatchHistory(
    options: FetchMatchHistoryOptions
): Promise<MatchHistoryResponse> {
    const { userId, page = 1, pageSize = 10 } = options;
    
    const url = new URL(`${API_USERS_ENDPOINT}/${userId}/match-history`);
    url.searchParams.set('page', page.toString());
    url.searchParams.set('page_size', pageSize.toString());
    
    const response = await fetch(url.toString(), {
        method: 'GET',
        credentials: 'include',
        headers: {
            'Content-Type': 'application/json'
        }
    });
    
    if (!response.ok) {
        throw new Error(`Failed to fetch match history: ${response.status}`);
    }
    
    return await response.json() as MatchHistoryResponse;
}

export async function fetchLeaderboard(limit: number = 10): Promise<LeaderboardEntry[]> {
    const url = new URL(`${API_USERS_ENDPOINT}/leaderboard`);
    url.searchParams.set('limit', limit.toString());
    
    const response = await fetch(url.toString(), {
        method: 'GET',
        credentials: 'include',
        headers: {
            'Content-Type': 'application/json'
        }
    });
    
    if (!response.ok)
        throw new Error(`Failed to fetch leaderboard: ${response.status}`);
    
    return await response.json() as LeaderboardEntry[];
}

// TODO - move fetchAndUpdate from Users.ts here