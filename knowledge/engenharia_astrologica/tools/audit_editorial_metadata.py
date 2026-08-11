"""Audita metadados editoriais do corpus sem alterar os YAMLs de origem.

O relatório separa qualidade técnica do YAML de completude documental. Ele não
decide se uma tradição é válida nem remove associações: apenas torna explícito
o que impede uma ficha de sustentar o status ``complete``.
"""

from __future__ import annotations

import argparse
from collections import defaultdict
from pathlib import Path
from typing import Any

import yaml


PROJECT_ROOT = Path(__file__).resolve().parents[1]
SOURCE_ROOT = PROJECT_ROOT / "docs"
ALLOWED_STATUS = {"draft", "review", "complete"}
PLACEHOLDER = "Estrutura organizadora, catálogo, guia de consulta"
REFERENCE_BUCKETS = ("primarias", "secundarias", "tecnicas")
SUBSTANTIVE_FIELDS = {
    "essencia",
    "definicao",
    "tema",
    "fundamento",
    "procedimento",
    "significados",
    "calculo",
    "mecanica",
    "uso_interpretativo",
    "interpretacao",
    "correspondencias",
}


def is_template(path: Path) -> bool:
    return "template" in path.name.casefold()


def has_content(value: Any) -> bool:
    """Retorna se o valor contém uma declaração editorial efetiva."""
    if isinstance(value, str):
        return bool(value.strip())
    if isinstance(value, dict):
        return any(has_content(child) for child in value.values())
    if isinstance(value, (list, tuple, set)):
        return any(has_content(child) for child in value)
    return value is not None


def has_declared_tradition(item: dict[str, Any]) -> bool:
    return has_content(item.get("tradicao_primaria")) or has_content(item.get("tradicoes"))


def is_substantive_content(item: dict[str, Any]) -> bool:
    """Distingue uma ficha de conteúdo de um índice ou documento de apoio.

    Registros neutros podem declarar ``exige_tradicao: false``; nesse caso a
    justificativa é obrigatória e a ausência de tradição não é contabilizada.
    """
    if item.get("exige_tradicao") is False:
        return False
    return bool(item.get("tipo")) or any(field in item for field in SUBSTANTIVE_FIELDS)


def has_tradition_exemption_reason(item: dict[str, Any]) -> bool:
    return has_content(item.get("justificativa_sem_tradicao"))


def is_formal_reference(reference: Any) -> bool:
    """Aceita uma citação estruturada ou uma citação textual identificável.

    O formato preferido é uma lista de objetos com ``autor`` e ``obra``. As
    listas históricas em buckets (primárias/secundárias/técnicas) continuam
    aceitas durante a migração, desde que sejam citações textuais não vazias e
    não meros marcadores de pendência.
    """
    if isinstance(reference, dict):
        return has_content(reference.get("autor")) and has_content(reference.get("obra"))
    if isinstance(reference, str):
        normalized = reference.strip().casefold()
        pending_prefixes = ("adicionar", "a definir", "pendente", "revisar", "consultar")
        return len(normalized) >= 12 and not normalized.startswith(pending_prefixes)
    return False


def iter_references(item: dict[str, Any]) -> list[Any]:
    references = item.get("referencias")
    if isinstance(references, list):
        return references
    if isinstance(references, dict):
        entries: list[Any] = []
        for bucket in REFERENCE_BUCKETS:
            value = references.get(bucket)
            if isinstance(value, list):
                entries.extend(value)
            elif value is not None:
                entries.append(value)
        return entries
    return []


def has_formal_references(item: dict[str, Any]) -> bool:
    return any(is_formal_reference(reference) for reference in iter_references(item))


def source_pending_reasons(item: dict[str, Any]) -> list[str]:
    """Lê pendências explícitas, inclusive no formato transitório em referências."""
    reasons: list[str] = []
    if has_content(item.get("pendencias_de_fonte")):
        reasons.append("pendencias_de_fonte")
    references = item.get("referencias")
    if isinstance(references, dict) and has_content(references.get("pendencias_de_fonte")):
        reasons.append("referencias.pendencias_de_fonte")
    return reasons


def display_path(path: Path) -> str:
    return path.relative_to(PROJECT_ROOT).as_posix()


def audit() -> dict[str, Any]:
    report: dict[str, Any] = {
        "items": 0,
        "templates": 0,
        "by_status": defaultdict(int),
        "missing_status": [],
        "invalid_status": [],
        "substantive_without_tradition": [],
        "tradition_exemption_without_reason": [],
        "complete_without_formal_references": [],
        "review_without_formal_references": [],
        "source_pending": [],
        "complete_with_source_pending": [],
        "placeholder_atlas": [],
        "complete_with_placeholder_atlas": [],
        "yaml_errors": [],
    }

    for path in sorted(SOURCE_ROOT.rglob("*.yaml")):
        if is_template(path.relative_to(SOURCE_ROOT)):
            report["templates"] += 1
            continue
        try:
            item = yaml.safe_load(path.read_text(encoding="utf-8"))
        except yaml.YAMLError as error:
            report["yaml_errors"].append(f"{display_path(path)} — {error}")
            continue
        if not isinstance(item, dict) or not item.get("id"):
            continue

        report["items"] += 1
        item_path = display_path(path)
        status = item.get("status")
        if status is None:
            report["missing_status"].append(item_path)
        elif status not in ALLOWED_STATUS:
            report["invalid_status"].append(f"{item_path} — {status!r}")
        else:
            report["by_status"][status] += 1

        if item.get("exige_tradicao") is False and not has_tradition_exemption_reason(item):
            report["tradition_exemption_without_reason"].append(item_path)
        elif is_substantive_content(item) and not has_declared_tradition(item):
            report["substantive_without_tradition"].append(item_path)
        if status == "complete" and not has_formal_references(item):
            report["complete_without_formal_references"].append(item_path)
        if status == "review" and not has_formal_references(item):
            report["review_without_formal_references"].append(item_path)
        pending_reasons = source_pending_reasons(item)
        if pending_reasons:
            report["source_pending"].append(f"{item_path} — {', '.join(pending_reasons)}")
            if status == "complete":
                report["complete_with_source_pending"].append(item_path)
        atlas = item.get("atlas_simbolico")
        is_placeholder_atlas = isinstance(atlas, dict) and (
            atlas.get("placeholder") is True
            or atlas.get("pessoas_arquetipos") == PLACEHOLDER
        )
        if is_placeholder_atlas:
            report["placeholder_atlas"].append(item_path)
            if status == "complete":
                report["complete_with_placeholder_atlas"].append(item_path)

    return report


