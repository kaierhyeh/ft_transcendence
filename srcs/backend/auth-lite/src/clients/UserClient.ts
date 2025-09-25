import { CONFIG } from "../config";
import { LocalUserCreationData } from "../services/AuthService";

export type GuestCreationData = {
  type: "guest";
  alias?: string;
};

interface ErrorResponse {
  message?: string;
  error?: string;
  validation?: any[];
}

export interface User {
  user_id: number;
  username: string;
  password_hash: string;
}

export class UserClient {
  private base_url = CONFIG.USER_SERVICE.BASE_URL;

  async signup(data: LocalUserCreationData): Promise<{ user_id: number }> {
    const response = await fetch(`${this.base_url}/users/local`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(data)
    });

    if (!response.ok) {
      const errorBody = await response.json() as ErrorResponse;
      const errorMessage = errorBody.message || errorBody.error || `User signup failed: ${response.status}`;
      
      const error = new Error(errorMessage);
      (error as any).status = response.status;
      (error as any).details = errorBody;
      throw error;

    }

    return await response.json() as { user_id: number };
  }

  async createGuest(data: GuestCreationData): Promise<{ user_id: number }> {
    const response = await fetch(`${this.base_url}/users/guest`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(data)
    });

    if (!response.ok) {
      const errorBody = await response.json() as ErrorResponse;
      const errorMessage = errorBody.message || errorBody.error || `Guest user creation failed: ${response.status}`;
      
      const error = new Error(errorMessage);
      (error as any).status = response.status;
      (error as any).details = errorBody;
      throw error;
    }

    return await response.json() as { user_id: number };
  }

  async getUserByLogin(
    login: string
  ): Promise< User > {

      const response = await fetch(`${this.base_url}/users/${login}`);

      if (!response.ok) {
        const errorBody = await response.json() as ErrorResponse;
        const errorMessage = errorBody.message || errorBody.error || `User login failed: ${response.status}`;
        
        const error = new Error(errorMessage);
        (error as any).status = response.status;
        (error as any).details = errorBody;
        throw error;
      }

      return await response.json() as User;
    }
}