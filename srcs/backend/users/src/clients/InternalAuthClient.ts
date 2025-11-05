import { CONFIG } from '../config';

interface TokenResponse {
  access_token: string;
  token_type: string;
  expires_in: number;
}

export class InternalAuthClient {
  private token: string | null = null;
  private tokenExpiry: number = 0;

  private async fetchToken(): Promise<void> {
    if (!CONFIG.INTERNAL_AUTH.CLIENT_ID || !CONFIG.INTERNAL_AUTH.CLIENT_SECRET) {
      throw new Error('Client credentials not configured');
    }

    const response = await fetch(`${CONFIG.AUTH_SERVICE.BASE_URL}/auth/token/internal`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        client_id: CONFIG.INTERNAL_AUTH.CLIENT_ID,
        client_secret: CONFIG.INTERNAL_AUTH.CLIENT_SECRET,
        grant_type: 'client_credentials'
      })
    });

    if (!response.ok) {
      throw new Error(`Failed to get internal token: ${response.status}`);
    }

    const data = await response.json() as TokenResponse;
    this.token = data.access_token;
    this.tokenExpiry = Date.now() + (data.expires_in * 1000) - 60000; // Refresh 1 min early
  }

  async getToken(): Promise<string> {
    if (!this.token || Date.now() >= this.tokenExpiry) {
      await this.fetchToken();
    }
    return this.token!;
  }

  async getAuthHeaders(): Promise<{ Authorization: string }> {
    const token = await this.getToken();
    return { Authorization: `Bearer ${token}` };
  }
}