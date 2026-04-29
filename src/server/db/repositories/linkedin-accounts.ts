export type LinkedInAccountRecord = {
  id: string;
  userId: string;
  unipileAccountId: string;
  status: string;
  reconnectRequired: boolean;
};

export function isHealthyLinkedInAccount(account: Pick<LinkedInAccountRecord, "status" | "reconnectRequired">) {
  return account.status === "OK" && !account.reconnectRequired;
}
