// pong/ScoreDisplay.ts
import type { ScoreData } from './ScoreTracker.js';
import { t } from '../i18n/i18n.js';    // t for translations

export class ScoreDisplay {
    private breakdownElement: HTMLElement | null = null;
    private averageElement: HTMLElement | null = null;
    
    /**
     * Initialize DOM element references
     */
    initialize(): void {
        this.breakdownElement = document.getElementById('pong-points-display');
        this.averageElement = document.getElementById('pong-rally-info');
    }
    
    /**
     * Update display with new score data
     */
    update(data: ScoreData): void {
        // Update points breakdown
        if (this.breakdownElement) {
            this.breakdownElement.textContent = 
                `${t('left')}: ${data.leftPoints}  ·  ${t('right')}: ${data.rightPoints}`;
        }
        
        // Update average rally length
        if (this.averageElement) {
            if (data.rallyHistory.length === 0) {
                this.averageElement.textContent = `${t('avgRebounds')}: —`;
            } else {
                this.averageElement.textContent = 
                    `${t('avgRebounds')}: ${data.averageRallyLength.toFixed(2)}`;
            }
        }
    }
}