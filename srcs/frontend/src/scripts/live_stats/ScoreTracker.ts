// pong/ScoreTracker.ts

const PERSISTENT_SCORE_KEY = 'pong_persistent_score';
const RALLY_DATA_KEY = 'pong_rally_data';

export interface ScoreData {
    leftPoints: number;
    rightPoints: number;
    averageRallyLength: number;
    rallyHistory: number[];
}

// Follows the Observer Pattern or Pub/Sub Pattern
export class ScoreTracker {
    private persistentLeft: number = 0;
    private persistentRight: number = 0;
    private previousLeft: number = 0;
    private previousRight: number = 0;
    
    private currentRallyLength: number = 0;
    private rallyHistory: number[] = [];
    private previousBallDirection: number | null = null;
    
    private updateCallbacks: Array<(data: ScoreData) => void> = [];
    
    constructor() {
        this.loadFromStorage();
    }
    
    /**
     * Load persistent scores from localStorage
     */
    private loadFromStorage(): void {
        try {
            const persistentData = localStorage.getItem(PERSISTENT_SCORE_KEY);
            if (persistentData) {
                const parsed = JSON.parse(persistentData);
                this.persistentLeft = parsed.left || 0;
                this.persistentRight = parsed.right || 0;
            }
            
            const rallyData = localStorage.getItem(RALLY_DATA_KEY);
            if (rallyData) {
                const parsed = JSON.parse(rallyData);
                this.rallyHistory = Array.isArray(parsed.history) ? parsed.history : [];
            }
        } catch (e) {
            console.error('Failed to load scores from storage:', e);
        }
    }
    
    /**
     * Save scores to localStorage
     */
    private saveToStorage(): void {
        try {
            localStorage.setItem(PERSISTENT_SCORE_KEY, JSON.stringify({
                left: this.persistentLeft,
                right: this.persistentRight
            }));
            
            localStorage.setItem(RALLY_DATA_KEY, JSON.stringify({
                history: this.rallyHistory.slice(-200) // Keep last 200 rallies
            }));
        } catch (e) {
            console.error('Failed to save scores to storage:', e);
        }
    }
    
    /**
     * Update scores with current game state
     */
    update(leftScore: number, rightScore: number, ballDx: number): void {
        // 1️⃣ Detect new points scored
        if (leftScore > this.previousLeft) {
            this.persistentLeft += (leftScore - this.previousLeft);
            this.previousLeft = leftScore;
            this.onPointScored();
        }
        
        if (rightScore > this.previousRight) {
            this.persistentRight += (rightScore - this.previousRight);
            this.previousRight = rightScore;
            this.onPointScored();
        }
        
        // 2️⃣ Track rally length (paddle hits)
        if (this.previousBallDirection !== null) {
            const currentDirection = Math.sign(ballDx);
            const previousDirection = Math.sign(this.previousBallDirection);
            
            // Ball changed direction = paddle hit
            if (currentDirection !== previousDirection && currentDirection !== 0) {
                this.currentRallyLength++;
            }
        }
        this.previousBallDirection = ballDx;
        
        // 3️⃣ Save to localStorage and notify subscribers
        this.saveToStorage();
        this.notifyUpdate();
    }
    
    /**
     * Called when a point is scored
     */
    private onPointScored(): void {
        // Record the rally length
        this.rallyHistory.push(this.currentRallyLength);
        if (this.rallyHistory.length > 200) {
            this.rallyHistory.shift();
        }
        
        // Reset rally counter
        this.currentRallyLength = 0;
        this.previousBallDirection = null;
    }
    
    /**
     * Reset scores when starting a new game
     */
    resetGame(): void {
        this.previousLeft = 0;
        this.previousRight = 0;
        this.currentRallyLength = 0;
        this.previousBallDirection = null;
    }
    
    /**
     * Clear all persistent scores
     */
    resetAll(): void {
        this.persistentLeft = 0;
        this.persistentRight = 0;
        this.previousLeft = 0;
        this.previousRight = 0;
        this.rallyHistory = [];
        this.currentRallyLength = 0;
        this.previousBallDirection = null;
        
        localStorage.removeItem(PERSISTENT_SCORE_KEY);
        localStorage.removeItem(RALLY_DATA_KEY);
        
        this.notifyUpdate();
    }
    
    /**
     * Get current score data
     */
    getData(): ScoreData {
        const totalRallies = this.rallyHistory.length;
        const averageRallyLength = totalRallies > 0
            ? this.rallyHistory.reduce((sum, len) => sum + len, 0) / totalRallies
            : 0;
        
        return {
            leftPoints: this.persistentLeft,
            rightPoints: this.persistentRight,
            averageRallyLength,
            rallyHistory: [...this.rallyHistory]
        };
    }
    
    /**
     * Subscribe to score updates
     */
    onUpdate(callback: (data: ScoreData) => void): void {
        this.updateCallbacks.push(callback);
        // Call immediately with current data
        callback(this.getData());
    }
    
    /**
     * Notify all subscribers of update
     */
    private notifyUpdate(): void {
        const data = this.getData();
        this.updateCallbacks.forEach(cb => cb(data));
    }
}