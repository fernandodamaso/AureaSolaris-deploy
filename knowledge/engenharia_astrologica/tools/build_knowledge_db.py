"""Compila o corpus editorial em SQLite pesquisável e auditável.

O script não altera os YAMLs de origem. Itens incompletos continuam visíveis no
banco, marcados com quality_state='warning', e toda falha fica registrada em
validation_issue para revisão humana.
"""

from __future__ import annotations

import argparse
import hashlib
import json
import sqlite3
import sys
from datetime import datetime, timezone
from pathlib import Path
from typing import Any, Iterator

import yaml


PROJECT_ROOT = Path(__file__).resolve().parents[1]
SOURCE_ROOT = PROJECT_ROOT / "docs"
SCHEMA_PATH = PROJECT_ROOT / "knowledge" / "schema.sql"
CANONICAL_MAP_PATH = PROJECT_ROOT / "canonical_map.yaml"
DEFAULT_OUTPUT = PROJECT_ROOT / "knowledge" / "build" / "engenharia_astrologica.sqlite"
ALLOWED_STATUS = {"draft", "review", "complete"}
ENGINE_RULES_MANIFEST = PROJECT_ROOT / "docs" / "00_Motor_de_Conhecimento" / "engine_rules_manifest.yaml"


def flatten_attributes(value: Any, path: str = "") -> Iterator[tuple[str, Any]]:
    if isinstance(value, dict):
        for key, child in value.items():
            child_path = f"{path}.{key}" if path else str(key)
            yield from flatten_attributes(child, child_path)
        return
    if isinstance(value, list):
        for index, child in enumerate(value):
            yield from flatten_attributes(child, f"{path}[{index}]")
        return
    yield path, value


def normalized_text(value: Any) -> str:
    if value is None:
        return ""
    if isinstance(value, str):
        return value
    if isinstance(value, (int, float, bool)):
        return str(value)
    if isinstance(value, list):
        return "\n".join(normalized_text(item) for item in value)
    if isinstance(value, dict):
        return "\n".join(f"{key}: {normalized_text(item)}" for key, item in value.items())
    return json.dumps(value, ensure_ascii=False, sort_keys=True)


def is_template(relative_path: Path) -> bool:
    return "template" in relative_path.name.casefold()


def load_canonical_map() -> dict[str, Any]:
    """Load the optional, reviewed canonical map without changing source YAMLs."""
    if not CANONICAL_MAP_PATH.exists():
        return {"by_id": {}, "relations": []}
    parsed = yaml.safe_load(CANONICAL_MAP_PATH.read_text(encoding="utf-8")) or {}
    by_id: dict[str, dict[str, str]] = {}
    relations: list[tuple[str, str, str, str]] = []
    for entry in parsed.get("consolidacoes", []):
        canonical_id = entry.get("canonical_id")
        if not isinstance(canonical_id, str) or not canonical_id:
            continue
        by_id[canonical_id] = {"canonical_id": canonical_id, "content_layer": "technical"}
        for alias in entry.get("aliases", []):
            alias_id = alias.get("id")
            relationship = alias.get("relationship")
            if not isinstance(alias_id, str) or not isinstance(relationship, str):
                continue
            by_id[alias_id] = {"canonical_id": canonical_id, "content_layer": relationship}
            relations.append((alias_id, relationship, canonical_id, str(entry.get("conceito", ""))))
    return {"by_id": by_id, "relations": relations}


def create_database(output: Path) -> sqlite3.Connection:
    output.parent.mkdir(parents=True, exist_ok=True)
    if output.exists():
        output.unlink()
    connection = sqlite3.connect(output)
    with SCHEMA_PATH.open("r", encoding="utf-8") as schema_file:
        connection.executescript(schema_file.read())
    connection.execute(
        "INSERT INTO schema_migration(version, applied_at) VALUES (?, ?)",
        (2, datetime.now(timezone.utc).isoformat()),
    )
    return connection


def record_issue(connection: sqlite3.Connection, source_path: str, severity: str, code: str, detail: str) -> None:
    connection.execute(
        "INSERT INTO validation_issue(source_path, severity, code, detail) VALUES (?, ?, ?, ?)",
        (source_path, severity, code, detail),
    )


