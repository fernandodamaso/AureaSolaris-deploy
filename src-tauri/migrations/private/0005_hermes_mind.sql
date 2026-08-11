-- "Tudo é Mente": memória durável, contextual e controlada pela pessoa.
-- Referências a knowledge.sqlite são IDs estáveis, sem FK entre bancos separados.
PRAGMA foreign_keys = ON;

CREATE TABLE IF NOT EXISTS hermes_thread (
  id TEXT PRIMARY KEY,
  owner_id TEXT NOT NULL REFERENCES account(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  topic_key TEXT,
  subject_context_json TEXT NOT NULL DEFAULT '{}',
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active','archived','deleted')),
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  deleted_at TEXT
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_hermes_thread_id_owner
  ON hermes_thread(id, owner_id);
CREATE UNIQUE INDEX IF NOT EXISTS idx_hermes_memory_id_owner
  ON hermes_memory(id, owner_id);
CREATE UNIQUE INDEX IF NOT EXISTS idx_hermes_audit_id_owner
  ON hermes_conversation_audit(id, owner_id);

CREATE TABLE IF NOT EXISTS hermes_message (
  id TEXT PRIMARY KEY,
  owner_id TEXT NOT NULL REFERENCES account(id) ON DELETE CASCADE,
  thread_id TEXT NOT NULL,
  role TEXT NOT NULL CHECK (role IN ('user','hermes','system')),
  content TEXT NOT NULL,
  provenance_kind TEXT NOT NULL CHECK (
    provenance_kind IN ('personal_statement','personal_note','calculated_fact','source_excerpt','hermes_inference','system_notice')
  ),
  calculation_receipt_hash TEXT,
  source_refs_json TEXT NOT NULL DEFAULT '[]',
  provider_audit_id TEXT,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  deleted_at TEXT,
  FOREIGN KEY(thread_id, owner_id) REFERENCES hermes_thread(id, owner_id) ON DELETE CASCADE,
  FOREIGN KEY(provider_audit_id, owner_id) REFERENCES hermes_conversation_audit(id, owner_id) ON DELETE RESTRICT
);

ALTER TABLE hermes_memory ADD COLUMN topic_key TEXT;
ALTER TABLE hermes_memory ADD COLUMN subject_kind TEXT;
ALTER TABLE hermes_memory ADD COLUMN subject_ref TEXT;
ALTER TABLE hermes_memory ADD COLUMN source_thread_id TEXT REFERENCES hermes_thread(id) ON DELETE SET NULL;
ALTER TABLE hermes_memory ADD COLUMN source_message_id TEXT REFERENCES hermes_message(id) ON DELETE SET NULL;
ALTER TABLE hermes_memory ADD COLUMN confidence TEXT NOT NULL DEFAULT 'stated' CHECK (confidence IN ('stated','inferred','confirmed','disputed'));
ALTER TABLE hermes_memory ADD COLUMN updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP;
ALTER TABLE hermes_memory ADD COLUMN last_used_at TEXT;
ALTER TABLE hermes_memory ADD COLUMN deleted_at TEXT;

CREATE TABLE IF NOT EXISTS hermes_memory_evidence (
  id TEXT PRIMARY KEY,
  owner_id TEXT NOT NULL REFERENCES account(id) ON DELETE CASCADE,
  memory_id TEXT NOT NULL,
  evidence_kind TEXT NOT NULL CHECK (evidence_kind IN ('message','note','calculation_receipt','knowledge_claim','personal_statement')),
  evidence_ref TEXT NOT NULL,
  evidence_snapshot TEXT,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY(memory_id, owner_id) REFERENCES hermes_memory(id, owner_id) ON DELETE CASCADE,
  UNIQUE(owner_id, memory_id, evidence_kind, evidence_ref)
);

CREATE TABLE IF NOT EXISTS hermes_contradiction_review (
  id TEXT PRIMARY KEY,
  owner_id TEXT NOT NULL REFERENCES account(id) ON DELETE CASCADE,
  memory_id TEXT NOT NULL,
  knowledge_claim_id TEXT NOT NULL,
  knowledge_source_id TEXT,
  claim_snapshot TEXT NOT NULL,
  relationship TEXT NOT NULL CHECK (relationship IN ('contradicts','qualifies','different_school','supports')),
  explanation TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'open' CHECK (status IN ('open','acknowledged','resolved','dismissed')),
  user_resolution TEXT CHECK (user_resolution IN ('keep_personal_view','revise_memory','follow_source','compare_schools','not_applicable')),
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  resolved_at TEXT,
  FOREIGN KEY(memory_id, owner_id) REFERENCES hermes_memory(id, owner_id) ON DELETE CASCADE
);

CREATE TRIGGER IF NOT EXISTS trg_hermes_memory_source_owner_insert
BEFORE INSERT ON hermes_memory
WHEN (NEW.source_thread_id IS NOT NULL AND EXISTS (
  SELECT 1 FROM hermes_thread WHERE id = NEW.source_thread_id AND owner_id <> NEW.owner_id
)) OR (NEW.source_message_id IS NOT NULL AND EXISTS (
  SELECT 1 FROM hermes_message WHERE id = NEW.source_message_id AND owner_id <> NEW.owner_id
))
BEGIN
  SELECT RAISE(ABORT, 'Hermes memory source belongs to another owner');
END;

CREATE TRIGGER IF NOT EXISTS trg_hermes_memory_source_owner_update
BEFORE UPDATE OF owner_id, source_thread_id, source_message_id ON hermes_memory
WHEN (NEW.source_thread_id IS NOT NULL AND EXISTS (
  SELECT 1 FROM hermes_thread WHERE id = NEW.source_thread_id AND owner_id <> NEW.owner_id
)) OR (NEW.source_message_id IS NOT NULL AND EXISTS (
  SELECT 1 FROM hermes_message WHERE id = NEW.source_message_id AND owner_id <> NEW.owner_id
))
BEGIN
  SELECT RAISE(ABORT, 'Hermes memory source belongs to another owner');
END;

CREATE INDEX IF NOT EXISTS idx_hermes_thread_owner_topic
  ON hermes_thread(owner_id, topic_key, updated_at);
CREATE INDEX IF NOT EXISTS idx_hermes_message_owner_thread
  ON hermes_message(owner_id, thread_id, created_at);
CREATE INDEX IF NOT EXISTS idx_hermes_memory_owner_topic
  ON hermes_memory(owner_id, topic_key, status, updated_at);
CREATE INDEX IF NOT EXISTS idx_hermes_memory_subject
  ON hermes_memory(owner_id, subject_kind, subject_ref, status);
CREATE INDEX IF NOT EXISTS idx_hermes_contradiction_open
  ON hermes_contradiction_review(owner_id, status, created_at);
