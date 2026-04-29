export type RawUnipileAttendee = Record<string, unknown>;

export type NormalizedUnipileAttendee = {
  unipileAttendeeId: string | null;
  providerId: string | null;
  publicIdentifier: string | null;
  profileUrl: string | null;
  fullName: string;
  title: string | null;
  companyName: string | null;
  location: string | null;
  profilePictureUrl: string | null;
  raw: RawUnipileAttendee;
};

export function normalizeUnipileAttendee(raw: RawUnipileAttendee): NormalizedUnipileAttendee {
  const profile = objectValue(raw, "profile") ?? objectValue(raw, "user") ?? raw;
  const firstName = stringValue(profile, "first_name") ?? stringValue(profile, "firstName");
  const lastName = stringValue(profile, "last_name") ?? stringValue(profile, "lastName");
  const composedName = [firstName, lastName].filter(Boolean).join(" ").trim();
  const fullName = (
    stringValue(profile, "full_name") ??
    stringValue(profile, "name") ??
    stringValue(raw, "name") ??
    composedName
  ) || "Unknown LinkedIn person";

  return {
    unipileAttendeeId: stringValue(raw, "id") ?? stringValue(raw, "attendee_id"),
    providerId:
      stringValue(raw, "attendee_provider_id") ??
      stringValue(raw, "provider_id") ??
      stringValue(profile, "provider_id") ??
      stringValue(profile, "id"),
    publicIdentifier:
      stringValue(profile, "public_identifier") ??
      stringValue(profile, "linkedin_public_identifier") ??
      stringValue(raw, "public_identifier"),
    profileUrl:
      stringValue(profile, "profile_url") ??
      stringValue(profile, "linkedin_url") ??
      stringValue(raw, "profile_url"),
    fullName,
    title:
      stringValue(profile, "headline") ??
      stringValue(profile, "title") ??
      stringValue(raw, "headline") ??
      stringValue(raw, "title"),
    companyName:
      stringValue(profile, "company_name") ??
      stringValue(profile, "company") ??
      stringValue(raw, "company_name"),
    location: stringValue(profile, "location") ?? stringValue(raw, "location"),
    profilePictureUrl:
      stringValue(profile, "profile_picture_url") ??
      stringValue(profile, "picture_url") ??
      stringValue(raw, "profile_picture_url"),
    raw
  };
}

export function selectOneToOneRelationshipAttendee(
  attendees: NormalizedUnipileAttendee[],
  accountUserProviderId?: string | null
): NormalizedUnipileAttendee | null {
  if (attendees.length === 0) return null;
  if (attendees.length === 1) return attendees[0] ?? null;

  const nonAccountAttendees = attendees.filter((attendee) => attendee.providerId !== accountUserProviderId);
  return nonAccountAttendees.length === 1 ? nonAccountAttendees[0] ?? null : null;
}

function objectValue(input: Record<string, unknown>, key: string): Record<string, unknown> | null {
  const value = input[key];
  return value && typeof value === "object" && !Array.isArray(value) ? value as Record<string, unknown> : null;
}

function stringValue(input: Record<string, unknown>, key: string): string | null {
  const value = input[key];
  return typeof value === "string" && value.trim() ? value.trim() : null;
}
