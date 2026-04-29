export class WebhookAuthError extends Error {
  constructor(message = "Invalid Unipile webhook signature") {
    super(message);
    this.name = "WebhookAuthError";
  }
}

export function verifyUnipileWebhook(headers: Headers, expectedSecret: string | undefined) {
  if (!expectedSecret) {
    throw new WebhookAuthError("Missing Unipile webhook secret");
  }

  const receivedSecret =
    headers.get("x-unipile-webhook-secret") ??
    headers.get("x-webhook-secret") ??
    headers.get("authorization")?.replace(/^Bearer\s+/i, "");

  if (receivedSecret !== expectedSecret) {
    throw new WebhookAuthError();
  }
}
