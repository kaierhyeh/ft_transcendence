import { CONFIG } from "../config";

export class AuthClient {
  private baseUrl = CONFIG.AUTH_SERVICE.BASE_URL;

  async hashPassword(password: string): Promise<string> {
    // const response = await fetch(`${this.baseUrl}/auth/pswd/hash`, {
    //   method: "POST",
    //   headers: {
    //     "Content-Type": "application/json",
    //   },
    //   body: JSON.stringify({ password })
    // });

    // if (!response.ok) {
    //   throw new Error(`Password hashing failed: ${response.status}`);
    // }

    // const { password_hash } = await response.json() as { password_hash: string };
    // return password_hash;
    return password + "_hash";
  }

  async verifyPassword(password: string, hash: string): Promise<boolean> {
    const response = await fetch(`${this.baseUrl}/auth/pswd/verify`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ password, hash })
    });

    if (!response.ok) {
      throw new Error(`Password verification failed: ${response.status}`);
    }

    const { valid } = await response.json() as { valid: boolean };
    return valid;
  }
}