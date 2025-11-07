// pong/ScoreDisplay.ts
import type { ScoreData } from './ScoreTracker.js';
import { t } from '../i18n/i18n.js';    // t for translations

export class ScoreDisplay {
    private breakdownElement: HTMLElement | null = null;
    private averageElement: HTMLElement | null = null;
    private pointsLabel: HTMLElement | null = null;
    private gameInfoContainer: HTMLElement | null = null;
    private isHiddenForSmallScreens: boolean = false;
    
    /**
     * Initialize DOM element references
     */
    initialize(): void {
        this.breakdownElement = document.getElementById('pong-points-display');
        this.averageElement = document.getElementById('pong-rally-info');
        this.pointsLabel = document.querySelector('.game-info-label');
        this.gameInfoContainer = document.querySelector('.pong-game-info');

        this.adjustVisibility();
        const debounced = this.debounce(() => this.adjustVisibility(), 120);
        window.addEventListener('resize', debounced);
    }
    
    /**
     * Update display with new score data
     */
    update(data: ScoreData): void {
        // Update points breakdown
        if (this.breakdownElement) {
            if (!this.isHiddenForSmallScreens) {
                this.breakdownElement.textContent = 
                    `${t('left')}: ${data.leftPoints}  ·  ${t('right')}: ${data.rightPoints}`;
            }
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

    private adjustVisibility(): void {
        const shouldHide = window.innerWidth < 640;
        this.isHiddenForSmallScreens = shouldHide;

        if (this.pointsLabel) {
            this.pointsLabel.style.display = shouldHide ? 'none' : '';
        }

        if (this.breakdownElement) {
            this.breakdownElement.style.display = shouldHide ? 'none' : '';
        }
    }

    private debounce(fn: () => void, ms: number) {
        let t: number | undefined;
        return () => {
            if (t) window.clearTimeout(t);
            t = window.setTimeout(fn, ms);
        };
    }
}