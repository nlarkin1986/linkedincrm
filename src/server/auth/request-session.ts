import { createClient } from "@supabase/supabase-js";
import { AuthenticationError } from "./session";
import type { AuthIdentity } from "@/server/db/repositories/app-users";

type SupabaseUserResponse = {
  data: {
    user: {
      id: string;
      email?: string;
      user_metadata?: {
        full_name?: string;
        name?: string;
      };
    } | null;
  };
  error: Error | null;
};

export type RequestAuthConfig = {
  supabaseUrl: string;
  supabaseAnonKey: string;
  getUser?: (token: string) => Promise<SupabaseUserResponse>;
};

export async function requireRequestAuthIdentity(
  request: Request,
  config: RequestAuthConfig
): Promise<AuthIdentity> {
  const token = extractBearerToken(request.headers);
  if (!token) {
    throw new AuthenticationError();
  }

  const response = config.getUser
    ? await config.getUser(token)
    : await createClient(config.supabaseUrl, config.supabaseAnonKey).auth.getUser(token);

  if (response.error || !response.data.user?.id || !response.data.user.email) {
    throw new AuthenticationError();
  }

  return {
    id: response.data.user.id,
    email: response.data.user.email,
    fullName: response.data.user.user_metadata?.full_name ?? response.data.user.user_metadata?.name ?? null
  };
}

export function extractBearerToken(headers: Headers): string | null {
  const authorization = headers.get("authorization");
  const match = authorization?.match(/^Bearer\s+(.+)$/i);
  return match?.[1]?.trim() || null;
}
