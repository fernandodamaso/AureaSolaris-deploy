PRAGMA foreign_keys = ON;

CREATE TABLE schema_migration (
  version INTEGER PRIMARY KEY,
  applied_at TEXT NOT NULL
);

CREATE TABLE content_item (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  status TEXT,
  category TEXT NOT NULL,
  canonical_id TEXT,
  content_layer TEXT NOT NULL DEFAULT 'technical',
  school_variant TEXT,
  source_path TEXT NOT NULL UNIQUE,
  source_hash TEXT NOT NULL,
  raw_yaml TEXT NOT NULL,
  quality_state TEXT NOT NULL CHECK (quality_state IN ('valid', 'warning')),
  compiled_at TEXT NOT NULL
);

CREATE INDEX idx_content_item_category ON content_item(category);
CREATE INDEX idx_content_item_status ON content_item(status);
CREATE INDEX idx_content_item_canonical ON content_item(canonical_id);

CREATE TABLE content_relation (
  from_id TEXT NOT NULL REFERENCES content_item(id) ON DELETE CASCADE,
  relation TEXT NOT NULL CHECK (relation IN (
    'alias_of', 'summary_of', 'source_layer', 'variant_of',
    'contradicts', 'supports', 'derives_from'
  )),
  to_id TEXT NOT NULL REFERENCES content_item(id) ON DELETE CASCADE,
  note TEXT,
  PRIMARY KEY (from_id, relation, to_id)
);

CREATE INDEX idx_content_relation_to ON content_relation(to_id);

CREATE TABLE reference_document (
  source_path TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  category TEXT NOT NULL,
  source_hash TEXT NOT NULL,
  raw_yaml TEXT NOT NULL,
  compiled_at TEXT NOT NULL
);

CREATE TABLE content_attribute (
  item_id TEXT NOT NULL REFERENCES content_item(id) ON DELETE CASCADE,
  attribute_path TEXT NOT NULL,
  value_json TEXT NOT NULL,
  PRIMARY KEY (item_id, attribute_path)
);

CREATE TABLE validation_issue (
  id INTEGER PRIMARY KEY,
  source_path TEXT NOT NULL,
  severity TEXT NOT NULL CHECK (severity IN ('warning', 'error')),
  code TEXT NOT NULL,
  detail TEXT NOT NULL
);

CREATE VIRTUAL TABLE content_fts USING fts5(
  item_id UNINDEXED,
  name,
  category,
  source_path,
  searchable_text
);

CREATE TABLE engine_rule (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  category TEXT NOT NULL,
  rule_kind TEXT NOT NULL CHECK (rule_kind IN ('invariant','orb','dignity','aspect','house','certification','interpretation','natal','transit','calculation','moon_phase')),
  engine_ref TEXT NOT NULL,
  library_path TEXT NOT NULL,
  params_json TEXT NOT NULL,
  quality_state TEXT NOT NULL CHECK (quality_state IN ('valid','warning','error','draft')),
  source_hash TEXT NOT NULL,
  compiled_at TEXT NOT NULL
);

CREATE INDEX idx_engine_rule_category ON engine_rule(category);
CREATE INDEX idx_engine_rule_engine_ref ON engine_rule(engine_ref);

CREATE TABLE engine_review_target (
  id TEXT PRIMARY KEY,
  engine_rule_id TEXT NOT NULL,
  engine_ref TEXT NOT NULL,
  library_path TEXT NOT NULL,
  review_type TEXT NOT NULL,
  priority INTEGER NOT NULL DEFAULT 0,
  detail TEXT NOT NULL,
  FOREIGN KEY (engine_rule_id) REFERENCES engine_rule(id) ON DELETE CASCADE
);

CREATE INDEX idx_engine_review_target_engine_ref ON engine_review_target(engine_ref);
