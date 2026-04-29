import type { AuthIdentity } from "@/server/db/repositories/app-users";

export type ConnectUrlInput = {
  user: AuthIdentity;
  appBaseUrl: string;
  expiresOn: Date;
  reconnectAccountId?: string;
};

export type HostedAuthCallbackPayload = {
  status: "CREATION_SUCCESS" | "RECONNECTED" | "FAILED";
  account_id?: string;
  name?: string;
};

export function buildHostedAuthLinkInput(input: ConnectUrlInput) {
  const appBaseUrl = input.appBaseUrl.replace(/\/$/, "");

  return {
    type: input.reconnectAccountId ? "reconnect" as const : "create" as const,
    apiUrl: "",
    expiresOn: input.expiresOn.toISOString(),
    providers: ["LINKEDIN"] as const,
    successRedirectUrl: `${appBaseUrl}/linkedin/connected`,
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
