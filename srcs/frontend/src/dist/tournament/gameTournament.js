import { TournamentApiService } from './api.js';
import { initGame } from '../game.js';
export class TournamentGameManager {
    constructor() {
        this.gameId = null;
        this.gameWebSocket = null;
        this.currentGameWinner = null;
        this.gameStarted = false;
        this.gameEnded = false;
        this.currentMatch = null;
        this.onGameEndCallback = null;
        this.inputInterval = null;
        this.keys = {};
        this.apiService = new TournamentApiService();
    }
    setOnGameEndCallback(callback) {
        this.onGameEndCallback = callback;
    }
    async initTournamentGame(canvas, match) {
        console.log('Initializing tournament game for match:', match);
        this.currentMatch = match;
        this.cleanupGame();
        try {
            this.gameId = await this.apiService.createGameSession(match.player1, match.player2);
            if (this.gameId !== null && this.gameId !== undefined)
                this.connectTournamentWebSocket(this.gameId);
            else
                throw new Error('Invalid game ID received');
            canvas.id = 'pong';
            initGame();
            setTimeout(() => {
                const gameSystem = window.gameSystem;
                if (gameSystem) {
                    gameSystem.setGameConfig?.({
                        canvas_width: 800,
                        canvas_height: 750,
                        paddle_height: 50,
                        paddle_width: 10,
                        win_point: 7,
                        ball_size: 10
                    });
                    gameSystem.setGameStarted?.(true);
                }
            }, 300);
        }
        catch (error) {
            console.error('Error creating tournament game:', error);
            throw error;
        }
    }
    cleanupGame() {
        if (window.gameSystem) {
            const gameSystem = window.gameSystem;
            if (gameSystem.cleanup)
                gameSystem.cleanup();
        }
        this.cleanupControls();
        if (this.gameWebSocket) {
            this.gameWebSocket.close();
            this.gameWebSocket = null;
        }
        this.gameId = null;
        this.currentGameWinner = null;
        this.gameStarted = false;
        this.gameEnded = false;
    }
    setupTournamentControls() {
        if (!this.currentMatch)
            return;
        this.keys = {};
        const keyDownHandler = (e) => {
            this.keys[e.key] = true;
        };
        const keyUpHandler = (e) => {
            this.keys[e.key] = false;
        };
        document.addEventListener('keydown', keyDownHandler);
        document.addEventListener('keyup', keyUpHandler);
        window.tournamentKeyHandlers = { keyDownHandler, keyUpHandler };
        this.inputInterval = setInterval(() => {
            this.sendCurrentInputs();
        }, 50);
    }
    cleanupControls() {
        const handlers = window.tournamentKeyHandlers;
        if (handlers) {
            document.removeEventListener('keydown', handlers.keyDownHandler);
            document.removeEventListener('keyup', handlers.keyUpHandler);
            window.tournamentKeyHandlers = null;
        }
        if (this.inputInterval) {
            clearInterval(this.inputInterval);
            this.inputInterval = null;
        }
    }
    sendCurrentInputs() {
        if (!this.gameWebSocket || this.gameWebSocket.readyState !== WebSocket.OPEN || !this.currentMatch)
            return;
        let move1 = 'stop';
        if (this.keys['w'] || this.keys['W'])
            move1 = 'up';
        else if (this.keys['s'] || this.keys['S'])
            move1 = 'down';
        this.gameWebSocket.send(JSON.stringify({
            type: 'input',
            participant_id: `player_${this.currentMatch.player1}`,
            move: move1
        }));
        let move2 = 'stop';
        if (this.keys['ArrowUp'])
            move2 = 'up';
        else if (this.keys['ArrowDown'])
            move2 = 'down';
        this.gameWebSocket.send(JSON.stringify({
            type: 'input',
            participant_id: `player_${this.currentMatch.player2}`,
            move: move2
        }));
    }
    connectTournamentWebSocket(id) {
        if (!this.currentMatch)
            return;
        this.gameWebSocket = this.apiService.createWebSocketConnection(id);
        this.gameWebSocket.onopen = () => {
            console.log('Tournament WebSocket connected successfully');
            const player1Id = `player_${this.currentMatch.player1}`;
            const player2Id = `player_${this.currentMatch.player2}`;
            console.log('Joining as players:', player1Id, player2Id);
            this.gameWebSocket?.send(JSON.stringify({
                type: 'join',
                participant_id: player1Id
            }));
            setTimeout(() => {
                this.gameWebSocket?.send(JSON.stringify({
                    type: 'join',
                    participant_id: player2Id
                }));
            }, 100);
            this.setupTournamentControls();
        };
        this.gameWebSocket.onmessage = (event) => {
            try {
                const message = JSON.parse(event.data);
                if (message.type === 'game_state')
                    this.handleTournamentGameState(message.data);
            }
            catch (error) {
                console.error('Error parsing tournament game data:', error);
            }
        };
        this.gameWebSocket.onclose = (event) => {
            console.log('Tournament WebSocket disconnected:', event.code, event.reason);
        };
        this.gameWebSocket.onerror = (error) => {
            console.error('Tournament WebSocket error:', error);
            const canvas = document.getElementById('tournament-pong');
            const ctx = canvas?.getContext('2d');
            if (ctx) {
                ctx.fillStyle = '#ef4444';
                ctx.font = '16px Arial';
                ctx.textAlign = 'center';
                ctx.fillText('WebSocket connection error - check server status', canvas.width / 2, canvas.height / 2 + 60);
            }
        };
    }
    handleTournamentGameState(gameState) {
        const gameSystem = window.gameSystem;
        if (!gameSystem) {
            console.error('Game system not available for tournament');
            return;
        }
        gameSystem.setGameState?.(gameState);
        gameSystem.draw?.();
        if (gameState.winner && this.currentMatch) {
            const winner = gameState.winner === 'left' ?
                this.currentMatch.player1 :
                this.currentMatch.player2;
            this.onTournamentGameEnd(winner);
        }
    }
    onTournamentGameEnd(winner) {
        this.currentGameWinner = winner;
        this.cleanupControls();
        if (this.gameWebSocket) {
            this.gameWebSocket.close();
            this.gameWebSocket = null;
        }
        if (window.gameSystem) {
            const gameSystem = window.gameSystem;
            if (gameSystem.setGameStarted)
                gameSystem.setGameStarted(false);
        }
        if (this.onGameEndCallback)
            this.onGameEndCallback(winner);
    }
    getCurrentGameWinner() {
        return this.currentGameWinner;
    }
    resetGame() {
        this.cleanupGame();
    }
    cleanup() {
        this.cleanupGame();
    }
}
//# sourceMappingURL=gameTournament.js.map