import { NextResponse } from "next/server";
import { safeRelativeRedirect } from "@/server/http/app-origin";

export async function GET(request: Request) {
  const url = new URL(request.url);
  const next = safeRelativeRedirect(url.searchParams.get("next"));

  return NextResponse.redirect(new URL(next, request.url));
}
