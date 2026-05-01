import { describe, expect, it } from "vitest";
import { GET } from "../../app/api/dashboard/route";

describe("GET /api/dashboard", () => {
  it("returns 401 without bearer auth", async () => {
    const response = await GET(new Request("https://app.example.com/api/dashboard"));
    const body = await response.json();

    expect(response.status).toBe(401);
    expect(body).toEqual({ error: "Authentication required" });
  });
});
