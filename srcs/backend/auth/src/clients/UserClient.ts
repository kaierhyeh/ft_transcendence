import { CONFIG } from "../config";
import { LoginCredentials } from "../schemas/auth";
import authUtils from "../utils/auth.utils";

interface ErrorResponse {
  message?: string;
  error?: string;
  validation?: any[];
}

export interface UserProfile {
  user_id: number;
  username: string;
  avatar_url: string | null;
}

export interface LocalUserResolution {
  user_id: number;
  two_fa_enabled: boolean;
}


export interface LocalUserCreationData {
  username: string;
  email: string;
  password: string;
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
  ): Promise< UserProfile > {
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

      return await response.json() as UserProfile;
  }

  async resolveLocalUser(credentials: LoginCredentials): Promise<LocalUserResolution> {
    const authHeaders = this.getAuthHeaders();

    const response = await fetch(`${this.base_url}/users/local/resolve`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...authHeaders
      },
      body: JSON.stringify(credentials)
    });

    
    if (!response.ok) {
      const errorBody = await response.json() as ErrorResponse;
      const errorMessage = errorBody.message || errorBody.error || `Get user profile failed: ${response.status}`;
      
      const error = new Error(errorMessage);
      (error as any).status = response.status;
      (error as any).details = errorBody;
      
      if (response.status === 404) {
        (error as any).code = 'USER_NOT_FOUND';
      } else if (response.status === 401) {
        (error as any).code = 'INVALID_CREDENTIALS';
      } else if (response.status === 405) {
        (error as any).code = 'NOT_A_LOCAL_USER';
        error.message = "This account was created with Google. Please use Google Sign-In."
      } else {
        (error as any).code = 'INTERNAL_ERROR';
      }
      
      throw error;
    }
    
    return response.json() as Promise<LocalUserResolution>;
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

export default new UserClient();