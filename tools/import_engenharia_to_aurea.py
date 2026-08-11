from __future__ import annotations

import argparse
import hashlib
import json
import shutil
import sqlite3
import sys
import tempfile
from datetime import datetime, timezone
from pathlib import Path
from typing import Any

import yaml


ROOT = Path(__file__).resolve().parents[1]
DEFAULT_SOURCE_ROOT = ROOT / "knowledge" / "engenharia_astrologica" / "docs"
DEFAULT_OUTPUT = ROOT / "knowledge" / "engenharia_astrologica" / "knowledge" / "build" / "editorial_current.sqlite"
EDITORIAL_SOURCE_ID = "editorial:engenharia_astrologica_corpus"
IMPORTER_VERSION = "import_engenharia_to_aurea@2026-08-11"

sys.path.insert(0, str(ROOT))
from local_storage import LocalStorage  # noqa: E402


def clip_text(value: str, limit: int = 900) -> str:
    cleaned = " ".join(value.split())
    if len(cleaned) <= limit:
        return cleaned
    return cleaned[: limit - 1].rstrip() + "…"


def stable_hash(parts: list[str]) -> str:
    digest = hashlib.sha256("||".join(parts).encode("utf-8")).hexdigest()
    return digest[:16]


def normalized_text(value: Any) -> str:
    if value is None:
      return ""
    if isinstance(value, str):
      return value
    if isinstance(value, (int, float, bool)):
      return str(value)
    if isinstance(value, list):
      return " ".join(normalized_text(item) for item in value if normalized_text(item))
    if isinstance(value, dict):
      return " ".join(normalized_text(item) for item in value.values() if normalized_text(item))
    return json.dumps(value, ensure_ascii=False, sort_keys=True)


def nested_get(data: dict[str, Any], *path: str) -> Any:
    current: Any = data
    for segment in path:
        if not isinstance(current, dict):
            return None
        current = current.get(segment)
    return current


def map_status(status: Any) -> str:
    status_text = str(status or "").strip().lower()
    if status_text == "complete":
        return "published"
    if status_text == "review":
        return "reviewed"
    return "draft"


def map_source_kind(reference: dict[str, Any]) -> str:
    title = normalized_text(reference.get("title") or reference.get("obra")).lower()
    nature = normalized_text(reference.get("natureza")).lower()
    url = normalized_text(reference.get("canonical_url") or reference.get("url")).lower()
    if "http" in url or "site" in nature or "website" in nature:
        return "website"
    if "course" in nature or "curso" in nature:
        return "course"
    if "dataset" in nature or "base de dados" in nature:
        return "dataset"
    if "manuscript" in nature or "manuscrito" in nature:
        return "manuscript"
    if "article" in nature or "artigo" in nature:
        return "article"
    if "archive" in nature or "arquivo" in nature:
        return "personal_archive"
    if "dataset" in title:
        return "dataset"
    return "book"


def infer_concept_type(relative_path: Path, data: dict[str, Any]) -> str:
    folder = relative_path.parts[0].lower() if relative_path.parts else ""
    kind = normalized_text(data.get("tipo")).lower()
    item_id = str(data.get("id") or "").lower()

    if item_id in {"sol", "lua"} or "luminar" in kind:
        return "luminary"
    if folder.startswith("03_signos") or "signo" in kind:
        return "sign"
    if folder.startswith("04_planetas") or "planeta" in kind:
        return "point" if item_id == "nodos" else "planet"
    if folder.startswith("05_casas") or "casa" in kind:
        return "house"
    if folder.startswith("06_aspectos") or "aspect" in kind:
        return "aspect"
    if folder.startswith("11_previsao") or "direç" in kind or "previs" in kind:
        return "timing"
    if folder.startswith("15_medicina") or "médic" in kind or "medic" in kind:
        return "medical_astrology"
    if any(token in kind for token in ["mapa", "sinastria", "composto", "davison", "revolução", "retorno"]):
        return "chart_type"
    if any(token in kind for token in ["lote", "parte", "nodo", "vertex", "estrela", "ponto", "asteroide"]):
        return "point"
    if any(token in kind for token in ["técnica", "tecnica", "condição", "condicao", "dignidade", "método", "metodo"]):
        return "technique"
    return "other"


