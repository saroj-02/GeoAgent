// Authentication hook for GeoAgent frontend

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { apiClient } from "@/lib/api";
import { User, AuthTokens, LoginRequest, RegisterRequest } from "@/types";

interface UseAuthReturn {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  error: string | null;
  login: (credentials: LoginRequest) => Promise<void>;
  register: (data: RegisterRequest) => Promise<void>;
  logout: () => void;
}

export function useAuth(): UseAuthReturn {
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Restore auth from localStorage on mount
  useEffect(() => {
    const token = localStorage.getItem("access_token");
    if (token) {
      apiClient.setToken(token);
      // In a real app, you'd verify the token by calling an endpoint
      // For now, we'll assume it's valid
    }
    setIsLoading(false);
  }, []);

  const login = useCallback(
    async (credentials: LoginRequest) => {
      setIsLoading(true);
      setError(null);

      try {
        const tokens = await apiClient.login(credentials);

        // Store refresh token
        localStorage.setItem("refresh_token", tokens.refresh_token);

        // Set user (you'd fetch this from an endpoint in production)
        setUser({
          id: "", // Would be fetched from API
          email: credentials.email,
          username: "",
          email_verified: false,
          is_active: true,
          created_at: new Date().toISOString(),
        });

        // Redirect to dashboard
        router.push("/dashboard");
      } catch (err) {
        setError(err instanceof Error ? err.message : "Login failed");
        throw err;
      } finally {
        setIsLoading(false);
      }
    },
    [router]
  );

  const register = useCallback(
    async (data: RegisterRequest) => {
      setIsLoading(true);
      setError(null);

      try {
        const newUser = await apiClient.register(data);
        setUser(newUser);

        // Redirect to login or dashboard
        router.push("/login");
      } catch (err) {
        setError(err instanceof Error ? err.message : "Registration failed");
        throw err;
      } finally {
        setIsLoading(false);
      }
    },
    [router]
  );

  const logout = useCallback(() => {
    apiClient.clearToken();
    setUser(null);
    localStorage.removeItem("access_token");
    localStorage.removeItem("refresh_token");
    router.push("/login");
  }, [router]);

  return {
    user,
    isAuthenticated: !!user && !!localStorage.getItem("access_token"),
    isLoading,
    error,
    login,
    register,
    logout,
  };
}
