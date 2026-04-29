import {
  boolean,
  integer,
  jsonb,
  pgEnum,
  pgTable,
  text,
  timestamp,
  unique,
  uuid
} from "drizzle-orm/pg-core";

export const appUserRole = pgEnum("app_user_role", ["ae", "bdr", "manager", "admin"]);
export const linkedinProduct = pgEnum("linkedin_product", ["classic", "sales_navigator", "recruiter"]);
export const relationshipStatus = pgEnum("relationship_status", [
  "unknown",
  "not_connected",
  "invited",
  "connected"
]);
export const relationshipStage = pgEnum("relationship_stage", [
  "not_connected",
  "invite_sent",
  "connected_no_dm",
  "dm_sent_no_reply",
  "replied",
  "engaged",
  "stale",
  "snoozed",
  "do_not_contact",
  "needs_review"
]);
export const freshnessBucket = pgEnum("freshness_bucket", [
  "fresh",
  "warm",
  "cooling",
  "stale",
  "no_activity"
]);
export const messageDirection = pgEnum("message_direction", ["inbound", "outbound", "unknown"]);
export const messageSource = pgEnum("message_source", ["initial_sync", "resync", "webhook", "manual_import"]);
export const nextActionType = pgEnum("next_action_type", [
  "send_invite",
  "send_dm",
  "follow_up",
  "engage_post",
  "wait",
  "open_linkedin",
  "snooze",
  "do_not_contact"
]);
export const nextActionPriority = pgEnum("next_action_priority", ["low", "medium", "high", "urgent"]);
export const nextActionStatus = pgEnum("next_action_status", [
  "pending",
  "approved",
  "copied",
  "sent",
  "snoozed",
  "dismissed",
  "failed"
]);

const timestamps = {
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow()
};

export const appUsers = pgTable("app_users", {
  id: uuid("id").primaryKey().defaultRandom(),
  authUserId: uuid("auth_user_id").notNull().unique(),
  email: text("email").notNull().unique(),
  fullName: text("full_name"),
  role: appUserRole("role").default("ae"),
  salesforceUserId: text("salesforce_user_id"),
  ...timestamps
});

export const linkedinAccounts = pgTable("linkedin_accounts", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: uuid("user_id").notNull().references(() => appUsers.id),
  unipileAccountId: text("unipile_account_id").notNull().unique(),
  accountType: text("account_type").default("LINKEDIN"),
  linkedinProduct: linkedinProduct("linkedin_product"),
  status: text("status").default("pending"),
  statusMessage: text("status_message"),
  lastFullSyncAt: timestamp("last_full_sync_at", { withTimezone: true }),
  lastPartialSyncAt: timestamp("last_partial_sync_at", { withTimezone: true }),
  lastWebhookAt: timestamp("last_webhook_at", { withTimezone: true }),
  reconnectRequired: boolean("reconnect_required").default(false),
  ...timestamps
});

export const crmAccounts = pgTable("crm_accounts", {
  id: uuid("id").primaryKey().defaultRandom(),
  salesforceAccountId: text("salesforce_account_id").unique(),
  ownerUserId: uuid("owner_user_id").references(() => appUsers.id),
  name: text("name").notNull(),
  domain: text("domain"),
  vertical: text("vertical"),
  segment: text("segment"),
  tier: text("tier"),
  status: text("status"),
  openOpportunityStage: text("open_opportunity_stage"),
  ...timestamps
});

export const people = pgTable("people", {
  id: uuid("id").primaryKey().defaultRandom(),
  fullName: text("full_name").notNull(),
  firstName: text("first_name"),
  lastName: text("last_name"),
  title: text("title"),
  companyName: text("company_name"),
  location: text("location"),
  linkedinUrl: text("linkedin_url"),
  linkedinPublicIdentifier: text("linkedin_public_identifier"),
  linkedinProviderId: text("linkedin_provider_id"),
  linkedinMemberUrn: text("linkedin_member_urn"),
  profilePictureUrl: text("profile_picture_url"),
  email: text("email"),
  salesforceContactId: text("salesforce_contact_id"),
  salesforceLeadId: text("salesforce_lead_id"),
  source: text("source"),
  ...timestamps
});

export const accountPeople = pgTable(
  "account_people",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    accountId: uuid("account_id").notNull().references(() => crmAccounts.id),
    personId: uuid("person_id").notNull().references(() => people.id),
    relationshipType: text("relationship_type").default("unknown"),
    matchSource: text("match_source"),
    matchConfidence: integer("match_confidence").default(0),
    ...timestamps
  },
  (table) => ({
    accountPersonUnique: unique().on(table.accountId, table.personId)
  })
);

