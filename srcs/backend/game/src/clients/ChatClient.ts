
import { CONFIG } from "../config";
import { InternalAuthClient } from "./InternalAuthClient";

interface ErrorResponse {
  message?: string;
  error?: string;
  validation?: any[];
}

export interface GameInvitationInfo {
  fromId: number;
  toId: number;
  gameId: number;
}


export class ChatClient {
  private base_url = CONFIG.CHAT_SERVICE.BASE_URL;
  private internalAuthClient = new InternalAuthClient();
  

  async notifyGameCreationToChatService(data: GameInvitationInfo) {
    const internalAuthHeaders = await this.internalAuthClient.getAuthHeaders();
    
    const response = await fetch(
      `${this.base_url}/message/gamecreated`,
        {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                ...internalAuthHeaders
            },
            body: JSON.stringify(data)
        }
    );
    
    if (!response.ok) {
        const errorBody = await response.json() as ErrorResponse;
        const message = errorBody.message || errorBody.error || 'Failed to notify chat service of game creation';
        throw new Error(message);
    }
  }

}