import { Inngest } from "inngest";

export type InngestQueueEvent = {
  id?: string;
  name: string;
  data: Record<string, unknown>;
};

export const inngest = new Inngest({
  id: "gladly-linkedin-crm",
  name: "Gladly LinkedIn CRM"
});
