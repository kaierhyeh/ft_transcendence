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
  avatar_updated_at: string | null;
}

export interface LocalUserResolution {
  user_id: number;
  two_fa_enabled: boolean;
  two_fa_secret?: string | null;
}

export interface TwoFAStatus {
  enabled: boolean;
  secret?: string | null;
}


export interface LocalUserCreationData {
  username: string;
  email?: string;
  password: string;
}

export interface GoogleUserCreationData {
  google_sub: string;
  username: string;
  email?: string;
  alias?: string;
}

export class UsersClient {
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

  async getUser(
    identifier: string
  ): Promise< UserProfile > {
      const authHeaders = this.getAuthHeaders();

      const response = await fetch(`${this.base_url}/users/${identifier}`, {
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

  async getUserByGoogleSub(google_sub: string): Promise<UserProfile> {
    const authHeaders = this.getAuthHeaders();

    const response = await fetch(`${this.base_url}/users/google/${google_sub}`, {
      headers: authHeaders
    });

    if (!response.ok) {
      const errorBody = await response.json() as ErrorResponse;
      const errorMessage = errorBody.message || errorBody.error || `User not found: ${response.status}`;
      
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

    return await response.json() as UserProfile;
  }

  async registerGoogleUser(data: GoogleUserCreationData): Promise<{ user_id: number }> {
    const authHeaders = this.getAuthHeaders();
    
    const response = await fetch(`${this.base_url}/users/google`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...authHeaders,
      },
      body: JSON.stringify(data)
    });

    if (!response.ok) {
      const errorBody = await response.json() as ErrorResponse;
      const errorMessage = errorBody.message || errorBody.error || `Google user registration failed: ${response.status}`;
      
      const error = new Error(errorMessage);
      (error as any).status = response.status;
      (error as any).details = errorBody;
      throw error;
    }

    return await response.json() as { user_id: number };
  }

  // 2FA Methods
  async get2FAStatus(user_id: number): Promise<TwoFAStatus> {
    const authHeaders = this.getAuthHeaders();
    
    const response = await fetch(`${this.base_url}/users/${user_id}`, {
      headers: authHeaders
    });

    if (!response.ok) {
      const errorBody = await response.json() as ErrorResponse;
      const errorMessage = errorBody.message || errorBody.error || `Get 2FA status failed: ${response.status}`;
      
      const error = new Error(errorMessage);
      (error as any).status = response.status;
      (error as any).details = errorBody;
      throw error;
    }

    const userData = await response.json() as any;
    return {
      enabled: userData.two_fa_enabled === 1 || userData.two_fa_enabled === true,
      secret: userData.two_fa_secret
    };
  }

  async update2FASettings(user_id: number, enabled: boolean, secret?: string | null): Promise<any> {
    const authHeaders = this.getAuthHeaders();
    
    const response = await fetch(`${this.base_url}/users/${user_id}/2fa`, {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
        ...authHeaders,
      },
      body: JSON.stringify({
        enabled: enabled ? 1 : 0,
        secret: secret
      })
    });

    if (!response.ok) {
      const errorBody = await response.json() as ErrorResponse;
      const errorMessage = errorBody.message || errorBody.error || `Update 2FA settings failed: ${response.status}`;
      
      const error = new Error(errorMessage);
      (error as any).status = response.status;
      (error as any).details = errorBody;
      throw error;
    }

    const data = await response.json();
    return data;
  }
}

export default new UsersClient();