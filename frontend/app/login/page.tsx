"use client";

import { FormEvent, Suspense, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { AuthShell } from "@/components/auth/AuthShell";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { login } from "@/lib/auth";

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const message = searchParams.get("message");

    if (message) {
      setSuccessMessage(decodeURIComponent(message));

      const timer = setTimeout(() => {
        setSuccessMessage(null);
      }, 5000);

      return () => clearTimeout(timer);
    }
  }, [searchParams]);

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();

    setError(null);
    setLoading(true);

    try {
      await login(email, password);

      router.push("/dashboard");
    } catch (err) {
      const errorMessage =
        err instanceof Error ? err.message : "Unable to sign in.";

      console.error("Login error:", errorMessage);
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  }

  return (
    <AuthShell
      title="Sign in"
      subtitle="Access your geospatial intelligence console."
    >
      {successMessage && (
        <div className="mb-4 rounded-lg border border-green-700/50 bg-green-900/20 p-3 text-sm text-green-300">
          {successMessage}
        </div>
      )}

      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        <Input
          label="Email"
          type="email"
          autoComplete="email"
          required
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="you@company.com"
        />

        <Input
          label="Password"
          type="password"
          autoComplete="current-password"
          required
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder="••••••••"
        />

        {error && (
          <div className="text-sm text-live rounded-lg border border-red-700/50 bg-red-900/20 p-3">
            <p className="font-semibold">Error:</p>
            <p>{error}</p>
            <p className="mt-2 text-xs text-red-200">
              Tip: Make sure you registered first, then try logging in.
            </p>
          </div>
        )}

        <Button
          type="submit"
          loading={loading}
          className="mt-2 w-full"
        >
          {loading ? "Signing in..." : "Sign in"}
        </Button>
      </form>

      <p className="mt-6 text-sm text-text-secondary">
        Don&apos;t have an account?{" "}
        <Link
          href="/register"
          className="font-medium text-text-primary hover:text-live"
        >
          Create one
        </Link>
      </p>

      <hr className="my-6 border-border" />

      <p className="text-center text-xs text-text-secondary">
        Having trouble?{" "}
        <Link
          href="/diagnostics"
          className="font-medium text-live hover:text-red-400"
        >
          Run diagnostics
        </Link>
      </p>
    </AuthShell>
  );
}

function LoginFallback() {
  return (
    <AuthShell
      title="Sign in"
      subtitle="Access your geospatial intelligence console."
    >
      <div className="flex items-center justify-center py-8 text-sm text-text-secondary">
        Loading sign-in...
      </div>
    </AuthShell>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={<LoginFallback />}>
      <LoginForm />
    </Suspense>
  );
}