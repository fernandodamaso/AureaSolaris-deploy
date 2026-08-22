#!/usr/bin/env python3
"""Run approved external-reference checks for the Aurea Solaris engine.

This runner deliberately does not manufacture expected positions.  A fixture
is only allowed to certify a calculation when it has an approved provenance
record and the reference values were copied from that record by a reviewer.
"""

from __future__ import annotations

import argparse
import json
import sys
from dataclasses import dataclass
from pathlib import Path
from typing import Any, Dict, Iterable, List, Tuple


REPOSITORY_ROOT = Path(__file__).resolve().parents[2]
DEFAULT_FIXTURES_DIR = Path(__file__).resolve().parent / "fixtures"
SCHEMA_VERSION = "engine-reference-fixture.v1"
ALLOWED_STATUSES = {"pending_reference", "approved_reference", "rejected_reference"}
DEFAULT_TOLERANCES = {"degree": 0.01, "house": 0.01, "orb": 0.01}

sys.path.insert(0, str(REPOSITORY_ROOT))
from services.api.src.aurea_api.domain.astrology.engine import (  # noqa: E402
    calculate_astrology,
    calculate_transit_positions,
)


class FixtureConfigurationError(ValueError):
    """A fixture does not meet the evidence contract."""


@dataclass
class RunSummary:
    passed: int = 0
    failed: int = 0
    skipped: int = 0
    invalid: int = 0


def _read_json(path: Path) -> Dict[str, Any]:
    try:
        value = json.loads(path.read_text(encoding="utf-8"))
    except json.JSONDecodeError as exc:
        raise FixtureConfigurationError(f"Invalid JSON: {exc}") from exc
    if not isinstance(value, dict):
        raise FixtureConfigurationError("Fixture root must be a JSON object.")
    return value


def _require_mapping(value: Any, field: str) -> Dict[str, Any]:
    if not isinstance(value, dict):
        raise FixtureConfigurationError(f"'{field}' must be an object.")
    return value


def validate_fixture(fixture: Dict[str, Any]) -> None:
    required = ("schema_version", "id", "status", "calculation", "input", "reference")
    missing = [field for field in required if field not in fixture]
    if missing:
        raise FixtureConfigurationError(f"Missing required field(s): {', '.join(missing)}.")
    if fixture["schema_version"] != SCHEMA_VERSION:
        raise FixtureConfigurationError(
            f"Unsupported schema_version {fixture['schema_version']!r}; expected {SCHEMA_VERSION!r}."
        )
    if not isinstance(fixture["id"], str) or not fixture["id"].strip():
        raise FixtureConfigurationError("'id' must be a non-empty string.")
    if fixture["status"] not in ALLOWED_STATUSES:
        raise FixtureConfigurationError(f"Unknown fixture status: {fixture['status']!r}.")
    if fixture["calculation"] not in {"natal", "transit"}:
        raise FixtureConfigurationError("'calculation' must be 'natal' or 'transit'.")

    inputs = _require_mapping(fixture["input"], "input")
    for field in ("year", "month", "day", "hour", "timezone"):
        if field not in inputs:
            raise FixtureConfigurationError(f"'input.{field}' is required.")
    if fixture["calculation"] == "natal":
        for field in ("lat", "lon", "house_system"):
            if field not in inputs:
                raise FixtureConfigurationError(f"'input.{field}' is required for natal fixtures.")

    reference = _require_mapping(fixture["reference"], "reference")
    if fixture["status"] == "pending_reference":
        if not isinstance(reference.get("pending_reason"), str) or not reference["pending_reason"].strip():
            raise FixtureConfigurationError("Pending fixtures require 'reference.pending_reason'.")
        return

    if fixture["status"] == "rejected_reference":
        return

    for field in ("provider", "reference_url_or_id", "captured_at", "approved_by", "approved_at", "expected"):
        if field not in reference:
            raise FixtureConfigurationError(f"Approved fixtures require 'reference.{field}'.")
    expected = _require_mapping(reference["expected"], "reference.expected")
    if not any(expected.get(key) for key in ("planets", "houses", "aspects")):
        raise FixtureConfigurationError("Approved fixtures need at least one expected planet, house, or aspect.")


def _tolerances(fixture: Dict[str, Any]) -> Dict[str, float]:
    supplied = fixture.get("tolerances", {})
    if not isinstance(supplied, dict):
        raise FixtureConfigurationError("'tolerances' must be an object when present.")
    values = dict(DEFAULT_TOLERANCES)
    for key in values:
        if key in supplied:
            value = supplied[key]
            if not isinstance(value, (float, int)) or value <= 0:
                raise FixtureConfigurationError(f"'tolerances.{key}' must be a positive number.")
            values[key] = float(value)
    return values


