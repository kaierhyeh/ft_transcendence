export class TournamentApiService {
    private readonly API_GAME_ENDPOINT = `${window.location.origin}/api/game`;

    async createGameSession(player1: string, player2: string, tournamentId?: number): Promise<number> {
        try {
            const response = await fetch('/api/game/create', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    type: 'tournament',
                    tournament_id: tournamentId || Math.floor(Math.random() * 1000000),
                    participants: [
                        { 
                            user_id: 1, 
                            participant_id: `player_${player1}`,
                            is_ai: false 
                        },
                        { 
                            user_id: 2, 
                            participant_id: `player_${player2}`,
                            is_ai: false 
                        }
                    ]
                })
            });

            if (!response.ok) {
                const errorText = await response.text();
                console.error('API Error:', response.status, errorText);
                throw new Error(`Failed to create game session: ${response.status}`);
            }

            const gameData = await response.json();
            console.log('Raw API response:', gameData);
            const gameId = gameData.game_id;
            console.log('Created game session with ID:', gameId);
            console.log('Type of gameId:', typeof gameId);

            await this.validateGameSession(gameId);
            
            return gameId;
        } catch (error) {
            console.error('Error creating tournament game:', error);
            throw error;
        }
    }

    async validateGameSession(gameId: number): Promise<void> {
        try {
            const configResponse = await fetch(`/api/game/${gameId}/conf`);
            if (configResponse.ok) {
                const config = await configResponse.json();
                console.log('Game config retrieved:', config);
            } else {
                console.error('Failed to get game config:', configResponse.status);
                throw new Error('Game session not accessible');
            }
        } catch (configError) {
            console.error('Error checking game config:', configError);
            throw new Error('Game session validation failed');
        }
    }

    createWebSocketConnection(gameId: number): WebSocket {
        const protocol = window.location.protocol === 'https:' ? 'wss' : 'ws';
        const url = `${protocol}://${window.location.host}/api/game/${gameId}/ws`;
        
        console.log('Connecting to tournament WebSocket:', url);
        return new WebSocket(url);
    }
}