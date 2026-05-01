import type { LinkedInProduct } from "./types";

export type UnipileAccountMetadata = {
  accountUserProviderId?: string | null;
  linkedinProduct?: LinkedInProduct | null;
};

export function extractUnipileAccountMetadata(input: unknown): UnipileAccountMetadata {
  const record = recordValue(input);
  const eventPayload =
    objectValue(record, "AccountStatus") ??
    objectValue(record, "account_status") ??
    objectValue(record, "accountStatus") ??
    objectValue(record, "event") ??
    objectValue(record, "data") ??
    record;
  const accountInfo =
    objectValue(record, "account_info") ??
    objectValue(record, "accountInfo") ??
    objectValue(eventPayload, "account_info") ??
    objectValue(eventPayload, "accountInfo") ??
    eventPayload;

  return {
    accountUserProviderId:
      stringValue(accountInfo, "user_id") ??
      stringValue(accountInfo, "account_user_id") ??
      stringValue(accountInfo, "provider_user_id") ??
      stringValue(record, "user_id") ??
      stringValue(record, "account_user_id") ??
      stringValue(record, "provider_user_id"),
    linkedinProduct: normalizeLinkedInProduct(
      stringValue(record, "linkedin_product") ??
      stringValue(record, "linkedinProduct") ??
      stringValue(eventPayload, "linkedin_product") ??
      stringValue(eventPayload, "linkedinProduct") ??
      stringValue(accountInfo, "linkedin_product") ??
      stringValue(accountInfo, "linkedinProduct")
    )
  };
}

export function normalizeLinkedInProduct(value: string | null): LinkedInProduct | null {
  if (value === "classic" || value === "sales_navigator" || value === "recruiter") return value;
  const normalized = value?.toLowerCase().replace(/[-\s]+/g, "_");
  if (normalized === "sales_navigator" || normalized === "recruiter" || normalized === "classic") return normalized;
  return null;
}

function objectValue(input: Record<string, unknown>, key: string): Record<string, unknown> | null {
  const value = input[key];
  return value && typeof value === "object" && !Array.isArray(value) ? value as Record<string, unknown> : null;
}

function recordValue(input: unknown): Record<string, unknown> {
  return input && typeof input === "object" && !Array.isArray(input) ? input as Record<string, unknown> : {};
}

function stringValue(input: Record<string, unknown>, key: string): string | null {
  const value = input[key];
  return typeof value === "string" && value.trim() ? value.trim() : null;
}
