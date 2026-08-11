-- Agenda local-first: tempo explícito, vínculo externo rastreável e auditoria.
-- Não importa eventos externos nem dados legados.
PRAGMA foreign_keys = ON;

ALTER TABLE plan_item ADD COLUMN timezone_id TEXT;
ALTER TABLE plan_item ADD COLUMN all_day INTEGER NOT NULL DEFAULT 0 CHECK (all_day IN (0, 1));
ALTER TABLE plan_item ADD COLUMN calendar_uid TEXT;
ALTER TABLE plan_item ADD COLUMN external_version TEXT;
ALTER TABLE plan_item ADD COLUMN sync_status TEXT NOT NULL DEFAULT 'local_only'
  CHECK (sync_status IN ('local_only','pending','synced','conflict','error'));
ALTER TABLE plan_item ADD COLUMN deleted_at TEXT;

CREATE TABLE IF NOT EXISTS audit_event (
  id TEXT PRIMARY KEY,
  owner_id TEXT NOT NULL REFERENCES account(id) ON DELETE CASCADE,
  event_type TEXT NOT NULL,
  entity_type TEXT NOT NULL,
  entity_id TEXT,
  metadata_json TEXT NOT NULL DEFAULT '{}',
  occurred_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_plan_owner_calendar_uid
  ON plan_item(owner_id, calendar_uid)
  WHERE calendar_uid IS NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS idx_plan_external_link
  ON plan_item(owner_id, external_provider, external_id)
  WHERE external_provider IS NOT NULL AND external_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_audit_owner_occurred
  ON audit_event(owner_id, occurred_at);
