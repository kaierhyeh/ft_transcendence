import { CONFIG } from "../config";
import { GameType, MatchMakingData, PlayerType } from "../schemas";

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
  type: GameType;
  players: Player[];
};


export class GameClient {
  private base_url = CONFIG.GAME_SERVICE.BASE_URL;

  async createGame(data: GameCreationData): Promise<number> {
//     const response = await fetch(`${this.base_url}/stats/${user_id}/lite`);

//     if (!response.ok) {
//       const errorBody = await response.json() as ErrorResponse;
//       const errorMessage = errorBody.message || errorBody.error || `Password hash failed: ${response.status}`;
      
//       const error = new Error(errorMessage);
//       (error as any).status = response.status;
//       (error as any).details = errorBody;
//       throw error;

//     }

//     return await response.json() as LiteStats;

        return 0;
    }

}