import { CONFIG } from "../config";

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
  total_point_scored: number;
}

export class StatsClient {
  private base_url = CONFIG.STATS_SERVICE.BASE_URL;

  async getLiteStats(user_id: number): Promise<LiteStats> {
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

        return {
            wins: 8,
            losses: 2,
            curr_winstreak: 2,
            best_winstreak: 4,
            total_point_scored: 40
        };
    }

}