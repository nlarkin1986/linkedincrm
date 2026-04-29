import { NextResponse } from "next/server";
import { AuthenticationError, requireAuthIdentity } from "@/server/auth/session";

type SyncRequestBody = {
  mode?: "partial";
  after?: string;
  before?: string;
  linkedinProduct?: "classic" | "sales_navigator" | "recruiter";
};

export async function POST(request: Request, context: { params: Promise<{ id: string }> }) {
  try {
    requireAuthIdentity({
      user: {
        id: request.headers.get("x-auth-user-id") ?? "",
        email: request.headers.get("x-auth-email") ?? ""
      }
    });
    const { id } = await context.params;
    const body = await request.json().catch(() => ({})) as SyncRequestBody;
    const after = body.after ? parseDate(body.after, "after") : null;
    const before = body.before ? parseDate(body.before, "before") : null;

    return NextResponse.json(
      {
        job: {
          name: "syncLinkedInAccountPartial",
          linkedinAccountId: id,
          mode: body.mode ?? "partial",
          after: after?.toISOString() ?? null,
          before: before?.toISOString() ?? null,
          linkedinProduct: body.linkedinProduct ?? null
        }
      },
      { status: 202 }
    );
  } catch (error) {
    if (error instanceof AuthenticationError) {
      return NextResponse.json({ error: "Authentication required" }, { status: 401 });
    }

    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unable to queue LinkedIn sync" },
      { status: 400 }
    );
  }
}

function parseDate(value: string, label: string): Date {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    throw new Error(`Invalid ${label} timestamp`);
  }
  return date;
}
