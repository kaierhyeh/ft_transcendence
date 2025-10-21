import { CONFIG } from "../config";
import { InternalAuthClient } from "./InternalAuthClient";

interface ErrorResponse {
  message?: string;
  error?: string;
  validation?: any[];
}

type GameMode = "pvp" | "multi";
type Team = "left" | "right";
type PlayerType = "registered" | "guest" | "ai";

interface PlayerData {
    user_id: number | null,
    type: PlayerType,
    team: Team,
    score: number,
    winner: boolean
}

interface Session {
    mode: GameMode,
    created_at: string,
    started_at: string,
    ended_at: string,
    players: PlayerData[]
}

interface Pagination {
    total_records: number;
    current_page: number;
    total_pages: number;
    next_page: number | null;
    prev_page: number | null;
}

export interface SessionsPayload {
    data: Session[];
    pagination: Pagination;
}

export class GameClient {
  private base_url = CONFIG.GAME_SERVICE.BASE_URL;
  private internalAuthClient = new InternalAuthClient();

  async getMatchHistory(user_id: number, page: number, limit: number): Promise<SessionsPayload> {
    const internalAuthHeaders = await this.internalAuthClient.getAuthHeaders();

    const query_params = new URLSearchParams({
        user_id: user_id.toString(),
        page: page.toString(),
        limit: limit.toString()
    });
    
    const response = await fetch(`${this.base_url}/game/sessions?${query_params.toString()}`, {
        method: "GET", // Should be GET for retrieving match history
        headers: {
            "Content-Type": "application/json",
            ...internalAuthHeaders,
        }
    });

    if (!response.ok) {
        const errorBody = await response.json() as ErrorResponse;
        const errorMessage = errorBody.message || errorBody.error || `Match history failed: ${response.status}`;
        
        const error = new Error(errorMessage);
        (error as any).status = response.status;
        (error as any).details = errorBody;
        throw error;
    }

    return await response.json() as SessionsPayload;
  }

 
}