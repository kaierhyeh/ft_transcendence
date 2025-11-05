import { CONFIG } from "../config";

interface ErrorResponse {
  message?: string;
  error?: string;
  validation?: any[];
}

export class UsersClient {
  private base_url = CONFIG.USERS_SERVICE.BASE_URL;

  async getUserName(user_id: number): Promise<{ username: string }> {

    const response = await fetch(`${this.base_url}/users/${user_id}/profile`);

    if (!response.ok) {
      const errorBody = await response.json() as ErrorResponse;
      const message = errorBody.message || errorBody.error || 'Failed to get user profile';
      
      // Map specific status codes to appropriate error codes
      throw new Error(message);
    }

    return await response.json() as { username: string };

  }
}