def angular_distance(first: float, second: float) -> float:
    """Smallest circular distance in degrees (0° and 360° are equivalent)."""
    return abs((float(first) - float(second) + 180.0) % 360.0 - 180.0)


def _run_engine(fixture: Dict[str, Any]) -> Dict[str, Any]:
    inputs = fixture["input"]
    common = {
        "year": int(inputs["year"]),
        "month": int(inputs["month"]),
        "day": int(inputs["day"]),
        "hour": float(inputs["hour"]),
        "timezone_name": str(inputs["timezone"]),
        "utc_offset_minutes": inputs.get("utc_offset_minutes"),
    }
    if fixture["calculation"] == "natal":
        return calculate_astrology(
            **common,
            lat=float(inputs["lat"]),
            lon=float(inputs["lon"]),
            house_system=str(inputs["house_system"]),
        )
    return calculate_transit_positions(
        **common,
        lat=float(inputs["lat"]) if inputs.get("lat") is not None else None,
        lon=float(inputs["lon"]) if inputs.get("lon") is not None else None,
        include_asteroids=bool(inputs.get("include_asteroids", False)),
    )


def _expected_degree(value: Any, label: str) -> Tuple[float, Dict[str, Any]]:
    if isinstance(value, (float, int)):
        return float(value), {}
    mapping = _require_mapping(value, label)
    if "degree" not in mapping or not isinstance(mapping["degree"], (float, int)):
        raise FixtureConfigurationError(f"'{label}.degree' must be numeric.")
    return float(mapping["degree"]), mapping


def _aspect_key(aspect: Dict[str, Any]) -> Tuple[str, str, str]:
    try:
        first, second = sorted((str(aspect["p1"]), str(aspect["p2"])))
        return first, second, str(aspect["type"])
    except KeyError as exc:
        raise FixtureConfigurationError(f"Aspect is missing {exc.args[0]!r}.") from exc


def _compare_planets(expected: Dict[str, Any], actual: Dict[str, Any], tolerance: float) -> List[str]:
    failures: List[str] = []
    for name, expected_value in expected.items():
        expected_degree, expected_fields = _expected_degree(expected_value, f"reference.expected.planets.{name}")
        observed = actual.get(name)
        if not isinstance(observed, dict):
            failures.append(f"planet {name}: absent from engine result")
            continue
        observed_degree = observed.get("degree")
        if not isinstance(observed_degree, (float, int)):
            failures.append(f"planet {name}: engine degree missing")
            continue
        delta = angular_distance(observed_degree, expected_degree)
        if delta > tolerance:
            failures.append(
                f"planet {name}: Δ {delta:.6f}° exceeds {tolerance:.6f}° "
                f"(engine {observed_degree}, reference {expected_degree})"
            )
        if "house" in expected_fields and observed.get("house") != expected_fields["house"]:
            failures.append(
                f"planet {name}: house {observed.get('house')!r} differs from reference {expected_fields['house']!r}"
            )
    return failures


def _compare_houses(expected: Dict[str, Any], actual_houses: Iterable[Dict[str, Any]], tolerance: float) -> List[str]:
    failures: List[str] = []
    observed_by_number = {str(house.get("house")): house for house in actual_houses if isinstance(house, dict)}
    for number, expected_value in expected.items():
        expected_degree, _ = _expected_degree(expected_value, f"reference.expected.houses.{number}")
        observed = observed_by_number.get(str(number))
        if not observed:
            failures.append(f"house {number}: absent from engine result")
            continue
        observed_degree = observed.get("degree")
        if not isinstance(observed_degree, (float, int)):
            failures.append(f"house {number}: engine degree missing")
            continue
        delta = angular_distance(observed_degree, expected_degree)
        if delta > tolerance:
            failures.append(
                f"house {number}: Δ {delta:.6f}° exceeds {tolerance:.6f}° "
                f"(engine {observed_degree}, reference {expected_degree})"
            )
    return failures


