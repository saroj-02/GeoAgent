const DEFAULT_API_ORIGIN = "http://localhost:8000";

export function normalizeApiBaseUrl(
  value: string | undefined = process.env.NEXT_PUBLIC_API_URL
): string {
  const configuredUrl = value?.trim().replace(/\/+$/, "") || DEFAULT_API_ORIGIN;

  return configuredUrl.endsWith("/api/v1")
    ? configuredUrl
    : `${configuredUrl}/api/v1`;
}
