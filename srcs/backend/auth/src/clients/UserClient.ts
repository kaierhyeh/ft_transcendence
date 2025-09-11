import { CONFIG } from "../config";
import { LoginData } from "../schemas";
import { LocalUserCreationData } from "../services/AuthService";

interface ErrorResponse {
  message?: string;
  error?: string;
  validation?: any[];
}

export interface User {
  id: number;
  username: string;
  password_hash: string;
}

export class UserClient {
  private base_url = CONFIG.USER_SERVICE.BASE_URL;

  async signup(data: LocalUserCreationData): Promise<{ user_id: number }> {
    const response = await fetch(`${this.base_url}/users`, {
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

  async getUserByEmail(
    email: string
  ): Promise< User > {

      const response = await fetch(`${this.base_url}/users/email/${email}`);

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