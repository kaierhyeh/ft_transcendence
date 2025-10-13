export class TournamentApiService {
    private readonly API_MATCHMAKING_ENDPOINT = `${window.location.origin}/api/match`;
    private readonly API_GAME_ENDPOINT = `${window.location.origin}/api/game`;

    async createGameSession(player1: string, player2: string, tournamentId?: number): Promise<{ game_id: number; jwt_tickets: string[] }> {
        try {
            // Create participants array following matchmaking schema
            const participants = [
                {
                    type: "guest" as const,  // Tournament players are guest users
                    user_id: undefined       // No user_id for guest users
                },
                {
                    type: "guest" as const,
                    user_id: undefined
                }
            ];

            // Use matchmaking service to create the match
            const response = await fetch(`${this.API_MATCHMAKING_ENDPOINT}/make`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    mode: 'tournament',           // Use 'pvp' mode for tournament matches
                    format: '1v1',
                    participants: participants
                })
            });

            if (!response.ok) {
                const errorText = await response.text();
                console.error('Matchmaking API Error:', response.status, errorText);
                throw new Error(`Failed to create tournament match: ${response.status}`);
            }

            const matchResult = await response.json();
            console.log('Tournament match created with ID:', matchResult.game_id);
            console.log('JWT tickets received:', matchResult.jwt_tickets.length);

            await this.validateGameSession(matchResult.game_id);
            
            return {
                game_id: matchResult.game_id,
                jwt_tickets: matchResult.jwt_tickets
            };
        } catch (error) {
            console.error('Error creating tournament game:', error);
            throw error;
        }
    }

    async validateGameSession(gameId: number): Promise<void> {
        try {
            const configResponse = await fetch(`${this.API_GAME_ENDPOINT}/${gameId}/conf`);
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

    createMultipleWebSocketConnections(gameId: number, jwtTickets: string[]): WebSocket[] {
        const websockets: WebSocket[] = [];
        const protocol = window.location.protocol === 'https:' ? 'wss' : 'ws';
        
        for (let i = 0; i < jwtTickets.length; i++) {
            const url = `${protocol}://${window.location.host}/api/game/${gameId}/ws`;
            console.log(`Connecting tournament WebSocket ${i} to:`, url);
            
            const ws = new WebSocket(url);
            websockets.push(ws);
        }
        
        return websockets;
    }
}