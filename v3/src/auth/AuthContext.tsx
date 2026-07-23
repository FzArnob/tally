import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import type { ReactNode } from 'react';
import {
  getMe,
  googleLogin,
  logout as apiLogout,
  setAuthToken,
  setUnauthorizedHandler,
} from '../lib/api';
import type { User } from '../types';

const TOKEN_KEY = 'tally_v3_token';

type AuthStatus = 'loading' | 'authenticated' | 'unauthenticated';

interface AuthContextValue {
  user: User | null;
  status: AuthStatus;
  /** Exchange a Google credential (ID token) for a session and sign in. */
  loginWithGoogle: (idToken: string) => Promise<void>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

function readToken(): string | null {
  try {
    return localStorage.getItem(TOKEN_KEY);
  } catch {
    return null;
  }
}

function writeToken(token: string | null): void {
  try {
    if (token) localStorage.setItem(TOKEN_KEY, token);
    else localStorage.removeItem(TOKEN_KEY);
  } catch {
    /* storage unavailable — session just won't persist across reloads */
  }
}

/** Owns the session token: persists it, attaches it to the API, and tracks the user. */
export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [status, setStatus] = useState<AuthStatus>('loading');

  // Drop all client-side session state (used on sign-out and on any 401).
  const clearSession = useCallback(() => {
    setAuthToken(null);
    writeToken(null);
    setUser(null);
    setStatus('unauthenticated');
  }, []);

  // A 401 from any request means the session is gone — fall back to the login screen.
  useEffect(() => {
    setUnauthorizedHandler(clearSession);
    return () => setUnauthorizedHandler(null);
  }, [clearSession]);

  // On first load, adopt any stored token and validate it against the server.
  useEffect(() => {
    const token = readToken();
    if (!token) {
      setStatus('unauthenticated');
      return;
    }
    setAuthToken(token);
    getMe()
      .then((res) => {
        setUser(res.user);
        setStatus('authenticated');
      })
      .catch(() => clearSession());
  }, [clearSession]);

  const loginWithGoogle = useCallback(async (idToken: string) => {
    const res = await googleLogin(idToken);
    setAuthToken(res.token);
    writeToken(res.token);
    setUser(res.user);
    setStatus('authenticated');
  }, []);

  const signOut = useCallback(async () => {
    try {
      await apiLogout(); // best-effort server-side revoke
    } catch {
      /* even if the revoke call fails, clear the client session below */
    }
    clearSession();
  }, [clearSession]);

  const value = useMemo<AuthContextValue>(
    () => ({ user, status, loginWithGoogle, signOut }),
    [user, status, loginWithGoogle, signOut],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

// eslint-disable-next-line react-refresh/only-export-components
export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within an AuthProvider');
  return ctx;
}
