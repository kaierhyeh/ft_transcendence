import { CONFIG } from "../config";
import { GameFormat, GameMode, PlayerType } from "../schemas";
import { InternalAuthClient } from "./InternalAuthClient";

interface ErrorResponse {
  message?: string;
  error?: string;
  validation?: any[];
}

type Team = "left" | "right";
type PlayerSlots = "left" | "right" | "top-left" | "bottom-left" | "top-right" | "bottom-right";

export interface Player {
  player_id: number;
  team: Team;
  slot: PlayerSlots;
  user_id?: number;
  username?: string;
  type: PlayerType;
}

export interface GameCreationData {
  format: GameFormat;
  mode: GameMode;
  online: boolean;
  tournament_id?: number;
  players: Player[];
};


export class GameClient {
  private base_url = CONFIG.GAME_SERVICE.BASE_URL;
  private internalAuthClient = new InternalAuthClient();

  async createGame(data: GameCreationData): Promise<number> {
    try {
      const internalAuthHeaders = await this.internalAuthClient.getAuthHeaders();
      
      const response = await fetch(`${this.base_url}/game/create`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...internalAuthHeaders,
        },
        body: JSON.stringify({
          mode: data.mode,
          format: data.format,
          online: data.online,
          tournament_id: data.tournament_id,
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
}