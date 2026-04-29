export type UnipileErrorCategory =
  | "reconnect_required"
  | "account_restricted"
  | "permission_denied"
  | "retryable"
  | "validation"
  | "unknown";

export class UnipileApiError extends Error {
  constructor(
    readonly status: number,
    readonly responseBody: string,
    readonly category: UnipileErrorCategory = categorizeUnipileError(status, responseBody)
  ) {
    super(`Unipile API error ${status}: ${responseBody}`);
    this.name = "UnipileApiError";
  }
}

export function categorizeUnipileError(status: number, body: string): UnipileErrorCategory {
  if (body.includes("expired_credentials") || body.includes("missing_credentials") || body.includes("disconnected_account")) {
    return "reconnect_required";
  }

  if (body.includes("account_restricted")) return "account_restricted";
  if (body.includes("insufficient_permissions") || body.includes("insufficient_privileges")) return "permission_denied";
  if ([429, 500, 503, 504].includes(status) || body.includes("provider_error") || body.includes("request_timeout")) {
    return "retryable";
  }
  if (status >= 400 && status < 500) return "validation";
  return "unknown";
}

export function isRetryableUnipileError(error: unknown): boolean {
  return error instanceof UnipileApiError && error.category === "retryable";
}
