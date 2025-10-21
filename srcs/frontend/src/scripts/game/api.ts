// api.ts

import { GameConfig, GameFormat, GameMode, GameParticipant } from "./types";

const API_GAME_ENDPOINT = `${window.location.origin}/api/game`;

// --- Matchmaking Service API ---
export async function createMatch(gameMode: GameMode,gameFormat: GameFormat, participants: GameParticipant[]): Promise<{game_id: number}> {
    try {
        const response = await fetch(`${API_GAME_ENDPOINT}/create`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                format: gameFormat,
                mode: gameMode,
                participants: participants
            })
        });

        if (!response.ok) {
            throw new Error(`Matchmaking failed: ${response.status}`);
        }

        return await response.json() as {game_id: number};
    } catch (error) {
        console.error('Failed to create match:', error);
        throw error;
    }
}

export async function getGameConfig(gameId: number): Promise<GameConfig> {
    try {
        const configResponse = await fetch(`${API_GAME_ENDPOINT}/${gameId}/conf`);
        if (!configResponse.ok) {
            console.error('Failed to get game config:', configResponse.status);
            throw new Error('Game session not accessible');
        }
        return await configResponse.json() as GameConfig;
    } catch (configError) {
        console.error('Error checking game config:', configError);
        throw new Error('Game session validation failed');
    }
}