/// <reference types="vite/client" />

declare global {
  interface Window {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    google: any;
  }
}

interface TokenResponse {
  access_token: string;
  expires_in: number;
  scope: string;
  token_type: string;
  error?: string;
}

const CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID || '';
const SCOPES =
  'https://www.googleapis.com/auth/devstorage.read_only https://www.googleapis.com/auth/userinfo.profile https://www.googleapis.com/auth/userinfo.email';

class GCSAuthService {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  private tokenClient: any;
  private resolveAuth: ((response: TokenResponse) => void) | null = null;
  private rejectAuth: ((error: Error) => void) | null = null;

  constructor() {
    this.loadGsiScript();
  }

  private loadGsiScript() {
    if (document.getElementById('gsi-script')) return;
    const script = document.createElement('script');
    script.src = 'https://accounts.google.com/gsi/client';
    script.id = 'gsi-script';
    script.async = true;
    script.defer = true;
    script.onload = () => this.initTokenClient();
    document.body.appendChild(script);
  }

  private initTokenClient() {
    if (!window.google) return;

    if (!CLIENT_ID) {
      console.warn('Google Client ID not found. GCS authentication will not work.');
      return;
    }

    this.tokenClient = window.google.accounts.oauth2.initTokenClient({
      client_id: CLIENT_ID,
      scope: SCOPES,
      callback: (resp: TokenResponse) => {
        if (resp.error) {
          if (this.rejectAuth) this.rejectAuth(new Error(resp.error));
        } else {
          if (this.resolveAuth) this.resolveAuth(resp);
        }
        this.resolveAuth = null;
        this.rejectAuth = null;
      },
    });
  }

  public signIn(): Promise<TokenResponse> {
    return new Promise((resolve, reject) => {
      if (!this.tokenClient) {
        // Retry init if script just loaded
        this.initTokenClient();
        if (!this.tokenClient) {
          if (!CLIENT_ID)
            return reject(new Error('Missing VITE_GOOGLE_CLIENT_ID in environment variables'));
          return reject(new Error('Google Identity Services not loaded yet'));
        }
      }

      this.resolveAuth = resolve;
      this.rejectAuth = reject;

      // Prompt the user
      this.tokenClient.requestAccessToken();
    });
  }

  public async getUserProfile(accessToken: string) {
    const response = await fetch('https://www.googleapis.com/oauth2/v1/userinfo?alt=json', {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    });

    if (!response.ok) {
      throw new Error('Failed to fetch user profile');
    }

    return response.json();
  }
}

export const gcsAuthService = new GCSAuthService();
