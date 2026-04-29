import type { MessageDirection } from "../schema";

export type LinkedInChatRecord = {
  id: string;
  userId: string;
  linkedinAccountId: string;
  personId: string | null;
  unipileChatId: string;
  isGroup: boolean;
  lastMessageAt: Date | null;
  lastMessageDirection: MessageDirection | null;
};
