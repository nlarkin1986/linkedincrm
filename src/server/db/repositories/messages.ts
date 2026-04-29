import type { MessageDirection } from "../schema";

export type LinkedInMessageRecord = {
  id: string;
  userId: string;
  linkedinAccountId: string;
  linkedinChatId: string;
  personId: string | null;
  unipileMessageId: string;
  direction: MessageDirection;
  body: string | null;
  sentAt: Date;
};
