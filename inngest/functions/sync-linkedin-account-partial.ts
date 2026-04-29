import { inngest } from "@/server/jobs/client";

export const syncLinkedInAccountPartialFunction = inngest.createFunction(
  { id: "sync-linkedin-account-partial" },
  { event: "linkedin/account.sync_partial" },
  async ({ event }) => {
    return {
      status: "accepted",
      linkedinAccountId: event.data.linkedinAccountId,
      after: event.data.after,
      before: event.data.before
    };
  }
);
