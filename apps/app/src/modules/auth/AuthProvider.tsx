import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";

import { getSession, type PublicAuthUser } from "../../shared/api-client";
import { clearAuthToken, loadAuthToken, saveAuthToken } from "./auth-storage";

export type AuthStatus = "loading" | "authenticated" | "unauthenticated";

interface AuthContextValue {
  status: AuthStatus;
  user: PublicAuthUser | null;
  token: string | null;
  saveToken: (token: string) => void;
  clearToken: () => void;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [token, setToken] = useState<string | null>(() => loadAuthToken());
  const [user, setUser] = useState<PublicAuthUser | null>(null);
  const [status, setStatus] = useState<AuthStatus>("loading");

  useEffect(() => {
    let cancelled = false;

    if (token === null) {
      setStatus("unauthenticated");

      return () => {
        cancelled = true;
      };
    }

    setStatus("loading");

    getSession(token)
      .then((session) => {
        if (cancelled) {
          return;
        }

        setUser(session.user);
        setStatus("authenticated");
      })
      .catch(() => {
        if (cancelled) {
          return;
        }

        clearAuthToken();
        setToken(null);
        setUser(null);
        setStatus("unauthenticated");
      });

    return () => {
      cancelled = true;
    };
  }, [token]);

  const value = useMemo<AuthContextValue>(
    () => ({
      status,
      user,
      token,
      saveToken: (nextToken: string) => {
        saveAuthToken(nextToken);
        setToken(nextToken);
      },
      clearToken: () => {
        clearAuthToken();
        setToken(null);
        setUser(null);
        setStatus("unauthenticated");
      },
    }),
    [status, user, token],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const context = useContext(AuthContext);

  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }

  return context;
}
