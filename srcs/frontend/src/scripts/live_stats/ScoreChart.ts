// pong/ScoreChart.ts
import type { ScoreData } from './ScoreTracker.js';

export class ScoreChart {
    private chart: any = null;
    private canvasElement: HTMLCanvasElement | null = null;
    
    /**
     * Initialize the Chart.js instance
     */
    initialize(canvasId: string = 'pong-score-chart'): boolean {
        // Check if Chart.js is loaded
        if (typeof (window as any).Chart === 'undefined') {
            console.warn('Chart.js not loaded, score chart will not be displayed');
            return false;
        }
        
        this.canvasElement = document.getElementById(canvasId) as HTMLCanvasElement | null;
        if (!this.canvasElement) {
            console.warn(`Canvas element '${canvasId}' not found`);
            return false;
        }
        
        const ctx = this.canvasElement.getContext('2d');
        if (!ctx) {
            console.warn('Failed to get 2D context for score chart');
            return false;
        }
        
        // Create horizontal bar chart
        this.chart = new (window as any).Chart(ctx, {
            type: 'bar',
            data: {
                labels: [''],
                datasets: [
                    {
                        label: 'Scored',
                        data: [50],
                        backgroundColor: '#22c55e',
                        barThickness: 18,
                        stack: 'stack1',
                        borderRadius: 6
                    },
                    {
                        label: 'Conceded',
                        data: [50],
                        backgroundColor: '#ef4444',
                        barThickness: 18,
                        stack: 'stack1',
                        borderRadius: 6
                    }
                ]
            },
            options: {
                indexAxis: 'y',
                responsive: false,
                plugins: {
                    legend: { display: false }
                },
                scales: {
                    x: {
                        display: false,
                        max: 100,
                        stacked: true
                    },
                    y: {
                        display: false,
                        stacked: true
                    }
                }
            }
        });
        
        return true;
    }
    
    /**
     * Update chart with new score data
     */
    update(data: ScoreData): void {
        if (!this.chart) return;
        
        const total = data.leftPoints + data.rightPoints;
        const leftPercentage = total > 0 
            ? Math.round((data.leftPoints / total) * 100)
            : 50;
        
        this.chart.data.datasets[0].data = [leftPercentage];
        this.chart.data.datasets[1].data = [100 - leftPercentage];
        this.chart.update();
    }
    
    /**
     * Destroy chart instance
     */
    destroy(): void {
        if (this.chart) {
            this.chart.destroy();
            this.chart = null;
        }
    }
}