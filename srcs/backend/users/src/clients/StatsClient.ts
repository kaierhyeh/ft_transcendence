import { CONFIG } from "../config";
import { InternalAuthClient } from "./InternalAuthClient";

interface ErrorResponse {
  message?: string;
  error?: string;
  validation?: any[];
}

export interface LiteStats {
  wins: number;
  losses: number;
  curr_winstreak: number;
  best_winstreak: number;
  total_points_scored: number;
}

export interface LeaderboardEntry {
  user_id: number;
  total_points_scored: number;
}

export class StatsClient {
  private base_url = CONFIG.STATS_SERVICE.BASE_URL;
  private internalAuthClient = new InternalAuthClient();

  async getLiteStats(user_id: number): Promise<LiteStats> {
    const internalAuthHeaders = await this.internalAuthClient.getAuthHeaders();


    const response = await fetch(`${this.base_url}/stats/${user_id}/lite`, {
      headers: internalAuthHeaders
    });

    if (!response.ok) {
      const errorBody = await response.json() as ErrorResponse;
      const errorMessage = errorBody.message || errorBody.error || `Get lite stats failed: ${response.status}`;
      
      const error = new Error(errorMessage);
      (error as any).status = response.status;
      (error as any).details = errorBody;
      throw error;

    }

    return await response.json() as LiteStats;
  }

  async getLeaderboard(limit: number = 10): Promise<LeaderboardEntry[]> {
    const internalAuthHeaders = await this.internalAuthClient.getAuthHeaders();

    const response = await fetch(`${this.base_url}/stats/leaderboard?limit=${limit}`, {
      headers: internalAuthHeaders
    });

    if (!response.ok) {
      const errorBody = await response.json() as ErrorResponse;
      const errorMessage = errorBody.message || errorBody.error || `Get leaderboard failed: ${response.status}`;
      
      const error = new Error(errorMessage);
      (error as any).status = response.status;
      (error as any).details = errorBody;
      throw error;
    }

    return await response.json() as LeaderboardEntry[];
  }
}