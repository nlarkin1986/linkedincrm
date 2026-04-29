import { readServerEnv } from "@/server/config/env";
import { createDb } from "./client";

export function createRuntimeDb() {
  const env = readServerEnv();
  return createDb(env.DATABASE_URL);
}
