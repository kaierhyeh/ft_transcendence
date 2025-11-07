import { CONFIG } from "../config";
import { InternalAuthClient } from "./InternalAuthClient";

interface ErrorResponse {
  message?: string;
  error?: string;
  validation?: any[];
}

export interface FriendshipStatus {
    status: string | null;
    from_id: number | null;
    to_id: number | null;
}

export interface GameInvitationInfo {
  fromId: number;
  toId: number;
  gameId: number;
}


export class UsersClient {
  private base_url = CONFIG.USERS_SERVICE.BASE_URL;
  private internalAuthClient = new InternalAuthClient();
  

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

    async isBlocked(fromId: number, toId: number): Promise<boolean> {

      const internalAuthHeaders = await this.internalAuthClient.getAuthHeaders();

      const res = await fetch(
          `${this.base_url}/friends/status/${toId}/${fromId}`,
          {
              method: 'GET',
              headers: {
                  ...internalAuthHeaders
              },
          }
      );
      
      if (!res.ok) {
          throw new Error(`Failed to fetch friendship status: ${res.status} ${res.statusText}`);
      }

      const friendshipStatus = await res.json() as FriendshipStatus;
      return friendshipStatus === null ? false : friendshipStatus.status === "blocked";

  }

}