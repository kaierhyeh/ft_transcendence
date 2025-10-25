import { CONFIG } from "../config";

interface ErrorResponse {
  message?: string;
  error?: string;
  validation?: any[];
}

export interface User {
  user_id: number;
}

class UsersClient {
  private base_url = CONFIG.USERS_SERVICE.BASE_URL;

  async getFriends(accessToken: string): Promise<User[]> {

    const response = await fetch(`${this.base_url}/friends`, {
        headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${accessToken}`,
        },
    });

    if (!response.ok) {
        const errorBody = await response.json() as ErrorResponse;
        const errorMessage = errorBody.message || errorBody.error || `Update stats failed: ${response.status}`;
        
        const error = new Error(errorMessage);
        (error as any).status = response.status;
        (error as any).details = errorBody;
        throw error;
    }

    return await response.json() as User[];
  }
}

export const usersClient = new UsersClient();