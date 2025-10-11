import { CONFIG } from "../config";
import { TwoFa } from "../types";
import { InternalAuthClient } from "./InternalAuthClient";

interface ErrorResponse {
  message?: string;
  error?: string;
  validation?: any[];
}


export class AuthClient {
  private base_url = CONFIG.AUTH_SERVICE.BASE_URL;
  private internalAuthClient = new InternalAuthClient();


  async set2fa(
    two_fa_enabled: boolean
  ): Promise< TwoFa > {

      // const authHeaders = await this.internalAuthClient.getAuthHeaders();
      // const response = await fetch(`${this.base_url}/auth/2fa`, {
      //   method: "PUT",
      //   headers: {
      //     "Content-Type": "application/json",
      //     ...authHeaders,
      //   },
      //   body: JSON.stringify(two_fa_enabled)
      // });

      // if (!response.ok) {
      //   const errorBody = await response.json() as ErrorResponse;
      //   const errorMessage = errorBody.message || errorBody.error || `2FA update failed: ${response.status}`;
        
      //   const error = new Error(errorMessage);
      //   (error as any).status = response.status;
      //   (error as any).details = errorBody;
      //   throw error;
      // }

      // return await response.json() as TwoFa;
      
      // Simple fake 2FA implementation for now
      // This will be replaced by your teammate's implementation
      return {
        enabled: two_fa_enabled ? 1 : 0,
        secret: two_fa_enabled ? "fake_secret_12345" : null
      };
    }
}