const serverOnlyKeys = [
  "DATABASE_URL",
  "NEXT_PUBLIC_SUPABASE_URL",
  "SUPABASE_SERVICE_ROLE_KEY",
  "APP_BASE_URL",
  "UNIPILE_DSN",
  "UNIPILE_API_KEY",
  "UNIPILE_WEBHOOK_SECRET",
  "INNGEST_EVENT_KEY",
  "INNGEST_SIGNING_KEY",
  "AI_API_KEY"
] as const;

const supabasePublicKeyNames = [
  "NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY",
  "NEXT_PUBLIC_SUPABASE_ANON_KEY"
] as const;

export type ServerEnv = Record<(typeof serverOnlyKeys)[number], string> &
  Partial<Record<(typeof supabasePublicKeyNames)[number], string>>;
type ServerOnlyKey = (typeof serverOnlyKeys)[number];
type EnvSource = Record<string, string | undefined>;

export function readServerEnv(source: EnvSource = process.env): ServerEnv {
  return readServerEnvSubset(serverOnlyKeys, { requireSupabasePublicKey: true }, source) as ServerEnv;
}

export function readServerEnvSubset<const Keys extends readonly ServerOnlyKey[]>(
  keys: Keys,
  options: { requireSupabasePublicKey?: boolean } = {},
  source: EnvSource = process.env
) {
  const missing = [
    ...keys.filter((key) => !source[key]),
    ...(options.requireSupabasePublicKey && !readSupabasePublicKey(source)
      ? ["NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY or NEXT_PUBLIC_SUPABASE_ANON_KEY"]
      : [])
  ];

  if (missing.length > 0) {
    throw new Error(`Missing required environment variables: ${missing.join(", ")}`);
  }

  return Object.fromEntries(
    [...keys, ...supabasePublicKeyNames].flatMap((key) =>
      source[key] ? [[key, source[key] as string]] : []
    )
  ) as Pick<ServerEnv, Keys[number]> & Partial<Record<(typeof supabasePublicKeyNames)[number], string>>;
}

export function readOptionalServerEnv(source: EnvSource = process.env): Partial<ServerEnv> {
  return Object.fromEntries(
    [...serverOnlyKeys, ...supabasePublicKeyNames].flatMap((key) => (source[key] ? [[key, source[key] as string]] : []))
  ) as Partial<ServerEnv>;
}

export function readSupabasePublicKey(source: Pick<ServerEnv, "NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY" | "NEXT_PUBLIC_SUPABASE_ANON_KEY"> | EnvSource): string | undefined {
  return source.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ?? source.NEXT_PUBLIC_SUPABASE_ANON_KEY;
}
