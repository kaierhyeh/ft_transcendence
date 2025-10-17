import { CONFIG } from "../config";
import { GameFormat, GameMode, PlayerType } from "../schemas";
import { InternalAuthClient } from "./InternalAuthClient";
import { AppError, ErrorCode } from "../errors";

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
        const message = errorBody.message || errorBody.error || 'Game creation failed';
        
        throw new AppError(
          message,
          response.status,
          ErrorCode.GAME_SERVICE_ERROR
        );
      }

      const result = await response.json() as { game_id: number };
      return result.game_id;
      
    } catch (error) {
      if (error instanceof AppError) {
        throw error;
      }
      
      throw new AppError(
        'Failed to connect to game service',
        503,
        ErrorCode.SERVICE_UNAVAILABLE
      );
    }
  }
}