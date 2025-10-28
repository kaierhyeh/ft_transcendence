import { CONFIG } from "../config";
import { InternalAuthClient } from "./InternalAuthClient";

interface ErrorResponse {
  message?: string;
  error?: string;
  validation?: any[];
}

export interface User {
  user_id: number;
}

export interface FriendList {
  user_id: number;
  friends: User[];
}

class UsersClient {
  private base_url = CONFIG.USERS_SERVICE.BASE_URL;
  private internalAuthClient = new InternalAuthClient();

  async getFriends(userId: number): Promise<User[]> {
    const internalAuthHeaders = await this.internalAuthClient.getAuthHeaders();

    const response = await fetch(`${this.base_url}/friends/user/${userId}`, {
        headers: {
            ...internalAuthHeaders,
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

  async getFriendLists(userIds: number[]): Promise<FriendList[]> {
    const internalAuthHeaders = await this.internalAuthClient.getAuthHeaders();

    const response = await fetch(`${this.base_url}/friends/batch`, {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
            ...internalAuthHeaders,
        },
        body: JSON.stringify({ user_ids: userIds }),
    });

    if (!response.ok) {
        const errorBody = await response.json() as ErrorResponse;
        const errorMessage = errorBody.message || errorBody.error || `Get friend lists failed: ${response.status}`;
        
        const error = new Error(errorMessage);
        (error as any).status = response.status;
        (error as any).details = errorBody;
        throw error;
    }

    return await response.json() as FriendList[];
  }
}

export const usersClient = new UsersClient();