import { createRoot } from 'solid-js';
import { createStore } from 'solid-js/store';
import { gcsAuthService } from '../services/gcs-auth.service';

export interface UserProfile {
  email: string;
  name: string;
  picture: string;
}

export interface AuthState {
  isAuthenticated: boolean;
  user: UserProfile | null;
  accessToken: string | null;
  tokenExpiry: number | null; // Timestamp
  error: string | null;
}

function createAuthStore() {
  const [state, setState] = createStore<AuthState>({
    isAuthenticated: false,
    user: null,
    accessToken: null,
    tokenExpiry: null,
    error: null,
  });

  const init = () => {
    // Check session storage for existing token
    const storedToken = sessionStorage.getItem('gcs_access_token');
    const storedExpiry = sessionStorage.getItem('gcs_token_expiry');
    const storedUser = sessionStorage.getItem('gcs_user');

    if (storedToken && storedExpiry && storedUser) {
      const expiry = parseInt(storedExpiry, 10);
      if (Date.now() < expiry) {
        setState({
          isAuthenticated: true,
          accessToken: storedToken,
          tokenExpiry: expiry,
          user: JSON.parse(storedUser),
        });
      } else {
        logout(); // Token expired
      }
    }
  };

  const login = async () => {
    try {
      setState({ error: null });
      const response = await gcsAuthService.signIn();
      
      const expiresIn = response.expires_in; // Seconds
      const expiry = Date.now() + expiresIn * 1000;
      
      const user = await gcsAuthService.getUserProfile(response.access_token);

      setState({
        isAuthenticated: true,
        accessToken: response.access_token,
        tokenExpiry: expiry,
        user: user,
      });

      // Persist to session storage
      sessionStorage.setItem('gcs_access_token', response.access_token);
      sessionStorage.setItem('gcs_token_expiry', expiry.toString());
      sessionStorage.setItem('gcs_user', JSON.stringify(user));

    } catch (err: unknown) {
      const error = err as Error;
      setState({ error: error.message || 'Authentication failed' });
    }
  };

  const logout = () => {
    setState({
      isAuthenticated: false,
      user: null,
      accessToken: null,
      tokenExpiry: null,
      error: null,
    });
    sessionStorage.removeItem('gcs_access_token');
    sessionStorage.removeItem('gcs_token_expiry');
    sessionStorage.removeItem('gcs_user');
  };

  /**
   * Returns a valid access token, refreshing if necessary (and possible)
   */
  const getValidToken = async (): Promise<string | null> => {
    if (!state.accessToken) return null;

    // If token is expiring in < 5 minutes, refresh (by re-login mostly, as implicit flow doesn't have refresh tokens usually without backend)
    // Google Identity Services (GIS) Token Model:
    // We can request a new token silently if the user approved the app previously.
    if (state.tokenExpiry && Date.now() > state.tokenExpiry - 5 * 60 * 1000) {
        // Token expired or close to expiring
        try {
            await login(); // Triggers GIS which might auto-approve if signed in to Google
            return state.accessToken;
        } catch {
            return null;
        }
    }
    
    return state.accessToken;
  };

  return {
    state,
    init,
    login,
    logout,
    getValidToken,
  };
}

export const authStore = createRoot(createAuthStore);