def compile_corpus(connection: sqlite3.Connection) -> dict[str, int]:
    counts = {"files": 0, "items": 0, "references": 0, "warnings": 0, "errors": 0, "templates": 0}
    known_ids: set[str] = set()
    pending_items: list[tuple[Path, str, dict[str, Any], str]] = []
    canonical_map = load_canonical_map()

    for source_file in sorted(SOURCE_ROOT.rglob("*.yaml")):
        counts["files"] += 1
        relative_path = source_file.relative_to(PROJECT_ROOT).as_posix()
        raw_yaml = source_file.read_text(encoding="utf-8")
        try:
            parsed = yaml.safe_load(raw_yaml)
        except yaml.YAMLError as error:
            record_issue(connection, relative_path, "error", "yaml_parse_error", str(error))
            counts["errors"] += 1
            continue

        if is_template(source_file.relative_to(SOURCE_ROOT)):
            counts["templates"] += 1
            continue
        if not isinstance(parsed, dict):
            record_issue(connection, relative_path, "error", "not_mapping", "A ficha precisa ser um objeto YAML.")
            counts["errors"] += 1
            continue

        item_id = parsed.get("id")
        name = parsed.get("nome")
        if not isinstance(item_id, str) or not item_id.strip():
            category = source_file.relative_to(SOURCE_ROOT).parts[0]
            source_hash = hashlib.sha256(raw_yaml.encode("utf-8")).hexdigest()
            compiled_at = datetime.now(timezone.utc).isoformat()
            connection.execute(
                """
                INSERT INTO reference_document(source_path, name, category, source_hash, raw_yaml, compiled_at)
                VALUES (?, ?, ?, ?, ?, ?)
                """,
                (relative_path, source_file.stem.replace("_", " "), category, source_hash, raw_yaml, compiled_at),
            )
            connection.execute(
                "INSERT INTO content_fts(item_id, name, category, source_path, searchable_text) VALUES (?, ?, ?, ?, ?)",
                (f"reference:{relative_path}", source_file.stem.replace("_", " "), category, relative_path, normalized_text(parsed)),
            )
            counts["references"] += 1
            continue
        if item_id in known_ids:
            record_issue(connection, relative_path, "error", "duplicate_id", f"O id '{item_id}' já foi usado por outra ficha.")
            counts["errors"] += 1
            continue
        if not isinstance(name, str) or not name.strip():
            record_issue(connection, relative_path, "error", "missing_name", "Campo obrigatório nome ausente ou inválido.")
            counts["errors"] += 1
            continue
        known_ids.add(item_id)
        pending_items.append((source_file, relative_path, parsed, raw_yaml))

    compiled_at = datetime.now(timezone.utc).isoformat()
    for source_file, relative_path, parsed, raw_yaml in pending_items:
        item_id = parsed["id"].strip()
        status = parsed.get("status")
        mapping = canonical_map["by_id"].get(item_id, {})
        canonical_id = mapping.get("canonical_id", item_id)
        content_layer = mapping.get("content_layer", "technical")
        school_variant = parsed.get("escola") or parsed.get("variante")
        quality_state = "valid"
        if status not in ALLOWED_STATUS:
            quality_state = "warning"
            detail = "Campo status ausente." if status is None else f"Status inválido: {status!r}."
            record_issue(connection, relative_path, "warning", "invalid_status", detail)
            counts["warnings"] += 1
            status = None

        category = source_file.relative_to(SOURCE_ROOT).parts[0]
        source_hash = hashlib.sha256(raw_yaml.encode("utf-8")).hexdigest()
        connection.execute(
            """
            INSERT INTO content_item(id, name, status, category, canonical_id, content_layer, school_variant, source_path, source_hash, raw_yaml, quality_state, compiled_at)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            """,
            (item_id, parsed["nome"].strip(), status, category, canonical_id, content_layer, school_variant, relative_path, source_hash, raw_yaml, quality_state, compiled_at),
        )
        for attribute_path, value in flatten_attributes(parsed):
            if attribute_path in {"id", "nome", "status"}:
                continue
            connection.execute(
                "INSERT INTO content_attribute(item_id, attribute_path, value_json) VALUES (?, ?, ?)",
                (item_id, attribute_path, json.dumps(value, ensure_ascii=False)),
            )
        connection.execute(
            "INSERT INTO content_fts(item_id, name, category, source_path, searchable_text) VALUES (?, ?, ?, ?, ?)",
            (item_id, parsed["nome"], category, relative_path, normalized_text(parsed)),
        )
        counts["items"] += 1
    for from_id, relation, to_id, note in canonical_map["relations"]:
        exists_from = connection.execute("SELECT 1 FROM content_item WHERE id = ?", (from_id,)).fetchone()
        exists_to = connection.execute("SELECT 1 FROM content_item WHERE id = ?", (to_id,)).fetchone()
        if not exists_from or not exists_to:
            record_issue(connection, f"canonical_map:{from_id}", "warning", "missing_relation_target", f"Relação {relation} aponta para item ausente: {to_id}.")
            counts["warnings"] += 1
            continue
        connection.execute(
            "INSERT OR IGNORE INTO content_relation(from_id, relation, to_id, note) VALUES (?, ?, ?, ?)",
            (from_id, relation, to_id, note),
        )
    return counts


