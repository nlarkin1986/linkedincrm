import type { NormalizedUnipileAttendee } from "@/server/unipile/normalizers/attendee";

export type PersonUpsertInput = {
  fullName: string;
  title: string | null;
  companyName: string | null;
  location: string | null;
  linkedinUrl: string | null;
  linkedinPublicIdentifier: string | null;
  linkedinProviderId: string | null;
  profilePictureUrl: string | null;
  source: "unipile_attendee" | "manual_review";
};

export type PersonRecord = PersonUpsertInput & {
  id: string;
};

export function buildPersonUpsertFromAttendee(attendee: NormalizedUnipileAttendee): PersonUpsertInput {
  return {
    fullName: attendee.fullName,
    title: attendee.title,
    companyName: attendee.companyName,
    location: attendee.location,
    linkedinUrl: attendee.profileUrl,
    linkedinPublicIdentifier: attendee.publicIdentifier,
    linkedinProviderId: attendee.providerId,
    profilePictureUrl: attendee.profilePictureUrl,
    source: attendee.providerId || attendee.publicIdentifier ? "unipile_attendee" : "manual_review"
  };
}
