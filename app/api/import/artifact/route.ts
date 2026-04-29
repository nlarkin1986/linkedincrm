import { NextResponse } from "next/server";
import { prepareArtifactImport } from "@/server/import/artifact-import";

export async function POST(request: Request) {
  const body = await request.json();
  const rows = Array.isArray(body?.rows) ? body.rows : null;

  if (!rows) {
    return NextResponse.json({ error: "Expected rows array" }, { status: 400 });
  }

  const prepared = prepareArtifactImport(rows);

  return NextResponse.json({
    count: prepared.length,
    items: prepared
  });
}