def _compare_aspects(expected: List[Any], actual: Iterable[Dict[str, Any]], tolerance: float) -> List[str]:
    failures: List[str] = []
    expected_by_key: Dict[Tuple[str, str, str], Dict[str, Any]] = {}
    for value in expected:
        aspect = _require_mapping(value, "reference.expected.aspects[]")
        key = _aspect_key(aspect)
        if key in expected_by_key:
            raise FixtureConfigurationError(f"Duplicate expected aspect: {' / '.join(key)}")
        expected_by_key[key] = aspect

    actual_by_key: Dict[Tuple[str, str, str], Dict[str, Any]] = {}
    for aspect in actual:
        if isinstance(aspect, dict):
            actual_by_key[_aspect_key(aspect)] = aspect

    for key, expected_aspect in expected_by_key.items():
        observed = actual_by_key.get(key)
        label = " / ".join(key)
        if observed is None:
            failures.append(f"aspect {label}: absent from engine result")
            continue
        if "orb" in expected_aspect:
            expected_orb = expected_aspect["orb"]
            observed_orb = observed.get("orb")
            if not isinstance(expected_orb, (float, int)) or not isinstance(observed_orb, (float, int)):
                failures.append(f"aspect {label}: orb must be numeric in both reference and engine result")
            elif abs(float(observed_orb) - float(expected_orb)) > tolerance:
                failures.append(
                    f"aspect {label}: orb Δ {abs(float(observed_orb) - float(expected_orb)):.6f}° exceeds {tolerance:.6f}°"
                )
        if "applying" in expected_aspect and observed.get("applying") != expected_aspect["applying"]:
            failures.append(f"aspect {label}: applying state differs from reference")

    extras = sorted(set(actual_by_key) - set(expected_by_key))
    for key in extras:
        failures.append(f"unexpected engine aspect: {' / '.join(key)}")
    return failures


def compare_fixture(fixture: Dict[str, Any]) -> List[str]:
    result = _run_engine(fixture)
    if "error" in result:
        return [f"engine returned an explicit error: {result['error']}"]

    expected = fixture["reference"]["expected"]
    tolerance = _tolerances(fixture)
    failures: List[str] = []
    if "planets" in expected:
        failures.extend(_compare_planets(_require_mapping(expected["planets"], "reference.expected.planets"), result.get("planets", {}), tolerance["degree"]))
    if "houses" in expected:
        failures.extend(_compare_houses(_require_mapping(expected["houses"], "reference.expected.houses"), result.get("houses", []), tolerance["house"]))
    if "aspects" in expected:
        if not isinstance(expected["aspects"], list):
            raise FixtureConfigurationError("'reference.expected.aspects' must be an array.")
        failures.extend(_compare_aspects(expected["aspects"], result.get("aspects", []), tolerance["orb"]))
    return failures


def fixture_paths(fixtures_dir: Path) -> List[Path]:
    paths = sorted(fixtures_dir.glob("*.json"))
    if not paths:
        raise FixtureConfigurationError(f"No JSON fixtures found in {fixtures_dir}.")
    return paths


def run(fixtures_dir: Path, require_approved: bool) -> int:
    summary = RunSummary()
    for path in fixture_paths(fixtures_dir):
        try:
            fixture = _read_json(path)
            validate_fixture(fixture)
        except FixtureConfigurationError as exc:
            summary.invalid += 1
            print(f"[INVALID] {path.name}: {exc}")
            continue

        fixture_id = fixture["id"]
        status = fixture["status"]
        if status == "pending_reference":
            summary.skipped += 1
            print(f"[SKIP] {fixture_id}: pending external reference — {fixture['reference']['pending_reason']}")
            continue
        if status == "rejected_reference":
            summary.skipped += 1
            print(f"[SKIP] {fixture_id}: reference explicitly rejected")
            continue

        try:
            failures = compare_fixture(fixture)
        except FixtureConfigurationError as exc:
            summary.invalid += 1
            print(f"[INVALID] {fixture_id}: {exc}")
            continue
        if failures:
            summary.failed += 1
            print(f"[FAIL] {fixture_id}")
            for failure in failures:
                print(f"       - {failure}")
        else:
            summary.passed += 1
            print(f"[PASS] {fixture_id}")

    print(
        f"Reference certification: {summary.passed} passed, {summary.failed} failed, "
        f"{summary.skipped} skipped, {summary.invalid} invalid."
    )
    if summary.failed or summary.invalid:
        return 1
    if require_approved and summary.passed == 0:
        print("[FAIL] No approved external-reference fixture ran; certification cannot be claimed.")
        return 1
    return 0


def main() -> int:
    parser = argparse.ArgumentParser(description="Compare the engine only against approved reference fixtures.")
    parser.add_argument("--fixtures-dir", type=Path, default=DEFAULT_FIXTURES_DIR)
    parser.add_argument(
        "--require-approved",
        action="store_true",
        help="Fail when no approved reference fixture runs (recommended for certification CI).",
    )
    args = parser.parse_args()
    try:
        return run(args.fixtures_dir, args.require_approved)
    except FixtureConfigurationError as exc:
        print(f"[INVALID] {exc}")
        return 1


if __name__ == "__main__":
    raise SystemExit(main())