def normalize_tradition(data: dict[str, Any]) -> str | None:
    for key in ("tradicao_primaria", "tradicoes", "tradicao"):
        value = data.get(key)
        if isinstance(value, list):
            joined = ", ".join(str(item).strip() for item in value if str(item).strip())
            if joined:
                return joined
        if isinstance(value, str) and value.strip():
            return value.strip()
    return None


def pick_description(data: dict[str, Any]) -> str:
    candidates = [
        data.get("definicao"),
        data.get("descricao"),
        data.get("descricao_curta"),
        data.get("resumo"),
        nested_get(data, "escopo", "definicao_operacional"),
        nested_get(data, "fundamento", "descricao"),
        nested_get(data, "procedimento", "passos"),
        nested_get(data, "uso_interpretativo", "como_ponderar"),
        nested_get(data, "camada_energetica", "manifestacao_externa"),
    ]
    for candidate in candidates:
        text = clip_text(normalized_text(candidate))
        if text:
            return text
    return "Ficha editorial importada da Engenharia Astrológica."


def build_claims(data: dict[str, Any], description: str) -> list[str]:
    candidates = [
        description,
        clip_text(normalized_text(nested_get(data, "fundamento", "descricao"))),
        clip_text(normalized_text(nested_get(data, "divergencias_de_tradicao", "consenso"))),
        clip_text(normalized_text(nested_get(data, "escopo", "definicao_operacional"))),
        clip_text(normalized_text(nested_get(data, "uso_interpretativo", "como_ponderar"))),
    ]
    claims: list[str] = []
    seen: set[str] = set()
    for candidate in candidates:
        text = candidate.strip()
        if not text or text in seen:
            continue
        seen.add(text)
        claims.append(text)
        if len(claims) >= 3:
            break
    return claims or [description]


def reference_entries(data: dict[str, Any]) -> list[dict[str, Any]]:
    references = data.get("referencias")
    if references is None:
        return []

    entries: list[dict[str, Any]] = []

    def push_entry(value: Any, group: str | None = None) -> None:
        if isinstance(value, dict):
            title = value.get("obra") or value.get("titulo") or value.get("title") or value.get("fonte")
            author = value.get("autor") or value.get("author")
            entries.append(
                {
                    "title": str(title).strip() if title else "Fonte editorial declarada",
                    "author": str(author).strip() if author else None,
                    "publisher": value.get("editora") or value.get("publisher"),
                    "published_year": value.get("ano") or value.get("year") or value.get("published_year"),
                    "natureza": value.get("natureza") or group,
                    "tradition": value.get("tradicao") or normalize_tradition(data),
                    "canonical_url": value.get("url") or value.get("canonical_url"),
                    "language": value.get("idioma") or value.get("language"),
                    "source_locator": value.get("localizador") or value.get("locator"),
                }
            )
        elif isinstance(value, str) and value.strip():
            entries.append(
                {
                    "title": value.strip(),
                    "author": None,
                    "publisher": None,
                    "published_year": None,
                    "natureza": group,
                    "tradition": normalize_tradition(data),
                    "canonical_url": None,
                    "language": None,
                    "source_locator": None,
                }
            )

    if isinstance(references, list):
        for item in references:
            push_entry(item)
    elif isinstance(references, dict):
        for group, values in references.items():
            if isinstance(values, list):
                for item in values:
                    push_entry(item, str(group))
            else:
                push_entry(values, str(group))

    return entries


def compute_tree_hash(source_root: Path) -> tuple[str, int]:
    digest = hashlib.sha256()
    files = sorted(source_root.rglob("*.yaml"))
    for path in files:
        relative = path.relative_to(source_root).as_posix().encode("utf-8")
        digest.update(relative)
        digest.update(path.read_bytes())
    return digest.hexdigest(), len(files)


