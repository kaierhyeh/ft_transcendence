// GameMessenger.ts
// Handles all game notification messages displayed over the game canvas
// Decouples message display logic from game rendering

export class GameMessenger {
    private messageElement: HTMLElement | null;

    constructor(elementId: string = 'game-message') {
        this.messageElement = document.getElementById(elementId);
        
        if (!this.messageElement) {
            console.warn(`GameMessenger: Element with id '${elementId}' not found. Messages will not be displayed.`);
        }
    }

    /**
     * Show a message overlay
     * @param text - The message text to display
     * @param clickable - Whether the message should be clickable
     * @param onClick - Optional click handler for clickable messages
     */
    show(text: string, clickable: boolean = false, onClick?: () => void): void {
        if (!this.messageElement) return;

        this.messageElement.textContent = text;
        this.messageElement.style.display = 'block';

        if (clickable) {
            this.messageElement.classList.add('clickable');
            if (onClick) {
                this.messageElement.onclick = onClick;
            }
        } else {
            this.messageElement.classList.remove('clickable');
            this.messageElement.onclick = null;
        }
    }

    /**
     * Hide the message overlay
     */
    hide(): void {
        if (!this.messageElement) return;

        this.messageElement.style.display = 'none';
        this.messageElement.classList.remove('clickable');
        this.messageElement.onclick = null;
    }

    /**
     * Show a clickable "Join" message
     */
    showJoinPrompt(onJoin: () => void): void {
        this.show("Join the game", true, onJoin);
    }

    /**
     * Show a non-clickable "Waiting for opponent" message
     */
    showWaiting(): void {
        this.show("Waiting for opponent...", false);
    }

    /**
     * Show a non-clickable "Connecting" message
     */
    showConnecting(): void {
        this.show("Connecting...", false);
    }

    /**
     * Show game over message
     */
    showGameOver(won: boolean): void {
        this.show(won ? "You won!" : "You lost!", false);
    }

    /**
     * Show opponent disconnected message
     */
    showOpponentDisconnected(): void {
        this.show("Your opponent left the game. You win by forfeit!", false);
    }

    /**
     * Show connection lost message
     */
    showConnectionLost(): void {
        this.show("Connection lost", false);
    }

    /**
     * Show error message
     */
    showError(message: string): void {
        this.show(message, false);
    }

    /**
     * Check if messenger is available (element exists)
     */
    isAvailable(): boolean {
        return this.messageElement !== null;
    }
}