export const linkedinRelationships = pgTable(
  "linkedin_relationships",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id").notNull().references(() => appUsers.id),
    linkedinAccountId: uuid("linkedin_account_id").notNull().references(() => linkedinAccounts.id),
    personId: uuid("person_id").notNull().references(() => people.id),
    unipileAttendeeId: text("unipile_attendee_id"),
    attendeeProviderId: text("attendee_provider_id"),
    relationshipStatus: relationshipStatus("relationship_status").default("unknown"),
    relationshipStage: relationshipStage("relationship_stage").default("needs_review"),
    freshnessBucket: freshnessBucket("freshness_bucket").default("no_activity"),
    connectionDate: timestamp("connection_date", { withTimezone: true }),
    lastActivityAt: timestamp("last_activity_at", { withTimezone: true }),
    lastOutboundAt: timestamp("last_outbound_at", { withTimezone: true }),
    lastInboundAt: timestamp("last_inbound_at", { withTimezone: true }),
    lastMessagePreview: text("last_message_preview"),
    hasReplied: boolean("has_replied").default(false),
    manualResponded: boolean("manual_responded").default(false),
    snoozedUntil: timestamp("snoozed_until", { withTimezone: true }),
    doNotContact: boolean("do_not_contact").default(false),
    ...timestamps
  },
  (table) => ({
    userPersonUnique: unique().on(table.userId, table.personId)
  })
);

export const linkedinChats = pgTable("linkedin_chats", {
  id: uuid("id").primaryKey().defaultRandom(),
  linkedinAccountId: uuid("linkedin_account_id").notNull().references(() => linkedinAccounts.id),
  userId: uuid("user_id").notNull().references(() => appUsers.id),
  personId: uuid("person_id").references(() => people.id),
  unipileChatId: text("unipile_chat_id").notNull().unique(),
  chatType: text("chat_type"),
  provider: text("provider").default("LINKEDIN"),
  isGroup: boolean("is_group").default(false),
  unread: boolean("unread"),
  lastMessageAt: timestamp("last_message_at", { withTimezone: true }),
  lastMessageDirection: messageDirection("last_message_direction"),
  rawJson: jsonb("raw_json"),
  ...timestamps
});

export const linkedinMessages = pgTable("linkedin_messages", {
  id: uuid("id").primaryKey().defaultRandom(),
  linkedinChatId: uuid("linkedin_chat_id").notNull().references(() => linkedinChats.id),
  linkedinAccountId: uuid("linkedin_account_id").notNull().references(() => linkedinAccounts.id),
  userId: uuid("user_id").notNull().references(() => appUsers.id),
  personId: uuid("person_id").references(() => people.id),
  unipileMessageId: text("unipile_message_id").notNull().unique(),
  senderAttendeeProviderId: text("sender_attendee_provider_id"),
  senderName: text("sender_name"),
  direction: messageDirection("direction").notNull(),
  body: text("body"),
  sentAt: timestamp("sent_at", { withTimezone: true }).notNull(),
  source: messageSource("source"),
  rawJson: jsonb("raw_json"),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow()
});

export const relationshipEvents = pgTable("relationship_events", {
  id: uuid("id").primaryKey().defaultRandom(),
  relationshipId: uuid("relationship_id").notNull().references(() => linkedinRelationships.id),
  eventType: text("event_type").notNull(),
  eventAt: timestamp("event_at", { withTimezone: true }).defaultNow(),
  source: text("source"),
  metadata: jsonb("metadata"),
  createdBy: uuid("created_by").references(() => appUsers.id),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow()
});

export const nextActions = pgTable("next_actions", {
  id: uuid("id").primaryKey().defaultRandom(),
  relationshipId: uuid("relationship_id").notNull().references(() => linkedinRelationships.id),
  actionType: nextActionType("action_type").notNull(),
  priority: nextActionPriority("priority").default("medium"),
  status: nextActionStatus("status").default("pending"),
  reason: text("reason"),
  suggestedMessage: text("suggested_message"),
  dueAt: timestamp("due_at", { withTimezone: true }),
  createdByAi: boolean("created_by_ai").default(true),
  ...timestamps
});

export const unipileWebhookEvents = pgTable("unipile_webhook_events", {
  id: uuid("id").primaryKey().defaultRandom(),
  eventType: text("event_type"),
  unipileAccountId: text("unipile_account_id"),
  externalEventId: text("external_event_id"),
  payload: jsonb("payload").notNull(),
  processedAt: timestamp("processed_at", { withTimezone: true }),
  processingStatus: text("processing_status").default("pending"),
  error: text("error"),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow()
});

export type FreshnessBucket = (typeof freshnessBucket.enumValues)[number];
export type RelationshipStage = (typeof relationshipStage.enumValues)[number];
export type RelationshipStatus = (typeof relationshipStatus.enumValues)[number];
export type MessageDirection = (typeof messageDirection.enumValues)[number];
export type AppUserRole = (typeof appUserRole.enumValues)[number];
