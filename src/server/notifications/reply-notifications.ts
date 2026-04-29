export type ReplyNotification = {
  userId: string;
  relationshipId: string;
  personId: string;
  messagePreview: string | null;
  receivedAt: Date;
};

export function buildReplyNotification(input: ReplyNotification): ReplyNotification {
  return input;
}
