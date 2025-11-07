// InputController.ts
import { INPUT_INTERVAL_MS } from "./config.js";
import type { GameSession } from "./GameSession.js";

export class InputController {
    private keys: { [key: string]: boolean } = {};
    private session: GameSession | null = null;
    private inputInterval: number | null = null;
    private keydownHandler: (e: KeyboardEvent) => void;
    private keyupHandler: (e: KeyboardEvent) => void;
    private customKeyHandlers: Map<string, (e: KeyboardEvent) => void> = new Map();
    
    constructor() {
        this.keydownHandler = (e: KeyboardEvent) => {
            this.keys[e.key] = true;
        };
        
        this.keyupHandler = (e: KeyboardEvent) => {
            this.keys[e.key] = false;
        };
        
        document.addEventListener("keydown", this.keydownHandler);
        document.addEventListener("keyup", this.keyupHandler);
    }
    
    attachToSession(session: GameSession): void {
        this.session = session;
        this.startInputLoop();
    }
    
    detach(): void {
        this.stopInputLoop();
        this.session = null;
        this.keys = {};
    }
    
    cleanup(): void {
        this.detach();
        // Remove custom key handlers
        this.customKeyHandlers.forEach((handler) => {
            document.removeEventListener("keydown", handler);
        });
        this.customKeyHandlers.clear();
        
        document.removeEventListener("keydown", this.keydownHandler);
        document.removeEventListener("keyup", this.keyupHandler);
    }
    
    /**
     * Register a callback for a specific key press
     * Note: This will fire on every keydown event (including repeats when key is held)
     * If you want one-time trigger, check state in your callback
     */
    onKey(key: string, callback: () => void): void {
        // Remove old handler if exists
        const oldHandler = this.customKeyHandlers.get(key);
        if (oldHandler) {
            document.removeEventListener("keydown", oldHandler);
        }
        
        // Create new handler
        const handler = (e: KeyboardEvent) => {
            if (e.key === key) {
                callback();
            }
        };
        
        this.customKeyHandlers.set(key, handler);
        document.addEventListener("keydown", handler);
    }
    
    private startInputLoop(): void {
        if (this.inputInterval !== null) return;
        if (!this.session) return;
        
        this.inputInterval = setInterval(() => {
            if (!this.session) return;
            
            if (this.session.format === '1v1') {
                // Player 0 - W/S
                let p0Move: 'up' | 'down' | 'stop' = 'stop';
                if (this.keys['w']) p0Move = 'up';
                else if (this.keys['s']) p0Move = 'down';
                this.session.sendInput(0, p0Move);
                
                // Player 1 - Arrow keys (unless AI or online pvp)
                if (this.session.mode !== 'solo' && !this.session.online) {
                    let p1Move: 'up' | 'down' | 'stop' = 'stop';
                    if (this.keys['ArrowUp']) p1Move = 'up';
                    else if (this.keys['ArrowDown']) p1Move = 'down';
                    this.session.sendInput(1, p1Move);
                }
            } else {
                // 4-player controls
                const keyMappings = [
                    { up: "w", down: "s" },
                    { up: "a", down: "z" },
                    { up: "ArrowUp", down: "ArrowDown" },
                    { up: "o", down: "l" }
                ];
                
                keyMappings.forEach((mapping, index) => {
                    let move: 'up' | 'down' | 'stop' = 'stop';
                    if (this.keys[mapping.up]) move = 'up';
                    else if (this.keys[mapping.down]) move = 'down';
                    this.session!.sendInput(index, move);
                });
            }
        }, INPUT_INTERVAL_MS) as unknown as number;
    }
    
    private stopInputLoop(): void {
        if (this.inputInterval !== null) {
            clearInterval(this.inputInterval);
            this.inputInterval = null;
        }
    }
}