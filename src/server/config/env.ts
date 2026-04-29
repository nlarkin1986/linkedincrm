const serverOnlyKeys = [
  "DATABASE_URL",
  "NEXT_PUBLIC_SUPABASE_URL",
  "NEXT_PUBLIC_SUPABASE_ANON_KEY",
  "SUPABASE_SERVICE_ROLE_KEY",
  "APP_BASE_URL",
  "UNIPILE_DSN",
  "UNIPILE_API_KEY",
  "UNIPILE_WEBHOOK_SECRET",
  "INNGEST_EVENT_KEY",
  "INNGEST_SIGNING_KEY",
  "AI_API_KEY"
] as const;

export type ServerEnv = Record<(typeof serverOnlyKeys)[number], string>;
type EnvSource = Record<string, string | undefined>;

export function readServerEnv(source: EnvSource = process.env): ServerEnv {
  const missing = serverOnlyKeys.filter((key) => !source[key]);

  if (missing.length > 0) {
    throw new Error(`Missing required environment variables: ${missing.join(", ")}`);
  }

  return Object.fromEntries(serverOnlyKeys.map((key) => [key, source[key] as string])) as ServerEnv;
}

export function readOptionalServerEnv(source: EnvSource = process.env): Partial<ServerEnv> {
  return Object.fromEntries(
    serverOnlyKeys.flatMap((key) => (source[key] ? [[key, source[key] as string]] : []))
  ) as Partial<ServerEnv>;
}
