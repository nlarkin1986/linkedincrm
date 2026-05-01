import type { PaginatedUnipileResponse } from "./types";

export type RequiredUnipileWebhookKey = "messaging" | "account-status" | "users";

export type RequiredUnipileWebhookRegistration = {
  key: RequiredUnipileWebhookKey;
  callbackUrl: string;
  expectedHeaderName: "Unipile-Auth";
  acceptedEventNames: readonly string[];
};

export type UnipileWebhookRegistrationAudit = {
  key: RequiredUnipileWebhookKey;
  status: "configured" | "missing" | "wrong-url" | "missing-auth-header";
  callbackUrl: string;
  expectedHeaderName: "Unipile-Auth";
  configuredWebhookId: string | null;
  configuredCallbackUrl: string | null;
  configuredEventNames: string[];
};

export type UnipileWebhookRegistrationClient = {
  listWebhooks(): Promise<PaginatedUnipileResponse<unknown>>;
};

export function expectedUnipileWebhookRegistrations(appBaseUrl: string): RequiredUnipileWebhookRegistration[] {
  const origin = appBaseUrl.replace(/\/+$/, "");

  return [
    {
      key: "messaging",
      callbackUrl: `${origin}/api/webhooks/unipile/messaging`,
      expectedHeaderName: "Unipile-Auth",
      acceptedEventNames: ["message", "messages", "messaging", "new_message", "new-message"]
    },
    {
      key: "account-status",
      callbackUrl: `${origin}/api/webhooks/unipile/account-status`,
      expectedHeaderName: "Unipile-Auth",
      acceptedEventNames: ["account_status", "account-status", "account_lifecycle", "account"]
    },
    {
      key: "users",
      callbackUrl: `${origin}/api/webhooks/unipile/users`,
      expectedHeaderName: "Unipile-Auth",
      acceptedEventNames: ["user", "users", "new_relation", "new-relation", "relation"]
    }
  ];
}

export async function verifyUnipileWebhookRegistrations(input: {
  appBaseUrl: string;
  client: UnipileWebhookRegistrationClient;
}): Promise<UnipileWebhookRegistrationAudit[]> {
  const response = await input.client.listWebhooks();
  const items = response.items;

  return expectedUnipileWebhookRegistrations(input.appBaseUrl).map((required) => {
    const callbackMatch = items.find((item) => webhookCallbackUrl(item) === required.callbackUrl);
    const eventMatch = items.find((item) => webhookEventNames(item).some((eventName) => required.acceptedEventNames.includes(eventName)));
    const configured = callbackMatch ?? eventMatch ?? null;

    if (!configured) {
      return auditResult(required, null, "missing");
    }

    if (webhookCallbackUrl(configured) !== required.callbackUrl) {
      return auditResult(required, configured, "wrong-url");
    }

    if (!webhookHasHeader(configured, required.expectedHeaderName)) {
      return auditResult(required, configured, "missing-auth-header");
    }

    return auditResult(required, configured, "configured");
  });
}

function auditResult(
  required: RequiredUnipileWebhookRegistration,
  configured: unknown,
  status: UnipileWebhookRegistrationAudit["status"]
): UnipileWebhookRegistrationAudit {
  return {
    key: required.key,
    status,
    callbackUrl: required.callbackUrl,
    expectedHeaderName: required.expectedHeaderName,
    configuredWebhookId: configured ? stringValue(recordValue(configured), "id") : null,
    configuredCallbackUrl: configured ? webhookCallbackUrl(configured) : null,
    configuredEventNames: configured ? webhookEventNames(configured) : []
  };
}

function webhookCallbackUrl(input: unknown) {
  const webhook = recordValue(input);
  return (
    stringValue(webhook, "request_url") ??
    stringValue(webhook, "callback_url") ??
    stringValue(webhook, "webhook_url") ??
    stringValue(webhook, "url")
  );
}

function webhookEventNames(input: unknown) {
  const webhook = recordValue(input);
  const values = [
    stringValue(webhook, "event"),
    stringValue(webhook, "event_type"),
    stringValue(webhook, "type"),
    stringValue(webhook, "source"),
    stringValue(webhook, "name"),
    ...arrayStrings(webhook.events),
    ...arrayStrings(webhook.sources)
  ];

  return values
    .filter((value): value is string => Boolean(value))
    .map((value) => value.toLowerCase().trim());
}

function webhookHasHeader(input: unknown, headerName: string) {
  const webhook = recordValue(input);
  const headers = webhook.headers;
  const normalizedHeaderName = headerName.toLowerCase();

  if (Array.isArray(headers)) {
    return headers.some((header) => {
      const record = recordValue(header);
      return (stringValue(record, "key") ?? stringValue(record, "name"))?.toLowerCase() === normalizedHeaderName;
    });
  }

  if (headers && typeof headers === "object") {
    return Object.keys(headers).some((key) => key.toLowerCase() === normalizedHeaderName);
  }

  return false;
}

function recordValue(input: unknown): Record<string, unknown> {
  return input && typeof input === "object" && !Array.isArray(input) ? input as Record<string, unknown> : {};
}

function stringValue(input: Record<string, unknown>, key: string) {
  const value = input[key];
  return typeof value === "string" && value.trim() ? value.trim() : null;
}

function arrayStrings(input: unknown) {
  return Array.isArray(input) ? input.filter((value): value is string => typeof value === "string" && Boolean(value.trim())) : [];
}
