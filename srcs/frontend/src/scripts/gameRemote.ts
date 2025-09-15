export default function initRemoteGame(): void {
    console.log("Remote Player module starting");
    
    const canvas = document.getElementById("pong") as HTMLCanvasElement;
    if (!canvas) {
        console.error("Canvas not found");
        return;
    }
    
    createSimpleInterface();
}

function createSimpleInterface(): void {
    const container = document.querySelector('.pong-container');
    if (!container) return;
    
    container.innerHTML = `
        <h2>REMOTE PLAYER</h2>
        <button class="pong-btn" id="test-create">Create Game</button>
        <input id="test-code" placeholder="Game Code">
        <button class="pong-btn" id="test-join">Join Game</button>
        <div id="remote-status">Ready</div>
    `;
    
    setupTestEvents();
}

function setupTestEvents(): void {
    document.getElementById('test-create')?.addEventListener('click', () => {
        const code = generateCode();
        showRemoteStatus(`Game created! Code: ${code}`);
    });
    
    document.getElementById('test-join')?.addEventListener('click', () => {
        const input = document.getElementById('test-code') as HTMLInputElement;
        const code = input.value.trim();
        
        if (!code) {
            showRemoteStatus("Enter a code first!");
            return;
        } 
        showRemoteStatus(`Connected to game: ${code}`);
    });
}
//reuse for websocket later!!!
function showRemoteStatus(message: string): void {
    const statusEl = document.getElementById('remote-status');
    
    if (statusEl) {
        statusEl.textContent = message;
    }
}

function generateCode(): string {
    return Math.random().toString(36).substr(2, 6).toUpperCase();
}