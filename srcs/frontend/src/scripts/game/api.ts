// api.ts

import { GameConfig, GameFormat, GameMode, GameParticipant } from "./types";

const API_GAME_ENDPOINT = `${window.location.origin}/api/game`;

export interface GameInvitation {
    fromId: number;
    toId: number;
}

// --- Matchmaking Service API ---
export async function createMatch(
    gameMode: GameMode,
    gameFormat: GameFormat, 
    participants: GameParticipant[],
    online: boolean = false,
    invitation?: GameInvitation
): Promise<{game_id: number}> {
    try {
        const body: any = {
            format: gameFormat,
            mode: gameMode,
            participants: participants,
            online: online
        };

        // Only include invitation if provided
        if (invitation) {
            body.invitation = invitation;
        }

        const response = await fetch(`${API_GAME_ENDPOINT}/create`, {
            method: 'POST',
            credentials: 'include',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(body)
        });

        if (!response.ok) {
            const errorData = await response.json().catch(() => ({}));
            throw new Error(errorData.error || `Matchmaking failed: ${response.status}`);
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

export async function checkGameAccess(gameId: number): Promise<boolean> {
    try {
        const response = await fetch(`${API_GAME_ENDPOINT}/${gameId}/access-status`, {
            method: 'GET',
            credentials: 'include'
        });
        return response.status === 204;
    } catch (error) {
        console.error('Failed to check game access:', error);
        return false;
    }
}