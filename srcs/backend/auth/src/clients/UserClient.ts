import { CONFIG } from "../config";
import authUtils from "../utils/auth.utils";

interface ErrorResponse {
  message?: string;
  error?: string;
  validation?: any[];
}

export interface UserData {
  user_id: number;
  username: string;
  password_hash: string;
  avatar_url: string | null;
  google_sub: string | null;
  two_fa_enabled: boolean;
}

export type UserProfile = Omit<UserData, "google_sub">;


export interface LocalUserCreationData {
  username: string;
  email: string;
  password_hash: string;
}

export class UserClient {
  private base_url = CONFIG.CLIENTS.USER.BASE_URL;

  private getAuthHeaders(): { Authorization: string } {
    const token = authUtils.generateInternalJWT();
    return { Authorization: `Bearer ${token}` };
  }

  async register(data: LocalUserCreationData): Promise<{ user_id: number }> {
    const authHeaders = this.getAuthHeaders();
    
    const response = await fetch(`${this.base_url}/users/local`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...authHeaders,
      },
      body: JSON.stringify(data)
    });

    if (!response.ok) {
      const errorBody = await response.json() as ErrorResponse;
      const errorMessage = errorBody.message || errorBody.error || `User registration failed: ${response.status}`;
      
      const error = new Error(errorMessage);
      (error as any).status = response.status;
      (error as any).details = errorBody;
      throw error;

    }

    return await response.json() as { user_id: number };
  }

  async getUserByLogin(
    login: string
  ): Promise< UserData > {
      const authHeaders = this.getAuthHeaders();

      const response = await fetch(`${this.base_url}/users/login/${login}`, {
        headers: authHeaders
      });

      if (!response.ok) {
        const errorBody = await response.json() as ErrorResponse;
        const errorMessage = errorBody.message || errorBody.error || `User login failed: ${response.status}`;
        
        const error = new Error(errorMessage);
        (error as any).status = response.status;
        (error as any).details = errorBody;
        throw error;
      }

      return await response.json() as UserData;
  }

  async getUserProfile(
    user_id: number
  ): Promise<UserProfile> {
    // This route is public, no auth needed
    const response = await fetch(`${this.base_url}/users/profile/id/${user_id}`);

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

    return await response.json() as UserProfile;
  }



}