import { NextResponse } from "next/server";
import { parseHostedAuthCallback } from "@/server/unipile/connection";

export async function POST(request: Request) {
  try {
    const payload = parseHostedAuthCallback(await request.json());

    return NextResponse.json({
      status: payload.status,
      unipileAccountId: payload.account_id,
      userId: payload.name
    });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Invalid connection callback" },
      { status: 400 }
    );
  }
}
