import { CONFIG } from "../config";
import { AppError, ErrorCode } from "../errors";

interface ErrorResponse {
  message?: string;
  error?: string;
  validation?: any[];
}

export class UsersClient {
  private base_url = CONFIG.USERS_SERVICE.BASE_URL;

  async getUserName(user_id: number): Promise<{ username: string }> {
    try {
      // This route is public, no auth needed
      const response = await fetch(`${this.base_url}/users/${user_id}/profile`);

      if (!response.ok) {
        const errorBody = await response.json() as ErrorResponse;
        const message = errorBody.message || errorBody.error || 'Failed to get user profile';
        
        // Map specific status codes to appropriate error codes
        const errorCode = response.status === 404 
          ? ErrorCode.USER_NOT_FOUND 
          : ErrorCode.USERS_SERVICE_ERROR;
        
        throw new AppError(
          message,
          response.status,
          errorCode
        );
      }

      return await response.json() as { username: string };
      
    } catch (error) {
      if (error instanceof AppError) {
        throw error;
      }
      
      throw new AppError(
        'Failed to connect to users service',
        503,
        ErrorCode.SERVICE_UNAVAILABLE
      );
    }
  }
}