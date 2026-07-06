import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { ApiError } from "../api/http";
import { getCurrentUser } from "../api/auth";
import type { CurrentUser } from "../types/auth";

type AuthStatus = "loading" | "authenticated" | "anonymous";

type AuthContextValue = {
  status: AuthStatus;
  user: CurrentUser | null;
  refresh: () => Promise<CurrentUser | null>;
  clear: () => void;
};

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [status, setStatus] = useState<AuthStatus>("loading");
  const [user, setUser] = useState<CurrentUser | null>(null);

  const refresh = async () => {
    try {
      const currentUser = await getCurrentUser();
      setUser(currentUser);
      setStatus("authenticated");
      return currentUser;
    } catch (error) {
      if (error instanceof ApiError && error.status === 401) {
        setUser(null);
        setStatus("anonymous");
        return null;
      }
      setUser(null);
      setStatus("anonymous");
      return null;
    }
  };

  useEffect(() => {
    void refresh();
  }, []);

  const value = useMemo<AuthContextValue>(() => ({
    status,
    user,
    refresh,
    clear: () => {
      setUser(null);
      setStatus("anonymous");
    },
  }), [status, user]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth는 AuthProvider 안에서 사용해야 합니다.");
  }
  return context;
}
