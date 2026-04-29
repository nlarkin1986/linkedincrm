import { inngest } from "@/server/jobs/client";

export const syncLinkedInAccountInitialFunction = inngest.createFunction(
  { id: "sync-linkedin-account-initial" },
  { event: "linkedin/account.sync_initial" },
  async ({ event }) => {
    return {
      status: "accepted",
      linkedinAccountId: event.data.linkedinAccountId
    };
  }
);
