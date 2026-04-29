import { AuthorizationError } from "./permissions";

type OwnedRecord = {
  userId: string;
};

type NullableRecord<T> = T | null | undefined;

export function assertOwnsRecord<T extends OwnedRecord>(
  userId: string,
  record: NullableRecord<T>,
  label = "record"
): T {
  if (!record) {
    throw new AuthorizationError(`${label} not found`);
  }

  if (record.userId !== userId) {
    throw new AuthorizationError(`Cannot access ${label}`);
  }

  return record;
}

export function canAccessAccountMap(
  userId: string,
  account: NullableRecord<{ ownerUserId: string | null }>,
  isAdminUser = false
): boolean {
  if (!account) return false;
  if (isAdminUser) return true;
  return account.ownerUserId === userId;
}
