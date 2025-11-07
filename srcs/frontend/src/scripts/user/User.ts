import { presence } from "../presence.js";

export type UserData = {
    user_id: number;
    username: string;
    alias: string | null;
    email: string | null;
    avatar_url: string;
    avatar_updated_at: string;
    two_fa_enabled: boolean;
    created_at: string;
    updated_at: string;
    last_seen: string | null;
    // + some LiteStats
    wins: number;
    losses: number;
    curr_winstreak: number;
    best_winstreak: number;
    total_point_scored: number;
};

export type PartialUserData = Partial<UserData>;

export class User {
    private data: UserData | null = null;
    private isAuthenticated: boolean = false;
    private readonly API_USERS_ENDPOINT = `${window.location.origin}/api/users`;


    /**
     * Check if user is authenticated and has data (synchronous, no network call)
     */
    public isLoggedIn(): boolean {
        return this.isAuthenticated && this.data !== null;
    }

    /**
     * Verify authentication with backend and ensure tokens are still valid
     * Use this before critical operations (game/tournament creation) when you need
     * to guarantee the user is actually authenticated, not just locally cached
     * @returns true if authenticated, false otherwise
     */
    public async ensureAuthenticated(): Promise<boolean> {
        if (!this.isLoggedIn()) {
            return false;
        }

        try {
            const response = await fetch(`${window.location.origin}/api/auth/verify`, {
                method: 'POST',
                credentials: 'include'
            });

            if (!response.ok) {
                console.warn('Authentication verification failed:', response.status);
                this.logout();
                return false;
            }

            return true;
        } catch (error) {
            console.error('Error verifying authentication:', error);
            this.logout();
            return false;
        }
    }

    /**
     * Get user data (returns null if not authenticated)
     */
    public getData(): UserData | null {
        return this.data;
    }

    // Individual getters for each property - return null when no data available
    public get user_id(): number | null {
        return this.data?.user_id ?? null;
    }

    public get username(): string | null {
        return this.data?.username ?? null;
    }

    public get alias(): string | null {
        return this.data?.alias ?? null;
    }
    
    public get email(): string | null {
        return this.data?.email ?? null;
    }

    public get avatar_url(): string | null {
        const data = this.data;
        const updated_at = data?.avatar_updated_at ?? null;
        const user_id = data?.user_id ?? null;
        if (data && updated_at && user_id) {
            const timestamp = new Date(updated_at).getTime();
            return `${window.location.origin}/api/users/${user_id}/avatar?v=${timestamp}`;
        }
        return null;
    }

    public get two_fa_enabled(): boolean | null {
        return this.data?.two_fa_enabled ?? null;
    }

    public get created_at(): string | null {
        return this.data?.created_at ?? null;
    }

    public get updated_at(): string | null {
        return this.data?.updated_at ?? null;
    }

    public get last_seen(): string | null {
        return this.data?.last_seen ?? null;
    }

    // Stats getters - return null when no data available, not 0
    public get wins(): number | null {
        return this.data?.wins ?? null;
    }

    public get losses(): number | null {
        return this.data?.losses ?? null;
    }

    public get curr_winstreak(): number | null {
        return this.data?.curr_winstreak ?? null;
    }

    public get best_winstreak(): number | null {
        return this.data?.best_winstreak ?? null;
    }

    public get total_point_scored(): number | null {
        return this.data?.total_point_scored ?? null;
    }

    // Computed property - returns null if no data available
    public get winRate(): number | null {
        if (!this.data) return null;
        
        const wins = this.data.wins;
        const losses = this.data.losses;
        const total = wins + losses;
        
        return total > 0 ? (wins / total) * 100 : 0;
    }

    /**
     * Update user data with partial data
     * At least one property must be provided, or no update occurs
     */
    public update(partialData: PartialUserData): boolean {
        // Check if at least one property is provided
        const hasData = Object.keys(partialData).length > 0;
        if (!hasData) {
            console.warn('User.update: No data provided for update');
            return false;
        }

        // If no existing data, create new user data (for initial login)
        if (!this.data) {
            // Ensure required fields are present for new user
            if (typeof partialData.user_id !== 'number' || 
                typeof partialData.username !== 'string' ||
                typeof partialData.avatar_url !== 'string' ||
                typeof partialData.avatar_updated_at !== 'string') {
                console.error('User.update: Required fields missing for new user data');
                return false;
            }
            
            // Create new user data with defaults
            this.data = {
                user_id: partialData.user_id,
                username: partialData.username,
                alias: partialData.alias ?? null,
                email: partialData.email ?? null,
                avatar_url: partialData.avatar_url,
                avatar_updated_at: partialData.avatar_updated_at,
                two_fa_enabled: partialData.two_fa_enabled || false,
                created_at: partialData.created_at || new Date().toISOString(),
                updated_at: partialData.updated_at || new Date().toISOString(),
                last_seen: partialData.last_seen || null,
                wins: partialData.wins || 0,
                losses: partialData.losses || 0,
                curr_winstreak: partialData.curr_winstreak || 0,
                best_winstreak: partialData.best_winstreak || 0,
                total_point_scored: partialData.total_point_scored || 0,
            };
        } else {
            // Update existing data
            this.data = { ...this.data, ...partialData };
        }

        this.isAuthenticated = true;
        return true;
    }

    /**
     * Fetch and update user data from API
     */
    public async fetchAndUpdate(): Promise<boolean> {
        try {
            const response = await fetch(`${this.API_USERS_ENDPOINT}/me`, {
                method: 'GET',
                credentials: 'include'
            });

            if (!response.ok) {
                console.error('Failed to fetch user profile:', response.status);
                this.logout();
                return false;
            }

            const userData: UserData = await response.json();
            await presence.checkin();
            return this.update(userData);
        } catch (error) {
            console.error('Error fetching user profile:', error);
            this.logout();
            return false;
        }
    }

    /**
     * Clear user data (logout)
     */
    public logout(): void {
        this.data = null;
        this.isAuthenticated = false;
        presence.checkout();
    }

    /**
     * Get user display name (alias > username > "User")
     */
    public getDisplayName(): string {
        if (!this.data) return 'User';
        return this.data.alias || this.data.username || 'User';
    }

    /**
     * Get user initials for avatar fallback
     */
    public getInitials(): string {
        const displayName = this.getDisplayName();
        if (displayName === 'User') return 'U';
        
        const words = displayName.split(' ');
        if (words.length >= 2) {
            return (words[0][0] + words[1][0]).toUpperCase();
        }
        return displayName.substring(0, 2).toUpperCase();
    }

    // /**
    //  * Get avatar URL with fallback
    //  */
    static getAvatarUrl(user_id: number, avatar_updated_at: string): string {
        const timestamp = new Date(avatar_updated_at).getTime();
        return `${window.location.origin}/api/users/${user_id}/avatar?v=${timestamp}`;
    }

}

export default new User();