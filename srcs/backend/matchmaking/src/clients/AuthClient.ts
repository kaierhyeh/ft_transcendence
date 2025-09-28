import { CONFIG } from "../config";
import { PlayerType } from "../schemas";

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

  async generateJWT(claims: GameSessionClaims): Promise<{ jwt: string }> {
    const response = await fetch(`${this.base_url}/auth/game-jwt`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(claims)
    });

    if (!response.ok) {
      const errorBody = await response.json() as ErrorResponse;
      const errorMessage = errorBody.message || errorBody.error || `Password hash failed: ${response.status}`;
      
      const error = new Error(errorMessage);
      (error as any).status = response.status;
      (error as any).details = errorBody;
      throw error;

    }

    return await response.json() as { jwt: string };
  }

}