import { describe, expect, it } from "vitest";
import { extractUnipileAccountMetadata, normalizeLinkedInProduct } from "@/server/unipile/account-metadata";

describe("Unipile account metadata", () => {
  it("extracts provider user identity from account info envelopes", () => {
    expect(
      extractUnipileAccountMetadata({
        account_info: {
          user_id: "rep_provider",
          linkedin_product: "sales-navigator"
        }
      })
    ).toEqual({
      accountUserProviderId: "rep_provider",
      linkedinProduct: "sales_navigator"
    });
  });

  it("extracts provider user identity from nested account status payloads", () => {
    expect(
      extractUnipileAccountMetadata({
        AccountStatus: {
          account_info: {
            user_id: "rep_provider"
          },
          linkedin_product: "recruiter"
        }
      })
    ).toEqual({
      accountUserProviderId: "rep_provider",
      linkedinProduct: "recruiter"
    });
  });

  it("normalizes only supported LinkedIn product values", () => {
    expect(normalizeLinkedInProduct("classic")).toBe("classic");
    expect(normalizeLinkedInProduct("enterprise")).toBeNull();
  });
});
