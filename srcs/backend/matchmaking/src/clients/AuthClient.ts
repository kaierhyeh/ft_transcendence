import { CONFIG } from "../config";
import { InternalAuthClient } from "./InternalAuthClient";
import { AppError, ErrorCode } from "../errors";

interface ErrorResponse {
  message?: string;
  error?: string;
  validation?: any[];
}

export interface GameSessionClaims {
  sub: string;
  game_id: number,
}

export class AuthClient {
  private base_url = CONFIG.AUTH_SERVICE.BASE_URL;
  private internalAuthClient = new InternalAuthClient();

  async generateJWT(claims: GameSessionClaims): Promise<{ token: string }> {
    const internalAuthHeaders = await this.internalAuthClient.getAuthHeaders();

    try {
      const response = await fetch(`${this.base_url}/auth/token/game`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...internalAuthHeaders,
        },
        body: JSON.stringify(claims)
      });

      if (!response.ok) {
        const errorBody = await response.json() as ErrorResponse;
        const message = errorBody.message || errorBody.error || 'Auth service failed';
        
        throw new AppError(
          message,
          response.status,
          ErrorCode.AUTH_SERVICE_ERROR
        );
      }

      return await response.json() as { token: string };
      
    } catch (error) {
      if (error instanceof AppError) {
        throw error;
      }
      
      throw new AppError(
        'Failed to connect to auth service',
        503,
        ErrorCode.SERVICE_UNAVAILABLE
      );
    }
  }
}