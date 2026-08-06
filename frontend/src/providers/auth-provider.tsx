"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react";
import type { AuthMeResponse, LoginInput } from "@hrms/shared";
import * as authService from "@/services/auth.service";
import { getAccessToken, setAccessToken } from "@/lib/api";

interface AuthContextValue {
  user: AuthMeResponse | null;
  isAdmin: boolean;
  loading: boolean;
  login: (input: LoginInput) => Promise<void>;
  logout: () => Promise<void>;
  refreshMe: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthMeResponse | null>(null);
  const [loading, setLoading] = useState(true);

  const refreshMe = useCallback(async () => {
    try {
      const me = await authService.getMe();
      setUser(me);
    } catch {
      setUser(null);
      setAccessToken(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!getAccessToken()) {
      // eslint-disable-next-line react-hooks/set-state-in-effect -- initial mount state is derived once
      setLoading(false);
      return;
    }
    void refreshMe();
  }, [refreshMe]);

  const login = useCallback(async (input: LoginInput) => {
    const response = await authService.login(input);
    setAccessToken(response.accessToken);
    setUser({ user: response.user, employee: response.employee });
  }, []);

  const logout = useCallback(async () => {
    try {
      await authService.logout();
    } catch {
      // ignore network errors on logout
    }
    setAccessToken(null);
    setUser(null);
  }, []);

  return (
    <AuthContext.Provider
      value={{
        user,
        isAdmin: user?.user.role === "ADMIN",
        loading,
        login,
        logout,
        refreshMe,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthContextValue {
  const context = useContext(AuthContext);
  if (!context) throw new Error("useAuth must be used within AuthProvider");
  return context;
}
