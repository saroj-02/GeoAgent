"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

interface DiagnosticResult {
  name: string;
  status: "checking" | "success" | "error";
  message: string;
  details?: string;
}

export default function DiagnosticsPage() {
  const [results, setResults] = useState<DiagnosticResult[]>([
    { name: "API URL Configuration", status: "checking", message: "Checking..." },
    { name: "Backend Health", status: "checking", message: "Checking..." },
    { name: "Registration Endpoint", status: "checking", message: "Checking..." },
    { name: "Login Endpoint", status: "checking", message: "Checking..." },
  ]);

  useEffect(() => {
    runDiagnostics();
  }, []);

  async function runDiagnostics() {
    const apiUrl =
      process.env.NEXT_PUBLIC_API_URL ||
      "http://localhost:8000/api/v1";
    const newResults: DiagnosticResult[] = [];

    // Check 1: API URL Configuration
    newResults.push({
      name: "API URL Configuration",
      status: "success",
      message: `API URL: ${apiUrl}`,
      details: "Check that this URL matches your backend location",
    });

    // Check 2: Backend Health
    try {
      const healthResponse = await fetch(`${apiUrl.replace(/\/api\/v1\/?$/, "")}/health`, {
        method: "GET",
        headers: { "Content-Type": "application/json" },
      });

      if (healthResponse.ok) {
        const data = await healthResponse.json();
        newResults.push({
          name: "Backend Health",
          status: "success",
          message: "Backend is running and responding",
          details: `Status: ${data.status}`,
        });
      } else {
        newResults.push({
          name: "Backend Health",
          status: "error",
          message: "Backend returned error",
          details: `HTTP ${healthResponse.status}: ${healthResponse.statusText}`,
        });
      }
    } catch (err) {
      newResults.push({
        name: "Backend Health",
        status: "error",
        message: "Cannot connect to backend",
        details: err instanceof Error ? err.message : "Unknown error",
      });
    }

    // Check 3: Registration Endpoint
    try {
      const registerResponse = await fetch(`${apiUrl}/auth/register`, {
        method: "OPTIONS",
        headers: { "Content-Type": "application/json" },
      });

      if (registerResponse.ok || registerResponse.status === 405) {
        // 405 Method Not Allowed is fine for OPTIONS
        newResults.push({
          name: "Registration Endpoint",
          status: "success",
          message: "Registration endpoint is accessible",
          details: `HTTP ${registerResponse.status}`,
        });
      } else {
        newResults.push({
          name: "Registration Endpoint",
          status: "error",
          message: "Registration endpoint error",
          details: `HTTP ${registerResponse.status}: ${registerResponse.statusText}`,
        });
      }
    } catch (err) {
      newResults.push({
        name: "Registration Endpoint",
        status: "error",
        message: "Cannot reach registration endpoint",
        details: err instanceof Error ? err.message : "Unknown error",
      });
    }

    // Check 4: Login Endpoint
    try {
      const loginResponse = await fetch(`${apiUrl}/auth/login`, {
        method: "OPTIONS",
        headers: { "Content-Type": "application/json" },
      });

      if (loginResponse.ok || loginResponse.status === 405) {
        newResults.push({
          name: "Login Endpoint",
          status: "success",
          message: "Login endpoint is accessible",
          details: `HTTP ${loginResponse.status}`,
        });
      } else {
        newResults.push({
          name: "Login Endpoint",
          status: "error",
          message: "Login endpoint error",
          details: `HTTP ${loginResponse.status}: ${loginResponse.statusText}`,
        });
      }
    } catch (err) {
      newResults.push({
        name: "Login Endpoint",
        status: "error",
        message: "Cannot reach login endpoint",
        details: err instanceof Error ? err.message : "Unknown error",
      });
    }

    setResults(newResults);
  }

  const allSuccess = results.every((r) => r.status === "success");

  return (
    <div className="min-h-screen bg-background p-6">
      <div className="max-w-2xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-text-primary mb-2">
            GeoAgent Diagnostics
          </h1>
          <p className="text-text-secondary">
            Check your backend connection and API endpoints
          </p>
        </div>

        {/* Overall Status */}
        <div
          className={`mb-6 p-4 rounded-lg border ${
            allSuccess
              ? "bg-green-900/20 border-green-700/50 text-green-300"
              : results.some((r) => r.status === "error")
                ? "bg-red-900/20 border-red-700/50 text-red-300"
                : "bg-yellow-900/20 border-yellow-700/50 text-yellow-300"
          }`}
        >
          <p className="font-semibold">
            {allSuccess
              ? "✅ All systems operational"
              : results.some((r) => r.status === "error")
                ? "❌ Connection issues detected"
                : "🔄 Checking..."}
          </p>
        </div>

        {/* Results */}
        <div className="space-y-4 mb-8">
          {results.map((result) => (
            <div
              key={result.name}
              className={`p-4 rounded-lg border ${
                result.status === "success"
                  ? "bg-green-900/20 border-green-700/50"
                  : result.status === "error"
                    ? "bg-red-900/20 border-red-700/50"
                    : "bg-yellow-900/20 border-yellow-700/50"
              }`}
            >
              <div className="flex items-center gap-2 mb-2">
                <span className="text-lg">
                  {result.status === "success"
                    ? "✅"
                    : result.status === "error"
                      ? "❌"
                      : "🔄"}
                </span>
                <h3 className="font-semibold text-text-primary">
                  {result.name}
                </h3>
              </div>
              <p className="text-sm text-text-secondary">{result.message}</p>
              {result.details && (
                <p className="text-xs text-text-secondary mt-2 font-mono">
                  {result.details}
                </p>
              )}
            </div>
          ))}
        </div>

        {/* Troubleshooting Tips */}
        {!allSuccess && (
          <div className="bg-panel rounded-lg border border-border p-6 mb-8">
            <h2 className="text-lg font-semibold text-text-primary mb-4">
              Troubleshooting Tips
            </h2>
            <ul className="space-y-3 text-sm text-text-secondary">
              <li className="flex gap-3">
                <span className="text-live">1.</span>
                <span>
                  Make sure the backend is running:
                  <code className="block mt-1 bg-background px-2 py-1 rounded font-mono text-xs">
                    uvicorn app.main:app --reload
                  </code>
                </span>
              </li>
              <li className="flex gap-3">
                <span className="text-live">2.</span>
                <span>
                  Check the backend is on port 8000 (not 8001 or 3000)
                </span>
              </li>
              <li className="flex gap-3">
                <span className="text-live">3.</span>
                <span>
                  Verify environment variable in
                  <code className="bg-background px-2 py-1 rounded font-mono text-xs">
                    frontend/.env.local
                  </code>
                  :
                  <code className="block mt-1 bg-background px-2 py-1 rounded font-mono text-xs">
                    NEXT_PUBLIC_API_URL=http://localhost:8000/api/v1
                  </code>
                </span>
              </li>
              <li className="flex gap-3">
                <span className="text-live">4.</span>
                <span>
                  Check backend logs for errors in the terminal where you started it
                </span>
              </li>
              <li className="flex gap-3">
                <span className="text-live">5.</span>
                <span>
                  Verify PostgreSQL is running and DATABASE_URL is correct in
                  <code className="bg-background px-2 py-1 rounded font-mono text-xs">
                    backend/.env
                  </code>
                </span>
              </li>
            </ul>
          </div>
        )}

        {/* Action Buttons */}
        <div className="flex gap-4">
          <button
            onClick={runDiagnostics}
            className="px-6 py-2 bg-live text-white rounded-lg font-medium hover:bg-red-600 transition"
          >
            🔄 Run Again
          </button>
          <Link
            href="/register"
            className="px-6 py-2 bg-panel border border-border text-text-primary rounded-lg font-medium hover:bg-panel/80 transition"
          >
            ← Back to Register
          </Link>
        </div>

        {/* Footer */}
        {allSuccess && (
          <div className="mt-8 p-4 bg-green-900/10 border border-green-700/30 rounded-lg text-center">
            <p className="text-green-300">
              ✨ Backend is ready! You can now register and login.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
