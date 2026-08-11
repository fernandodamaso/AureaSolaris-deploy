-- O provedor é intercambiável; Hermes e sua memória pertencem ao Aurea.
PRAGMA foreign_keys = ON;

CREATE TABLE IF NOT EXISTS ai_provider_preference (
  id TEXT PRIMARY KEY,
  owner_id TEXT NOT NULL REFERENCES account(id) ON DELETE CASCADE,
  provider_kind TEXT NOT NULL CHECK (provider_kind IN ('openai','compatible_api','local_model')),
  display_name TEXT NOT NULL,
  endpoint_url TEXT,
  secret_ref TEXT,
  model_id TEXT NOT NULL,
  enabled INTEGER NOT NULL DEFAULT 1 CHECK (enabled IN (0, 1)),
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS hermes_conversation_audit (
  id TEXT PRIMARY KEY,
  owner_id TEXT NOT NULL REFERENCES account(id) ON DELETE CASCADE,
  provider_preference_id TEXT REFERENCES ai_provider_preference(id) ON DELETE SET NULL,
  model_id TEXT NOT NULL,
  source_summary_json TEXT NOT NULL DEFAULT '[]',
  permissions_json TEXT NOT NULL DEFAULT '[]',
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_provider_owner_enabled ON ai_provider_preference(owner_id, enabled);
CREATE INDEX IF NOT EXISTS idx_hermes_audit_owner ON hermes_conversation_audit(owner_id, created_at);
