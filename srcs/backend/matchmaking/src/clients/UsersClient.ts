import { CONFIG } from "../config";

interface ErrorResponse {
  message?: string;
  error?: string;
  validation?: any[];
}


export class UsersClient {
  private base_url = CONFIG.USERS_SERVICE.BASE_URL;

  async getUserName(
    user_id: number
  ): Promise<{username: string}> {
    // This route is public, no auth needed
    const response = await fetch(`${this.base_url}/users/${user_id}/profile`);

    if (!response.ok) {
      const errorBody = await response.json() as ErrorResponse;
      const errorMessage = errorBody.message || errorBody.error || `Get user profile failed: ${response.status}`;
      
      const error = new Error(errorMessage);
      (error as any).status = response.status;
      (error as any).details = errorBody;
      
      if (response.status === 404) {
        (error as any).code = 'USER_NOT_FOUND';
      }
      
      throw error;
    }

    return await response.json() as {username: string};
  }

}