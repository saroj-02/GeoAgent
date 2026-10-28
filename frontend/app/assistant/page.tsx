"use client";

import {
  FormEvent,
  useEffect,
  useRef,
  useState,
} from "react";

import { Panel } from "@/components/ui/Panel";
import { Button } from "@/components/ui/Button";
import {
  apiClient,
  DeviceContext,
} from "@/lib/api";
import { getToken } from "@/lib/auth";

import type { AgentStatus } from "@/types";

interface Message {
  id: string;
  role: "user" | "assistant";
  content: string;
  mode?: string;
}

type AssistantContext = Record<string, unknown> & {
  device_name?: string;
  latitude?: number;
  longitude?: number;
  accuracy?: number;
  speed?: number;
  device_status?: string;
  device_id?: string;
};

const INITIAL_MESSAGE: Message = {
  id: "welcome",
  role: "assistant",
  content:
    "Hello! I'm GeoAgent. Ask me about your devices, locations, geographic data, or satellite imagery.",
};

function getUserName(): string {
  if (typeof window === "undefined") {
    return "You";
  }

  const token = getToken();

  if (!token) {
    return "You";
  }

  try {
    const tokenParts = token.split(".");

    if (tokenParts.length < 2) {
      return "You";
    }

    const base64Payload = tokenParts[1]
      .replace(/-/g, "+")
      .replace(/_/g, "/");

    const payload = JSON.parse(
      window.atob(base64Payload)
    );

    return (
      payload.username ||
      payload.name ||
      "You"
    );
  } catch {
    return "You";
  }
}

