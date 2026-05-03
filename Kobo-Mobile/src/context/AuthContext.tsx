import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import {
  apiLogin,
  apiLogout,
  apiMe,
  type AuthUser,
  authStorage,
} from "../api/client";

type AuthContextValue = {
  ready: boolean;
  user: AuthUser | null;
  token: string | null;
  signIn: (email: string, password: string) => Promise<void>;
  signOut: () => Promise<void>;
  /** Reload `/auth/me` after profile or other server-side user changes */
  refreshUser: () => Promise<void>;
};

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [ready, setReady] = useState(false);
  const [user, setUser] = useState<AuthUser | null>(null);
  const [token, setToken] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        const t = await authStorage.getToken();
        if (!t) {
          return;
        }
        const u = await apiMe(t);
        if (!cancelled) {
          setToken(t);
          setUser(u);
        }
      } catch {
        if (!cancelled) {
          await authStorage.clearToken();
        }
      } finally {
        if (!cancelled) {
          setReady(true);
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const signIn = useCallback(async (email: string, password: string) => {
    const res = await apiLogin(email, password);
    await authStorage.setToken(res.token);
    setToken(res.token);
    setUser(res.user);
  }, []);

  const signOut = useCallback(async () => {
    await apiLogout(token);
    await authStorage.clearToken();
    setToken(null);
    setUser(null);
  }, [token]);

  const refreshUser = useCallback(async () => {
    const t = token;
    if (!t) {
      return;
    }
    try {
      const u = await apiMe(t);
      setUser(u);
    } catch {
      await authStorage.clearToken();
      setToken(null);
      setUser(null);
    }
  }, [token]);

  const value = useMemo(
    () => ({ ready, user, token, signIn, signOut, refreshUser }),
    [ready, user, token, signIn, signOut, refreshUser],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error("useAuth must be used within AuthProvider");
  }
  return ctx;
}
