import { readServerEnvSubset } from "@/server/config/env";
import { createDb } from "./client";

export function createRuntimeDb(databaseUrl = readServerEnvSubset(["DATABASE_URL"] as const).DATABASE_URL) {
  return createDb(databaseUrl);
}