def load_items(source_root: Path) -> list[tuple[Path, dict[str, Any], str]]:
    items: list[tuple[Path, dict[str, Any], str]] = []
    for path in sorted(source_root.rglob("*.yaml")):
        if "template" in path.name.casefold():
            continue
        raw = path.read_text(encoding="utf-8")
        parsed = yaml.safe_load(raw) or {}
        if not isinstance(parsed, dict):
            continue
        if not parsed.get("id") or not parsed.get("nome"):
            continue
        items.append((path, parsed, raw))
    return items


def ensure_source(
    connection: sqlite3.Connection,
    cache: dict[str, str],
    reference: dict[str, Any],
) -> str:
    title = str(reference.get("title") or "Fonte editorial").strip()
    author = str(reference.get("author")).strip() if reference.get("author") else None
    tradition = str(reference.get("tradition")).strip() if reference.get("tradition") else None
    key = json.dumps(
        {
            "title": title,
            "author": author,
            "tradition": tradition,
            "kind": map_source_kind(reference),
        },
        ensure_ascii=False,
        sort_keys=True,
    )
    if key in cache:
        return cache[key]

    source_id = f"source:{stable_hash([title, author or '', tradition or '', key])}"
    connection.execute(
        """
        INSERT INTO source(id, title, author, publisher, published_year, source_kind,
                           tradition, language, license_note, canonical_url)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        """,
        (
            source_id,
            title,
            author,
            reference.get("publisher"),
            int(reference["published_year"]) if str(reference.get("published_year") or "").isdigit() else None,
            map_source_kind(reference),
            tradition,
            reference.get("language"),
            None,
            reference.get("canonical_url"),
        ),
    )
    cache[key] = source_id
    return source_id


