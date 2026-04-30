create extension if not exists pgcrypto;

create table app_users (
  id uuid primary key default gen_random_uuid(),
  auth_user_id uuid unique not null,
  email text unique not null,
  full_name text,
  role text check (role in ('ae', 'bdr', 'manager', 'admin')) default 'ae',
  salesforce_user_id text,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create table linkedin_accounts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references app_users(id) not null,
  unipile_account_id text unique not null,
  account_type text default 'LINKEDIN',
  linkedin_product text check (linkedin_product in ('classic', 'sales_navigator', 'recruiter')),
  status text default 'pending',
  status_message text,
  last_full_sync_at timestamptz,
  last_partial_sync_at timestamptz,
  last_webhook_at timestamptz,
  reconnect_required boolean default false,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create table crm_accounts (
  id uuid primary key default gen_random_uuid(),
  salesforce_account_id text unique,
  owner_user_id uuid references app_users(id),
  name text not null,
  domain text,
  vertical text,
  segment text,
  tier text,
  status text,
  open_opportunity_stage text,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create table people (
  id uuid primary key default gen_random_uuid(),
  full_name text not null,
  first_name text,
  last_name text,
  title text,
  company_name text,
  location text,
  linkedin_url text,
  linkedin_public_identifier text,
  linkedin_provider_id text,
  linkedin_member_urn text,
  profile_picture_url text,
  email text,
  salesforce_contact_id text,
  salesforce_lead_id text,
  source text,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create table account_people (
  id uuid primary key default gen_random_uuid(),
  account_id uuid references crm_accounts(id) not null,
  person_id uuid references people(id) not null,
  relationship_type text default 'unknown',
  match_source text,
  match_confidence integer default 0,
  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  unique(account_id, person_id)
);

create table linkedin_relationships (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references app_users(id) not null,
  linkedin_account_id uuid references linkedin_accounts(id) not null,
  person_id uuid references people(id) not null,
  unipile_attendee_id text,
  attendee_provider_id text,
  relationship_status text check (relationship_status in ('unknown', 'not_connected', 'invited', 'connected')) default 'unknown',
  relationship_stage text check (relationship_stage in ('not_connected', 'invite_sent', 'connected_no_dm', 'dm_sent_no_reply', 'replied', 'engaged', 'stale', 'snoozed', 'do_not_contact', 'needs_review')) default 'needs_review',
  freshness_bucket text check (freshness_bucket in ('fresh', 'warm', 'cooling', 'stale', 'no_activity')) default 'no_activity',
  connection_date timestamptz,
  last_activity_at timestamptz,
  last_outbound_at timestamptz,
  last_inbound_at timestamptz,
  last_message_preview text,
  has_replied boolean default false,
  manual_responded boolean default false,
  snoozed_until timestamptz,
  do_not_contact boolean default false,
  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  unique(user_id, person_id)
);

create table linkedin_chats (
  id uuid primary key default gen_random_uuid(),
  linkedin_account_id uuid references linkedin_accounts(id) not null,
  user_id uuid references app_users(id) not null,
  person_id uuid references people(id),
  unipile_chat_id text unique not null,
  chat_type text,
  provider text default 'LINKEDIN',
  is_group boolean default false,
  unread boolean,
  last_message_at timestamptz,
  last_message_direction text check (last_message_direction in ('inbound', 'outbound', 'unknown')),
  raw_json jsonb,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create table linkedin_messages (
  id uuid primary key default gen_random_uuid(),
  linkedin_chat_id uuid references linkedin_chats(id) not null,
  linkedin_account_id uuid references linkedin_accounts(id) not null,
  user_id uuid references app_users(id) not null,
  person_id uuid references people(id),
  unipile_message_id text unique not null,
  sender_attendee_provider_id text,
  sender_name text,
  direction text check (direction in ('inbound', 'outbound', 'unknown')) not null,
  body text,
  sent_at timestamptz not null,
  source text check (source in ('initial_sync', 'resync', 'webhook', 'manual_import')),
  raw_json jsonb,
  created_at timestamptz default now()
);

create table relationship_events (
  id uuid primary key default gen_random_uuid(),
  relationship_id uuid references linkedin_relationships(id) not null,
  event_type text not null,
  event_at timestamptz default now(),
  source text,
  metadata jsonb,
  created_by uuid references app_users(id),
  created_at timestamptz default now()
);

create table next_actions (
  id uuid primary key default gen_random_uuid(),
  relationship_id uuid references linkedin_relationships(id) not null,
  action_type text check (action_type in ('send_invite', 'send_dm', 'follow_up', 'engage_post', 'wait', 'open_linkedin', 'snooze', 'do_not_contact')) not null,
  priority text check (priority in ('low', 'medium', 'high', 'urgent')) default 'medium',
  status text check (status in ('pending', 'approved', 'copied', 'sent', 'snoozed', 'dismissed', 'failed')) default 'pending',
  reason text,
  suggested_message text,
  due_at timestamptz,
  created_by_ai boolean default true,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create table unipile_webhook_events (
  id uuid primary key default gen_random_uuid(),
  event_type text,
  unipile_account_id text,
  external_event_id text,
  payload jsonb not null,
  processed_at timestamptz,
  processing_status text default 'pending',
  error text,
  created_at timestamptz default now()
);

create index linkedin_relationships_user_stage_idx on linkedin_relationships(user_id, relationship_stage);
create index linkedin_relationships_user_bucket_idx on linkedin_relationships(user_id, freshness_bucket);
create index linkedin_relationships_user_last_activity_idx on linkedin_relationships(user_id, last_activity_at desc);
create index linkedin_messages_user_sent_at_idx on linkedin_messages(user_id, sent_at desc);
create index people_linkedin_public_identifier_idx on people(linkedin_public_identifier);
create index people_linkedin_provider_id_idx on people(linkedin_provider_id);
create index unipile_webhook_events_status_idx on unipile_webhook_events(processing_status, created_at);