def compile_engine_rules(connection: sqlite3.Connection, manifest_path: Path) -> dict[str, int]:
    if not manifest_path.exists():
        return {"engine_rules": 0, "review_targets": 0, "warnings": 0, "errors": 0}

    raw = manifest_path.read_text(encoding="utf-8")
    try:
        parsed = yaml.safe_load(raw)
    except yaml.YAMLError as error:
        print(f"Erro no manifesto de regras: {error}", file=sys.stderr)
        return {"engine_rules": 0, "review_targets": 0, "warnings": 1, "errors": 1}

    if not isinstance(parsed, dict):
        return {"engine_rules": 0, "review_targets": 0, "warnings": 1, "errors": 0}

    rules = parsed.get("rules", [])
    if not isinstance(rules, list):
        return {"engine_rules": 0, "review_targets": 0, "warnings": 1, "errors": 0}

    counts = {"engine_rules": 0, "review_targets": 0, "warnings": 0, "errors": 0}
    compiled_at = datetime.now(timezone.utc).isoformat()

    for rule in rules:
        if not isinstance(rule, dict):
            counts["warnings"] += 1
            continue
        rule_id = rule.get("id")
        name = rule.get("name")
        category = rule.get("category")
        rule_kind = rule.get("rule_kind")
        engine_ref = rule.get("engine_ref")
        library_path = rule.get("library_path")
        params_json = rule.get("params_json")
        quality_state = rule.get("quality_state", "valid")
        source_hash = hashlib.sha256(str(rule).encode("utf-8")).hexdigest()

        if not all([rule_id, name, category, rule_kind, engine_ref, library_path]):
            counts["warnings"] += 1
            continue

        connection.execute(
            """
            INSERT INTO engine_rule(id, name, category, rule_kind, engine_ref, library_path, params_json, quality_state, source_hash, compiled_at)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            """,
            (rule_id, name, category, rule_kind, engine_ref, library_path, params_json or "{}", quality_state, source_hash, compiled_at),
        )
        counts["engine_rules"] += 1

        if quality_state in ("warning", "error"):
            review_id = f"review:{rule_id}"
            detail = f"Regra com quality_state={quality_state}. Revisar biblioteca antes do uso em produção."
            connection.execute(
                "INSERT OR IGNORE INTO engine_review_target(id, engine_rule_id, engine_ref, library_path, review_type, priority, detail) VALUES (?, ?, ?, ?, ?, ?, ?)",
                (review_id, rule_id, engine_ref, library_path, "biblioteca_revisao", 1 if quality_state == "error" else 2, detail),
            )
            counts["review_targets"] += 1

    return counts


def main() -> int:
    parser = argparse.ArgumentParser(description="Compila a Engenharia Astrológica em SQLite.")
    parser.add_argument("--output", type=Path, default=DEFAULT_OUTPUT, help="Caminho do SQLite de saída.")
    parser.add_argument("--strict", action="store_true", help="Retorna falha se houver avisos ou erros de validação.")
    args = parser.parse_args()

    if not SOURCE_ROOT.is_dir():
        print(f"Fonte não encontrada: {SOURCE_ROOT}", file=sys.stderr)
        return 2
    connection = create_database(args.output)
    try:
        content_counts = compile_corpus(connection)
        rule_counts = compile_engine_rules(connection, ENGINE_RULES_MANIFEST)
        counts = {**content_counts, **rule_counts}
        connection.commit()
    finally:
        connection.close()

    print(f"Banco criado: {args.output}")
    print(" | ".join(f"{key}={value}" for key, value in counts.items()))
    if args.strict and (counts.get("warnings") or counts.get("errors")):
        return 1
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
