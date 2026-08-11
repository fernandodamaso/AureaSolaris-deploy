# Astrological knowledge contract

Status: installed on August 11, 2026.

This document installs the mother-guidelines that connect the Engenharia Astrológica corpus to the Aurea Solaris engine and `knowledge.sqlite`.

## Purpose

The astrology engine must calculate and explain according to an identified school, not according to an invisible mixture of traditions.

The editorial corpus remains plural:

- historical doctrine stays historical;
- modern reinterpretation stays modern;
- divergences remain visible;
- notes, myths, etymologies, curiosities, magic, alchemy, Cabala, karmic and systemic layers remain available for study when documented;
- source traditions are not neutralized: physical-appearance doctrines, karmic language, archetypes, myths and historical or contemporary beliefs are preserved in their actual terms, with real sources, school/period, internal rationale, variants and disagreements;
- contextualization labels a claim without suppressing it, while absence of attribution must remain explicit and must never be repaired with an invented source;
- non-canonical or disputed material never silently replaces the selected rule.

## Canonical rules

1. Every computational rule must expose school, variant, source, parameters, and reproducible receipt.
2. Contradictory traditions are first-class data, not noise to be flattened.
3. The engine must never widen orbs, change house systems, swap ephemerides, or invent positions silently.
4. A note of study is not the same thing as a default engine rule.
5. Source uncertainty must return `audit_required` or `unknown`, never fabricated certainty.

## Body-domain invariants

- The Sun can never be feral.
- The Sun can never be retrograde, combust, or cazimi.
- The Moon can never be retrograde.
- ASC, MC, DSC, and IC do not receive planetary states.
- Fast/slow classifications require an identified school reference.
- When a state cannot be justified by the selected lineage, the engine must expose uncertainty instead of guessing.

## School and variant selection

When the tradition offers real alternatives, the user must be able to choose them explicitly. This applies especially to:

- house systems;
- orb policies;
- lot formulas;
- dignity tables;
- predictive variants;
- modern versus traditional interpretive layers.

If no choice is recorded, the engine may use only an explicitly approved default and must show it.

## Editability and workflow

Yes: the material remains editable inside Aurea Solaris.

Current rule:

- the contract files in this repository are editable documentation and implementation guidance;
- the imported knowledge in `knowledge.sqlite` must remain provenance-based and versioned;
- until a bidirectional editorial importer exists, manual review and snapshot-based sync remain the safe path;
- the vendored Engenharia Astrológica corpus under `knowledge/engenharia_astrologica/` is the local editorial mother-source inside this repository, while any external Desktop copy is only a legacy mirror.

This keeps the project editable without letting silent drift corrupt the canonical corpus.

## Installed machine-readable contract

See [docs/data/knowledge_contract_aurea_solaris.yaml](data/knowledge_contract_aurea_solaris.yaml).
