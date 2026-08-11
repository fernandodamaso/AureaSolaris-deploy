"""Controla a modalidade de publica\u00e7\u00e3o do acervo editorial.

O corpus continua integralmente compil\u00e1vel para estudo, inclusive quando uma
ficha ainda est\u00e1 em ``draft`` ou ``review``. Este utilit\u00e1rio separa esse uso
de uma declara\u00e7\u00e3o de "cat\u00e1logo integral conclu\u00eddo": esta \u00faltima s\u00f3 \u00e9
permitida se todas as fichas forem ``complete`` e a auditoria estrita passar.

Nenhum YAML de conte\u00fado \u00e9 modificado. O manifesto opcional \u00e9 uma pe\u00e7a de
proveni\u00eancia para a camada de publica\u00e7\u00e3o/UI exibir os estados editoriais.
"""

from __future__ import annotations

import argparse
import json
from datetime import datetime, timezone
from pathlib import Path
from typing import Any

import audit_editorial_metadata


PROJECT_ROOT = Path(__file__).resolve().parents[1]
DEFAULT_MANIFEST = PROJECT_ROOT / "knowledge" / "build" / "editorial_publication_manifest.json"
EDITIONS = {"study", "catalog"}


def non_complete_paths(report: dict[str, Any]) -> list[str]:
    """Lista fichas que impedem declarar o cat\u00e1logo integral como conclu\u00eddo."""
    paths: list[str] = []
    for path in sorted(audit_editorial_metadata.SOURCE_ROOT.rglob("*.yaml")):
        if audit_editorial_metadata.is_template(path.relative_to(audit_editorial_metadata.SOURCE_ROOT)):
            continue
        try:
            item = audit_editorial_metadata.yaml.safe_load(path.read_text(encoding="utf-8"))
        except audit_editorial_metadata.yaml.YAMLError:
            continue
        if not isinstance(item, dict) or not item.get("id"):
            continue
        if item.get("status") in {"draft", "review"}:
            paths.append(audit_editorial_metadata.display_path(path))
    return paths


def build_manifest(edition: str, report: dict[str, Any], blockers: list[str]) -> dict[str, Any]:
    incomplete = non_complete_paths(report)
    strict_blockers = audit_editorial_metadata.strict_issues(report)
    catalog_allowed = not strict_blockers and not incomplete
    study_allowed = not strict_blockers
    return {
        "schema": "aurea.editorial-publication.v1",
        "generated_at": datetime.now(timezone.utc).isoformat(),
        "edition": edition,
        "publication_allowed": study_allowed if edition == "study" else catalog_allowed,
        "catalog_release_allowed": catalog_allowed,
        "study_edition_allowed": study_allowed,
        "visible_editorial_states_required": True,
        "content_states": {
            "draft": report["by_status"]["draft"],
            "review": report["by_status"]["review"],
            "complete": report["by_status"]["complete"],
        },
        "strict_editorial_blockers": strict_blockers,
        "non_complete_items": incomplete,
        "publication_blockers": blockers,
        "publication_note": (
            "Edi\u00e7\u00e3o de estudo: exibir o estado editorial de cada ficha e n\u00e3o apresent\u00e1-la como cat\u00e1logo integral conclu\u00eddo."
            if edition == "study"
            else "Cat\u00e1logo integral: somente permitido quando todas as fichas estiverem complete e a auditoria estrita estiver aprovada."
        ),
    }


def markdown_summary(manifest: dict[str, Any]) -> str:
    states = manifest["content_states"]
    lines = [
        "# Barreira de publica\u00e7\u00e3o editorial",
        "",
        f"- Modalidade solicitada: `{manifest['edition']}`",
        f"- Publica\u00e7\u00e3o permitida: `{manifest['publication_allowed']}`",
        f"- Cat\u00e1logo integral permitido: `{manifest['catalog_release_allowed']}`",
        f"- Edi\u00e7\u00e3o de estudo permitida: `{manifest['study_edition_allowed']}`",
        f"- Estados obrigat\u00f3rios na apresenta\u00e7\u00e3o: `{manifest['visible_editorial_states_required']}`",
        f"- Fichas: draft={states['draft']}, review={states['review']}, complete={states['complete']}",
        f"- Itens n\u00e3o complete: {len(manifest['non_complete_items'])}",
        f"- Bloqueios editoriais estritos: {len(manifest['strict_editorial_blockers'])}",
        "",
    ]
    if manifest["publication_blockers"]:
        lines.extend(["## Bloqueios", ""])
        lines.extend(f"- {blocker}" for blocker in manifest["publication_blockers"])
        lines.append("")
    if manifest["non_complete_items"]:
        lines.extend(["## Fichas ainda em draft ou review", ""])
        lines.extend(f"- `{path}`" for path in manifest["non_complete_items"])
        lines.append("")
    return "\n".join(lines)


def main() -> int:
    parser = argparse.ArgumentParser(description="Valida a modalidade de publica\u00e7\u00e3o do acervo editorial.")
    parser.add_argument("--edition", choices=sorted(EDITIONS), required=True, help="study preserva fichas em andamento; catalog exige tudo complete.")
    parser.add_argument("--output", type=Path, help="Grava o manifesto JSON de publica\u00e7\u00e3o (inclusive quando bloqueado).")
    parser.add_argument("--summary", type=Path, help="Grava um resumo Markdown da decis\u00e3o.")
    args = parser.parse_args()

    report = audit_editorial_metadata.audit()
    strict_blockers = audit_editorial_metadata.strict_issues(report)
    incomplete = non_complete_paths(report)
    blockers = list(strict_blockers)
    if args.edition == "catalog" and incomplete:
        blockers.append(
            f"Cat\u00e1logo integral bloqueado: {len(incomplete)} fichas est\u00e3o em draft ou review; promova-as editorialmente antes de declarar completude."
        )

    manifest = build_manifest(args.edition, report, blockers)
    if args.output:
        args.output.parent.mkdir(parents=True, exist_ok=True)
        args.output.write_text(json.dumps(manifest, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
        print(f"Manifesto criado: {args.output}")
    if args.summary:
        args.summary.parent.mkdir(parents=True, exist_ok=True)
        args.summary.write_text(markdown_summary(manifest), encoding="utf-8")
        print(f"Resumo criado: {args.summary}")

    print(markdown_summary(manifest))
    return 0 if manifest["publication_allowed"] else 1


if __name__ == "__main__":
    raise SystemExit(main())
