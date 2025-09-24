import { CONFIG } from "../config";
import { PasswordUpdateData } from "../schemas";
import { TwoFa } from "../types";

interface ErrorResponse {
  message?: string;
  error?: string;
  validation?: any[];
}


export class AuthClient {
  private base_url = CONFIG.AUTH_LITE_SERVICE.BASE_URL;

  async updatePasswordHash(update_data: PasswordUpdateData, old_hash: string): Promise<{ password_hash: string }> {
    const response = await fetch(`${this.base_url}/auth-lite/hash-password`, {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(
        {
          old_hash,
          old_password: update_data.old,
          new_password: update_data.new
        }
      )
    });

    if (!response.ok) {
      const errorBody = await response.json() as ErrorResponse;
      const errorMessage = errorBody.message || errorBody.error || `Password hash failed: ${response.status}`;
      
      const error = new Error(errorMessage);
      (error as any).status = response.status;
      (error as any).details = errorBody;
      throw error;

    }

    return await response.json() as { password_hash: string };
  }

  async set2fa(
    two_fa_enabled: boolean
  ): Promise< TwoFa > {

      // const response = await fetch(`${this.base_url}/auth-lite/2fa`, {
      //   method: "PUT",
      //   headers: {
      //     "Content-Type": "application/json",
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