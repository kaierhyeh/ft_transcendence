export type UserData = {
    user_id: number;
    username: string | null;
    email: string | null;
    alias: string | null;
    avatar_url: string | null;
    two_fa_enabled: boolean;
    status: "online" | "offline" | "away" | "deleted";
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

    /**
     * Check if user is authenticated and has data
     */
    public isLoggedIn(): boolean {
        return this.isAuthenticated && this.data !== null;
    }

    /**
     * Get user data (returns null if not authenticated)
     */
    public getData(): UserData | null {
        return this.data;
    }

    /**
     * Get specific user property safely
     */
    public get<K extends keyof UserData>(key: K): UserData[K] | null {
        return this.data ? this.data[key] : null;
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
            if (typeof partialData.user_id !== 'number') {
                console.error('User.update: user_id is required for new user data');
                return false;
            }
            
            // Create new user data with defaults
            this.data = {
                user_id: partialData.user_id,
                username: partialData.username || null,
                email: partialData.email || null,
                alias: partialData.alias || null,
                avatar_url: partialData.avatar_url || null,
                two_fa_enabled: partialData.two_fa_enabled || false,
                status: partialData.status || "online",
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
            const response = await fetch('https://localhost:4443/api/users/profile/me', {
                method: 'GET',
                credentials: 'include'
            });

            if (!response.ok) {
                console.error('Failed to fetch user profile:', response.status);
                this.logout();
                return false;
            }

            const userData: UserData = await response.json();
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
    }

    /**
     * Get user display name (alias > username > email > "User")
     */
    public getDisplayName(): string {
        if (!this.data) return 'User';
        return this.data.alias || this.data.username || this.data.email || 'User';
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
    // public getAvatarUrl(): string {
    //     return this.data?.avatar_url || '';
    // }
}

const user = new User();
export default user;