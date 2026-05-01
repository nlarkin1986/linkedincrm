import { createHmac, timingSafeEqual } from "node:crypto";
import type { AuthIdentity } from "@/server/db/repositories/app-users";

export type ConnectUrlInput = {
  user: AuthIdentity;
  appBaseUrl: string;
  expiresOn: Date;
  claimToken?: string;
  reconnectAccountId?: string;
};

export type HostedAuthCallbackPayload = {
  status: "CREATION_SUCCESS" | "RECONNECTED" | "FAILED";
  account_id?: string;
  name?: string;
};

export function buildHostedAuthLinkInput(input: ConnectUrlInput) {
  const appBaseUrl = input.appBaseUrl.replace(/\/$/, "");
  const successRedirectUrl = new URL(`${appBaseUrl}/linkedin/connected`);
  if (input.claimToken) successRedirectUrl.searchParams.set("claim_token", input.claimToken);

  return {
    type: input.reconnectAccountId ? "reconnect" as const : "create" as const,
    apiUrl: "",
    expiresOn: input.expiresOn.toISOString(),
    providers: ["LINKEDIN"] as const,
    successRedirectUrl: successRedirectUrl.toString(),
    failureRedirectUrl: `${appBaseUrl}/linkedin/error`,
    notifyUrl: `${appBaseUrl}/api/linkedin/connection-callback`,
    name: input.user.id,
    reconnectAccount: input.reconnectAccountId
  };
}

export function parseHostedAuthCallback(payload: unknown): HostedAuthCallbackPayload {
  if (!payload || typeof payload !== "object") {
    throw new Error("Invalid hosted auth callback payload");
  }

  const record = payload as Record<string, unknown>;
  const status = record.status;
  if (status !== "CREATION_SUCCESS" && status !== "RECONNECTED" && status !== "FAILED") {
    throw new Error("Hosted auth callback is missing a valid status");
  }

  if ((status === "CREATION_SUCCESS" || status === "RECONNECTED") && typeof record.account_id !== "string") {
    throw new Error("Hosted auth callback is missing account_id");
  }

  return {
    status,
    account_id: typeof record.account_id === "string" ? record.account_id : undefined,
    name: typeof record.name === "string" ? record.name : undefined
  };
}

export function createHostedAuthClaimToken(input: {
  userId: string;
  expiresOn: Date;
  secret: string;
}): string {
  const payload = base64UrlEncode(
    JSON.stringify({
      userId: input.userId,
      expiresAt: input.expiresOn.toISOString()
    })
  );
  return `${payload}.${signHostedAuthClaimPayload(payload, input.secret)}`;
}

export function verifyHostedAuthClaimToken(input: {
  token: string;
  secret: string;
  now?: Date;
}): { userId: string; expiresAt: Date } {
  const [payload, signature, extra] = input.token.split(".");
  if (!payload || !signature || extra) throw new Error("Invalid hosted auth claim token");

  const expectedSignature = signHostedAuthClaimPayload(payload, input.secret);
  if (!safeEqual(signature, expectedSignature)) throw new Error("Invalid hosted auth claim token");

  const decoded = JSON.parse(Buffer.from(payload, "base64url").toString("utf8")) as {
    userId?: unknown;
    expiresAt?: unknown;
  };
  if (typeof decoded.userId !== "string" || typeof decoded.expiresAt !== "string") {
    throw new Error("Invalid hosted auth claim token");
  }

  const expiresAt = new Date(decoded.expiresAt);
  if (Number.isNaN(expiresAt.getTime())) throw new Error("Invalid hosted auth claim token");
  if (expiresAt.getTime() <= (input.now ?? new Date()).getTime()) {
    throw new Error("Expired hosted auth claim token");
  }

  return { userId: decoded.userId, expiresAt };
}

function signHostedAuthClaimPayload(payload: string, secret: string): string {
  return createHmac("sha256", secret).update(payload).digest("base64url");
}

function base64UrlEncode(value: string): string {
  return Buffer.from(value, "utf8").toString("base64url");
}

function safeEqual(left: string, right: string): boolean {
  const leftBuffer = Buffer.from(left);
  const rightBuffer = Buffer.from(right);
  return leftBuffer.length === rightBuffer.length && timingSafeEqual(leftBuffer, rightBuffer);
}