export default function AssistantPage() {
  const [messages, setMessages] = useState<Message[]>([
    INITIAL_MESSAGE,
  ]);

  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const [status, setStatus] =
    useState<AgentStatus | null>(null);

  const [userName, setUserName] =
    useState("You");

  /*
   * Phase 2.5:
   * Real selected-device context will be connected here.
   *
   * For now this stays empty so GeoAgent never
   * invents device/location information.
   */
  const [context, setContext] =
    useState<DeviceContext>({});

  const [contextLoading, setContextLoading] =
    useState(true);

  const messagesEndRef =
    useRef<HTMLDivElement | null>(null);

  /*
   * Authentication + initial data
   */
  useEffect(() => {
    if (!getToken()) {
      window.location.href = "/login";
      return;
    }

    setUserName(getUserName());

    loadStatus();
    loadDeviceContext();
  }, []);

  /*
   * Auto-scroll to newest message
   */
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({
      behavior: "smooth",
    });
  }, [messages, loading]);

  /*
   * Load AI status
   */
  async function loadStatus() {
    try {
      const result =
        await apiClient.getAgentStatus();

      setStatus(result);
    } catch {
      setStatus(null);
    }
  }

  /*
   * Load selected device context
   */
  async function loadDeviceContext() {
    try {
      setContextLoading(true);

      const deviceContext =
        await apiClient.getSelectedDeviceContext();

      setContext(deviceContext);
    } catch {
      setContext({});
    } finally {
      setContextLoading(false);
    }
  }

  /*
   * Send message to GeoAgent
   */
  async function sendMessage(
    e?: FormEvent
  ) {
    e?.preventDefault();

    const trimmedQuery =
      query.trim();

    if (
      !trimmedQuery ||
      loading
    ) {
      return;
    }

    const userMessage: Message = {
      id: `${Date.now()}-user`,
      role: "user",
      content: trimmedQuery,
    };

    setMessages((current) => [
      ...current,
      userMessage,
    ]);

    setQuery("");
    setError("");
    setLoading(true);

    try {
      const latestContext =

  await apiClient.getSelectedDeviceContext();

setContext(latestContext);

const result =

  await apiClient.queryAgent(

    trimmedQuery,

    latestContext

  );

      const assistantMessage: Message = {
        id: `${Date.now()}-assistant`,
        role: "assistant",
        content: result.response,
        mode: result.mode,
      };

      setMessages((current) => [
        ...current,
        assistantMessage,
      ]);

      /*
       * Keep the status card synchronized
       * with the actual response mode.
       */
      setStatus((current) =>
        current
          ? {
              ...current,
              mode: result.mode,
            }
          : current
      );
    } catch (err) {
      const message =
        err instanceof Error
          ? err.message
          : "Failed to contact GeoAgent.";

      setError(message);
    } finally {
      setLoading(false);
    }
  }

  /*
   * Enter = send
   * Shift + Enter = new line
   */
  function handleKeyDown(
    e: React.KeyboardEvent<HTMLTextAreaElement>
  ) {
    if (
      e.key === "Enter" &&
      !e.shiftKey
    ) {
      e.preventDefault();

      if (
        !loading &&
        query.trim()
      ) {
        sendMessage();
      }
    }
  }

  /*
   * Clear chat
   */
  function clearConversation() {
    setMessages([
      INITIAL_MESSAGE,
    ]);

    setError("");
    setQuery("");
  }

  return (
    <main className="min-h-screen bg-bg text-text-primary">
      <div className="mx-auto flex min-h-screen w-full max-w-6xl flex-col px-4 py-6 sm:px-6 lg:px-8">

        {/* =====================================================
            HEADER
        ====================================================== */}

        <div className="mb-6 flex items-center justify-between gap-4">
          <div>
            <p className="text-xs font-medium uppercase tracking-[0.2em] text-text-secondary">
              GeoAgent
            </p>

            <h1 className="mt-1 text-2xl font-semibold">
              AI Assistant
            </h1>

            <p className="mt-1 text-sm text-text-secondary">
              Your geospatial intelligence workspace
            </p>
          </div>

          <Button
            type="button"
            variant="ghost"
            onClick={clearConversation}
          >
            Clear
          </Button>
        </div>

        {/* =====================================================
            STATUS
        ====================================================== */}

        <div className="mb-4 grid gap-3 sm:grid-cols-2">

          {/* AI STATUS */}

          <Panel className="flex items-center justify-between p-4">
            <div>
              <p className="text-xs uppercase tracking-wider text-text-secondary">
                AI Status
              </p>

              <p className="mt-1 text-sm font-medium">
                {status?.status === "operational"
                  ? "Operational"
                  : "Unavailable"}
              </p>
            </div>

            <span
              className={`h-2.5 w-2.5 rounded-full ${
                status?.status === "operational"
                  ? "bg-green-500"
                  : "bg-red-500"
              }`}
            />
          </Panel>

          {/* MODEL */}

          <Panel className="p-4">
            <p className="text-xs uppercase tracking-wider text-text-secondary">
              Model
            </p>

            <p className="mt-1 truncate text-sm font-medium">
              {status?.model ?? "Checking…"}
            </p>
          </Panel>
        </div>

        {/* =====================================================
            DEVICE CONTEXT
        ====================================================== */}

        <Panel className="mb-4 p-4">
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="text-xs uppercase tracking-wider text-text-secondary">
                Active AI Context
              </p>

              <p className="mt-1 text-sm font-medium">
                {context.device_name ??
                  "No device selected"}
              </p>
            </div>

            <div
              className={`h-2.5 w-2.5 rounded-full ${
                context.device_name
                  ? "bg-green-500"
                  : "bg-text-secondary"
              }`}
            />
          </div>

          {context.device_name && (
            <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4">

              <ContextValue
                label="Status"
                value={
                  context.device_status ??
                  "Unknown"
                }
              />

              <ContextValue
                label="Latitude"
                value={
                  context.latitude !== undefined
                    ? context.latitude.toFixed(6)
                    : "Unavailable"
                }
              />

              <ContextValue
                label="Longitude"
                value={
                  context.longitude !== undefined
                    ? context.longitude.toFixed(6)
                    : "Unavailable"
                }
              />

              <ContextValue
                label="Accuracy"
                value={
                  context.accuracy !== undefined
                    ? `${context.accuracy.toFixed(1)} m`
                    : "Unavailable"
                }
              />

            </div>
          )}

          {contextLoading && (
            <p className="mt-3 text-xs text-text-secondary">
              Updating device context…
            </p>
          )}

          {!contextLoading &&
            !context.device_name && (
              <p className="mt-3 text-xs text-text-secondary">
                No device data is currently available.
                GeoAgent will not invent location information.
              </p>
            )}
        </Panel>

        {/* =====================================================
            CHAT
        ====================================================== */}

        <Panel className="flex min-h-[600px] flex-1 flex-col overflow-hidden">

          {/* MESSAGE AREA */}

          <div className="flex-1 overflow-y-auto p-4 sm:p-6">
            <div className="mx-auto flex w-full max-w-4xl flex-col gap-5">

              {messages.map((message) => (
                <div
                  key={message.id}
                  className={`flex flex-col ${
                    message.role === "user"
                      ? "items-end"
                      : "items-start"
                  }`}
                >

                  {/* MESSAGE SENDER */}

                  <div
                    className={`px-1 text-[11px] font-semibold ${
                      message.role === "user"
                        ? "text-text-secondary"
                        : "text-live"
                    }`}
                  >
                    {message.role === "user"
                      ? userName
                      : "GeoAgent"}
                  </div>

                  {/* MESSAGE BUBBLE */}

                  <div
                    className={`mt-1 max-w-[85%] rounded-2xl px-4 py-3 sm:max-w-[75%] ${
                      message.role === "user"
                        ? "bg-live text-white"
                        : "border border-border bg-bg/70 text-text-primary"
                    }`}
                  >

                    {/* MESSAGE */}

                    <p className="whitespace-pre-wrap text-sm leading-6">
                      {message.content}
                    </p>

                    {/* RESPONSE MODE */}

                    {message.mode && (
                      <div className="mt-2 text-[10px] uppercase tracking-wider opacity-50">
                        {message.mode}
                      </div>
                    )}
                  </div>
                </div>
              ))}

              {/* =================================================
                  LOADING
              ================================================== */}

              {loading && (
                <div className="flex flex-col items-start">

                  <div className="px-1 text-[11px] font-semibold text-live">
                    GeoAgent
                  </div>

                  <div className="mt-1 rounded-2xl border border-border bg-bg/70 px-4 py-3">
                    <div className="flex items-center gap-2 text-sm text-text-secondary">
                      <span>
                        GeoAgent is thinking
                      </span>

                      <span className="animate-pulse">
                        •••
                      </span>
                    </div>
                  </div>
                </div>
              )}

              <div ref={messagesEndRef} />

            </div>
          </div>

          {/* =====================================================
              ERROR
          ====================================================== */}

          {error && (
            <div className="border-t border-border px-4 py-3 sm:px-6">
              <div className="mx-auto max-w-4xl rounded-lg border border-red-500/30 bg-red-500/10 p-3 text-sm text-red-400">
                {error}
              </div>
            </div>
          )}

          {/* =====================================================

    SUGGESTED QUESTIONS

====================================================== */}

{messages.length === 1 && !loading && (

  <div className="border-t border-border px-4 pt-4 sm:px-6">

    <div className="mx-auto max-w-4xl">

      <p className="mb-2 text-[10px] uppercase tracking-wider text-text-secondary">

        Suggested questions

      </p>

      <div className="flex flex-wrap gap-2">

        {[

          "Where is my device?",

          "What is my device status?",

          "How accurate is the current location?",

          "What can you help me with?",

        ].map((suggestion) => (

          <button

            key={suggestion}

            type="button"

            disabled={loading}

            onClick={() => {
  setQuery(suggestion);

  setTimeout(() => {
    const form = document.getElementById(
      "assistant-form"
    ) as HTMLFormElement | null;

    form?.requestSubmit();
  }, 0);
}}

            className="rounded-full border border-border px-3 py-1.5 text-xs text-text-secondary transition hover:border-live/50 hover:text-text-primary disabled:opacity-50"

          >

            {suggestion}

          </button>

        ))}

      </div>

    </div>

  </div>

)}

          {/* =====================================================
              INPUT
          ====================================================== */}

          <div className="border-t border-border p-4 sm:p-6">

            <form
              id="assistant-form"
              onSubmit={sendMessage}
              className="mx-auto max-w-4xl"
            >
              <div className="flex items-end gap-3 rounded-xl border border-border bg-bg/70 p-2">

                <textarea
                  value={query}
                  onChange={(e) =>
                    setQuery(e.target.value)
                  }
                  onKeyDown={handleKeyDown}
                  rows={2}
                  disabled={loading}
                  placeholder="Ask GeoAgent anything…"
                  className="min-h-[48px] flex-1 resize-none bg-transparent px-2 py-2 text-sm text-text-primary outline-none placeholder:text-text-secondary/60 disabled:opacity-60"
                />

                <Button
                  type="submit"
                  variant="ghost"
                  disabled={
                    !query.trim() ||
                    loading
                  }
                >
                  {loading ? "…" : "Send"}
                </Button>

              </div>

              <p className="mt-2 text-center text-[11px] text-text-secondary">
                Enter to send · Shift + Enter for a new line
              </p>
            </form>

          </div>
        </Panel>
      </div>
    </main>
  );
}
function ContextValue({
  label,
  value,
}: {
  label: string;
  value: string;
}) {
  return (
    <div className="rounded-lg border border-border bg-bg/40 p-3">
      <p className="text-[9px] uppercase tracking-wider text-text-secondary">
        {label}
      </p>

      <p className="mt-1 truncate text-xs text-text-primary">
        {value}
      </p>
    </div>
  );
}