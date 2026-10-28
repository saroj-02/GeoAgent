"use client";

import type { User, AuthTokens } from "@/types";

const API_URL =
  process.env.NEXT_PUBLIC_API_URL ??
  "http://localhost:8000/api/v1";

const TOKEN_KEY = "geoagent_access_token";
const REFRESH_TOKEN_KEY = "geoagent_refresh_token";

export interface AuthResult {
  user?: User;
  accessToken: string;
  refreshToken?: string;
}

export class AuthError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "AuthError";
  }
}

async function parseErrorMessage(
  res: Response
): Promise<string> {
  try {
    const data = await res.json();

    return (
      data.detail ??
      data.message ??
      data.error ??
      "Something went wrong. Please try again."
    );
  } catch {
    return "Something went wrong. Please try again.";
  }
}

export async function login(
  email: string,
  password: string
): Promise<AuthResult> {
  try {
    const res = await fetch(
      `${API_URL}/auth/login`,
      {
        method: "POST",
        headers: {
          "Content-Type":
            "application/json",
        },
        body: JSON.stringify({
          email,
          password,
        }),
      }
    );

    if (!res.ok) {
      throw new AuthError(
        await parseErrorMessage(res)
      );
    }

    const data: AuthTokens =
      await res.json();

    setToken(data.access_token);

    if (data.refresh_token) {
      setRefreshToken(
        data.refresh_token
      );
    }

    return {
      accessToken:
        data.access_token,
      refreshToken:
        data.refresh_token,
    };
  } catch (err) {
    if (err instanceof AuthError) {
      throw err;
    }

    throw new AuthError(
      err instanceof Error
        ? err.message
        : "Login failed"
    );
  }
}

export async function register(
  username: string,
  email: string,
  password: string,
  fullName?: string
): Promise<AuthResult> {
  try {
    const payload = {
      username:
        username ||
        email.split("@")[0],
      email,
      password,
      full_name:
        fullName || username,
    };

    const res = await fetch(
      `${API_URL}/auth/register`,
      {
        method: "POST",
        headers: {
          "Content-Type":
            "application/json",
        },
        body: JSON.stringify(payload),
      }
    );

    if (!res.ok) {
      throw new AuthError(
        await parseErrorMessage(res)
      );
    }

    const data = await res.json();

    return {
      user: data,
      accessToken: "",
    };
  } catch (err) {
    if (err instanceof AuthError) {
      throw err;
    }

    throw new AuthError(
      err instanceof Error
        ? err.message
        : "Registration failed"
    );
  }
}

export function setToken(
  token: string | undefined
) {
  if (
    typeof window === "undefined" ||
    !token
  ) {
    return;
  }

  localStorage.setItem(
    TOKEN_KEY,
    token
  );
}

export function getToken(): string | null {
  if (typeof window === "undefined") {
    return null;
  }

  return localStorage.getItem(
    TOKEN_KEY
  );
}

export function setRefreshToken(
  token: string | undefined
) {
  if (
    typeof window === "undefined" ||
    !token
  ) {
    return;
  }

  localStorage.setItem(
    REFRESH_TOKEN_KEY,
    token
  );
}

export function getRefreshToken(): string | null {
  if (typeof window === "undefined") {
    return null;
  }

  return localStorage.getItem(
    REFRESH_TOKEN_KEY
  );
}

export async function refreshAccessToken(): Promise<string> {
  const refreshToken =
    getRefreshToken();

  if (!refreshToken) {
    throw new AuthError(
      "No refresh token available"
    );
  }

  const res = await fetch(
    `${API_URL}/auth/refresh`,
    {
      method: "POST",
      headers: {
        "Content-Type":
          "application/json",
      },
      body: JSON.stringify({
        refresh_token:
          refreshToken,
      }),
    }
  );

  if (!res.ok) {
    logout();

    throw new AuthError(
      await parseErrorMessage(res)
    );
  }

  const data: AuthTokens =
    await res.json();

  if (!data.access_token) {
    logout();

    throw new AuthError(
      "Token refresh returned no access token"
    );
  }

  setToken(data.access_token);

  if (data.refresh_token) {
    setRefreshToken(
      data.refresh_token
    );
  }

  return data.access_token;
}

export function logout() {
  if (
    typeof window === "undefined"
  ) {
    return;
  }

  localStorage.removeItem(
    TOKEN_KEY
  );

  localStorage.removeItem(
    REFRESH_TOKEN_KEY
  );
}

export function isAuthenticated(): boolean {
  return Boolean(getToken());
}