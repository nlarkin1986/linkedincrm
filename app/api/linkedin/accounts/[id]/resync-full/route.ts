import { NextResponse } from "next/server";
import { AuthenticationError, requireAuthIdentity } from "@/server/auth/session";

export async function POST(request: Request, context: { params: Promise<{ id: string }> }) {
  try {
    requireAuthIdentity({
      user: {
        id: request.headers.get("x-auth-user-id") ?? "",
        email: request.headers.get("x-auth-email") ?? ""
      }
    });
    const { id } = await context.params;

    return NextResponse.json(
      {
        job: {
          name: "syncLinkedInAccountInitial",
          linkedinAccountId: id,
          mode: "full"
        }
      },
      { status: 202 }
    );
  } catch (error) {
    if (error instanceof AuthenticationError) {
      return NextResponse.json({ error: "Authentication required" }, { status: 401 });
    }

    return NextResponse.json({ error: "Unable to queue full LinkedIn resync" }, { status: 400 });
  }
}