def import_corpus(source_root: Path, output: Path) -> dict[str, int]:
    with tempfile.TemporaryDirectory(prefix="aurea_knowledge_import_") as temp_dir:
        temp_data_dir = Path(temp_dir) / "data"
        storage = LocalStorage(temp_data_dir, migration_root=ROOT / "src-tauri" / "migrations")
        storage.initialize()
        database_path = temp_data_dir / "knowledge.sqlite"

        items = load_items(source_root)
        tree_hash, file_count = compute_tree_hash(source_root)
        output.parent.mkdir(parents=True, exist_ok=True)

        with sqlite3.connect(database_path) as connection:
            connection.execute("PRAGMA foreign_keys = ON")
            connection.row_factory = sqlite3.Row
            connection.execute("DELETE FROM claim")
            connection.execute("DELETE FROM concept_relation")
            connection.execute("DELETE FROM source_document")
            connection.execute("DELETE FROM concept")
            connection.execute("DELETE FROM source")
            connection.execute("DELETE FROM import_manifest")

            source_cache: dict[str, str] = {}
            connection.execute(
                """
                INSERT INTO source(id, title, author, publisher, published_year, source_kind,
                                   tradition, language, license_note, canonical_url)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                """,
                (
                    EDITORIAL_SOURCE_ID,
                    "Engenharia Astrológica — corpus editorial interno",
                    None,
                    None,
                    2026,
                    "dataset",
                    "multitradicional ocidental",
                    "pt-BR",
                    "Importado do corpus editorial interno do projeto.",
                    None,
                ),
            )

            known_ids = {str(data.get("id")) for _, data, _ in items}
            concept_count = 0
            claim_count = 0
            document_count = 0
            relation_count = 0

            for path, data, raw in items:
                relative = path.relative_to(source_root)
                item_id = str(data["id"]).strip()
                description = pick_description(data)
                tradition = normalize_tradition(data)

                connection.execute(
                    """
                    INSERT INTO concept(id, label, concept_type, description, status)
                    VALUES (?, ?, ?, ?, ?)
                    """,
                    (
                        item_id,
                        str(data["nome"]).strip(),
                        infer_concept_type(relative, data),
                        description,
                        map_status(data.get("status")),
                    ),
                )
                concept_count += 1

                references = reference_entries(data)
                source_ids = [ensure_source(connection, source_cache, reference) for reference in references]
                primary_source_id = source_ids[0] if source_ids else EDITORIAL_SOURCE_ID

                document_id = f"document:{item_id}"
                connection.execute(
                    """
                    INSERT INTO source_document(id, source_id, original_path, media_type, content_text, content_sha256)
                    VALUES (?, ?, ?, ?, ?, ?)
                    """,
                    (
                        document_id,
                        primary_source_id,
                        relative.as_posix(),
                        "application/x-yaml",
                        raw,
                        hashlib.sha256(raw.encode("utf-8")).hexdigest(),
                    ),
                )
                document_count += 1

                locator = None
                if references:
                    locator = references[0].get("source_locator") or relative.as_posix()
                else:
                    locator = relative.as_posix()

                for index, statement in enumerate(build_claims(data, description), start=1):
                    connection.execute(
                        """
                        INSERT INTO claim(id, concept_id, source_id, statement, tradition, interpretation_scope,
                                          evidence_grade, editorial_status, source_locator)
                        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
                        """,
                        (
                            f"claim:{item_id}:{index}",
                            item_id,
                            primary_source_id,
                            statement,
                            tradition,
                            normalized_text(data.get("tipo")) or relative.parts[0],
                            "traditional" if references else "editorial",
                            "reviewed" if map_status(data.get("status")) in {"reviewed", "published"} else "unreviewed",
                            locator,
                        ),
                    )
                    claim_count += 1

            for _, data, _ in items:
                item_id = str(data["id"]).strip()
                relations = data.get("relacoes") if isinstance(data.get("relacoes"), dict) else {}
                for relation_name, relation_type in (("depende_de", "requires"), ("ver_tambem", "related_to")):
                    values = relations.get(relation_name) or []
                    if not isinstance(values, list):
                        continue
                    for target in values:
                        target_id = str(target).strip()
                        if target_id not in known_ids:
                            continue
                        connection.execute(
                            """
                            INSERT OR IGNORE INTO concept_relation(id, from_concept_id, to_concept_id, relation_type, source_id, note)
                            VALUES (?, ?, ?, ?, ?, ?)
                            """,
                            (
                                f"relation:{stable_hash([item_id, target_id, relation_type])}",
                                item_id,
                                target_id,
                                relation_type,
                                EDITORIAL_SOURCE_ID,
                                f"Relação importada do campo {relation_name}.",
                            ),
                        )
                        relation_count += 1

            connection.execute(
                """
                INSERT INTO import_manifest(id, importer_version, origin_label, source_tree_sha256, file_count, notes)
                VALUES (?, ?, ?, ?, ?, ?)
                """,
                (
                    f"manifest:{datetime.now(timezone.utc).strftime('%Y%m%dT%H%M%SZ')}",
                    IMPORTER_VERSION,
                    "Engenharia Astrológica internal corpus",
                    tree_hash,
                    file_count,
                    f"Importado de {source_root}",
                ),
            )
            connection.commit()

        if output.exists():
            timestamp = datetime.now(timezone.utc).strftime("%Y%m%dT%H%M%SZ")
            backup = output.with_suffix(output.suffix + f".bak.{timestamp}")
            shutil.copy2(output, backup)
        shutil.copy2(database_path, output)

    return {
        "concepts": concept_count,
        "claims": claim_count,
        "documents": document_count,
        "relations": relation_count,
        "files": file_count,
        "output": str(output),
    }


def main() -> int:
    parser = argparse.ArgumentParser(description="Importa o corpus da Engenharia Astrológica para o schema knowledge.sqlite do Aurea.")
    parser.add_argument("--source-root", type=Path, default=DEFAULT_SOURCE_ROOT)
    parser.add_argument("--output", type=Path, default=DEFAULT_OUTPUT)
    args = parser.parse_args()

    if not args.source_root.is_dir():
        print(f"Fonte não encontrada: {args.source_root}", file=sys.stderr)
        return 2

    result = import_corpus(args.source_root.resolve(), args.output.resolve())
    print(json.dumps(result, ensure_ascii=False, indent=2))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
