create unique index if not exists unipile_webhook_events_event_external_id_unique
  on unipile_webhook_events(event_type, external_event_id);
