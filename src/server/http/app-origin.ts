export function getConfiguredAppBaseUrl(configuredBaseUrl: string, requestUrl: string): string {
  const baseUrl = configuredBaseUrl.trim() || new URL(requestUrl).origin;
  const parsed = new URL(baseUrl);

  if (parsed.protocol !== "https:" && parsed.hostname !== "localhost") {
    throw new Error("APP_BASE_URL must use https outside localhost");
  }

  return parsed.origin;
}

export function safeRelativeRedirect(value: string | null): string {
  if (!value) return "/";
  if (!value.startsWith("/") || value.startsWith("//")) return "/";

  try {
    const parsed = new URL(value, "https://app.example.com");
    return `${parsed.pathname}${parsed.search}${parsed.hash}`;
  } catch {
    return "/";
  }
}
