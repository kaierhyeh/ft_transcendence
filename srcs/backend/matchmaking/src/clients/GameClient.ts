import { CONFIG } from "../config";
import { GameMode, MatchMakingData, PlayerType } from "../schemas";

interface ErrorResponse {
  message?: string;
  error?: string;
  validation?: any[];
}

type Team = "left" | "right";
type PlayerSlots = "left" | "right" | "top-left" | "bottom-left" | "top-right" | "bottom-right";

interface Player {
  player_id: number;
  team: Team;
  slots: PlayerSlots;
  user_id?: number;
  type: PlayerType;
}

export interface GameCreationData {
  mode: GameMode;
  players: Player[];
};


export class GameClient {
  private base_url = CONFIG.GAME_SERVICE.BASE_URL;
  private cachedJWT: string | null = null;
  private jwtExpiry: number | null = null;

  async createGame(data: GameCreationData): Promise<number> {
    try {
      // Get internal JWT from auth service
      const internalJWT = await this.getInternalJWT();
      
      const response = await fetch(`${this.base_url}/game/create`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${internalJWT}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          mode: data.mode,
          participants: data.players  // Adjust field name to match game service
        })
      });

      if (!response.ok) {
        const errorBody = await response.json() as ErrorResponse;
        const errorMessage = errorBody.message || errorBody.error || `Game creation failed: ${response.status}`;
        
        const error = new Error(errorMessage);
        (error as any).status = response.status;
        (error as any).details = errorBody;
        throw error;
      }

      const result = await response.json() as { game_id: number };
      return result.game_id;
      
    } catch (error) {
      console.error('Failed to create game:', error);
      throw error;
    }
  }

  private async getInternalJWT(): Promise<string> {
    // Check if we have a valid cached JWT (with 5-minute buffer before expiry)
    const now = Date.now();
    const bufferTime = 5 * 60 * 1000; // 5 minutes in milliseconds
    
    if (this.cachedJWT && this.jwtExpiry && (this.jwtExpiry - bufferTime) > now) {
      return this.cachedJWT;
    }

    // Call auth service to get internal JWT
    const response = await fetch(`${CONFIG.AUTH_SERVICE.BASE_URL}/auth/internal/token`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      }
      // No body needed - auth service just issues a generic internal token
    });

    if (!response.ok) {
      throw new Error(`Failed to get internal JWT: ${response.status}`);
    }

    const result = await response.json() as { token: string; expires_in: string };
    
    // Cache the JWT and calculate expiry time
    this.cachedJWT = result.token;
    
    // Parse expires_in (could be "1h", "3600s", etc.)
    const expiresInMs = this.parseExpiresIn(result.expires_in);
    this.jwtExpiry = now + expiresInMs;
    
    return result.token;
  }

  private parseExpiresIn(expiresIn: string): number {
    // Handle common formats: "1h", "3600s", "60m", or plain seconds
    const match = expiresIn.match(/^(\d+)([hms]?)$/);
    if (!match) {
      // Fallback: assume it's seconds
      return parseInt(expiresIn) * 1000;
    }

    const value = parseInt(match[1]);
    const unit = match[2];

    switch (unit) {
      case 'h': return value * 60 * 60 * 1000; // hours to milliseconds
      case 'm': return value * 60 * 1000;      // minutes to milliseconds  
      case 's': return value * 1000;           // seconds to milliseconds
      default: return value * 1000;            // assume seconds if no unit
    }
  }

}