def strict_issues(report: dict[str, Any]) -> list[str]:
    """Pendências que impedem aprovação editorial quando --strict é usado."""
    issues: list[str] = []
    issues.extend(f"YAML inválido — {entry}" for entry in report["yaml_errors"])
    issues.extend(f"Status ausente — {entry}" for entry in report["missing_status"])
    issues.extend(f"Status inválido — {entry}" for entry in report["invalid_status"])
    issues.extend(
        f"Conteúdo substantivo sem tradição declarada — {entry}"
        for entry in report["substantive_without_tradition"]
    )
    issues.extend(
        f"Isenção de tradição sem justificativa — {entry}"
        for entry in report["tradition_exemption_without_reason"]
    )
    issues.extend(
        f"Complete sem referências formais — {entry}"
        for entry in report["complete_without_formal_references"]
    )
    issues.extend(
        f"Complete com pendência de fonte — {entry}"
        for entry in report["complete_with_source_pending"]
    )
    return issues


def markdown_report(report: dict[str, Any]) -> str:
    blockers = strict_issues(report)
    lines = [
        "# Auditoria de metadados editoriais",
        "",
        "Esta auditoria não altera fontes, não julga tradições e não remove associações. Ela identifica pendências documentais para revisão.",
        "",
        "## Resumo",
        "",
        f"- Fichas com id: {report['items']}",
        f"- Templates excluídos: {report['templates']}",
        f"- Status: draft={report['by_status']['draft']}, review={report['by_status']['review']}, complete={report['by_status']['complete']}",
        f"- Sem status: {len(report['missing_status'])}",
        f"- Conteúdo substantivo sem tradição declarada: {len(report['substantive_without_tradition'])}",
        f"- Complete sem referências formais: {len(report['complete_without_formal_references'])}",
        f"- Review sem referências formais: {len(report['review_without_formal_references'])}",
        f"- Fichas com pendências de fonte declaradas: {len(report['source_pending'])}",
        f"- Complete com pendência de fonte: {len(report['complete_with_source_pending'])}",
        f"- Fichas com atlas-placeholder: {len(report['placeholder_atlas'])}",
        f"- Erros de YAML: {len(report['yaml_errors'])}",
        f"- Bloqueios em modo estrito: {len(blockers)}",
    ]

    if blockers:
        lines.extend([
            "",
            "## Bloqueios para publicação (`--strict`)",
            "",
            "Uma ficha `complete` não pode ficar sem referência formal, com pendência de fonte ou sem tradição declarada. "
            "O modo estrito também bloqueia status ausente/inválido e YAML inválido.",
            "",
        ])
        lines.extend(f"- **{entry}**" for entry in blockers)

    sections = [
        ("Sem status", report["missing_status"]),
        ("Status inválido", report["invalid_status"]),
        ("Conteúdo substantivo sem tradição primária", report["substantive_without_tradition"]),
        ("Isenção de tradição sem justificativa", report["tradition_exemption_without_reason"]),
        ("Complete sem referências formais", report["complete_without_formal_references"]),
        ("Review sem referências formais", report["review_without_formal_references"]),
        ("Pendências de fonte declaradas", report["source_pending"]),
        ("Complete com pendência de fonte", report["complete_with_source_pending"]),
        ("Atlas-placeholder", report["placeholder_atlas"]),
        ("Complete com atlas-placeholder", report["complete_with_placeholder_atlas"]),
        ("Erros de YAML", report["yaml_errors"]),
    ]
    for title, entries in sections:
        if not entries:
            continue
        lines.extend(["", f"## {title}", ""])
        lines.extend(f"- `{entry}`" for entry in entries)
    return "\n".join(lines) + "\n"


def main() -> int:
    parser = argparse.ArgumentParser(description="Audita metadados editoriais do corpus.")
    parser.add_argument("--output", type=Path, help="Caminho opcional do relatório Markdown.")
    parser.add_argument(
        "--targets-complete-without-references",
        action="store_true",
        help="Imprime apenas os caminhos de fichas complete sem referências formais; não altera status.",
    )
    parser.add_argument(
        "--strict",
        action="store_true",
        help="Retorna falha para pendências que impedem aprovação editorial.",
    )
    args = parser.parse_args()

    report = audit()
    if args.targets_complete_without_references:
        targets = report["complete_without_formal_references"]
        if targets:
            print("\n".join(targets))
        return 0
    text = markdown_report(report)
    if args.output:
        args.output.parent.mkdir(parents=True, exist_ok=True)
        args.output.write_text(text, encoding="utf-8")
        print(f"Relatório criado: {args.output}")
    else:
        print(text)
    return 1 if report["yaml_errors"] or (args.strict and strict_issues(report)) else 0


if __name__ == "__main__":
    raise SystemExit(main())
