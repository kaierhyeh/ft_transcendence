import { CONFIG } from "../config";
import { InternalAuthClient } from "./InternalAuthClient";

interface ErrorResponse {
  message?: string;
  error?: string;
  validation?: any[];
}

export interface UpdateStatsRequest {
  user_id: number;
  won: boolean;
  points_scored: number;
}

export class StatsClient {
  private base_url = CONFIG.STATS_SERVICE.BASE_URL;
  private internalAuthClient = new InternalAuthClient();

  async updateStats(update: UpdateStatsRequest): Promise<void> {
    const internalAuthHeaders = await this.internalAuthClient.getAuthHeaders();

    const response = await fetch(`${this.base_url}/stats/update`, {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
            ...internalAuthHeaders,
        },
        body: JSON.stringify(update)
    });

    if (!response.ok) {
        const errorBody = await response.json() as ErrorResponse;
        const errorMessage = errorBody.message || errorBody.error || `Update stats failed: ${response.status}`;
        
        const error = new Error(errorMessage);
        (error as any).status = response.status;
        (error as any).details = errorBody;
        throw error;
    }
  }
}
