"""Web V1 characterization tests for the certified astrology engine contract.

These checks intentionally describe current behavior. They use an impersonal
civil-time fixture that crosses a UTC date boundary and derive astronomical
reference values directly from Swiss Ephemeris rather than from UI strings.
"""

from __future__ import annotations

import hashlib
import json
import unittest

import swisseph as swe

from services.api.src.aurea_api.domain.astrology.engine import (
    ENGINE_NAME,
    ENGINE_VERSION,
    RECEIPT_SCHEMA_VERSION,
    calculate_astrology,
    calculate_transit_positions,
    to_julian_day,
)


FIXED_CIVIL_INPUT = {
    "year": 2000,
    "month": 1,
    "day": 1,
    "hour": 23.5,
    "lat": -23.5505,
    "lon": -46.6333,
    "timezone_name": "America/Sao_Paulo",
}
EXPECTED_UTC = "2000-01-02T01:30:00Z"
EXPECTED_OFFSET_MINUTES = -120


def _input_hash(payload: dict) -> str:
    canonical = json.dumps(
        payload,
        ensure_ascii=False,
        sort_keys=True,
        separators=(",", ":"),
        allow_nan=False,
    )
    return hashlib.sha256(canonical.encode("utf-8")).hexdigest()


class WebV1EngineContractTests(unittest.TestCase):
    def assert_certified_receipt(self, result: dict, kind: str, expected_input: dict) -> dict:
        self.assertNotIn("error", result, result.get("error"))
        receipt = result["meta"]["receipt"]

        self.assertEqual(receipt["schema_version"], RECEIPT_SCHEMA_VERSION)
        self.assertEqual(receipt["kind"], kind)
        self.assertEqual(receipt["engine"], {"name": ENGINE_NAME, "version": ENGINE_VERSION})
        self.assertEqual(receipt["input"], expected_input)
        self.assertEqual(receipt["input_hash"], _input_hash(expected_input))
        self.assertEqual(receipt["resolved_time"]["utc"], EXPECTED_UTC)
        self.assertEqual(receipt["resolved_time"]["iana_timezone"], "America/Sao_Paulo")
        self.assertEqual(receipt["resolved_time"]["utc_offset_minutes"], EXPECTED_OFFSET_MINUTES)
        self.assertEqual(receipt["zodiac"], "tropical")
        self.assertIsNone(receipt["ayanamsa"])
        self.assertEqual(receipt["ephemeris"]["library"], "pyswisseph")
        self.assertIsInstance(receipt["ephemeris"]["library_version"], str)
        self.assertTrue(receipt["ephemeris"]["library_version"])
        self.assertIsInstance(receipt["calculated_at_utc"], str)
        self.assertTrue(receipt["calculated_at_utc"].endswith("Z"))
        return receipt

    def test_natal_contract_preserves_certified_metadata_points_and_twelve_houses(self) -> None:
        result = calculate_astrology(house_system="Regiomontanus", **FIXED_CIVIL_INPUT)

        self.assertTrue(
            {"planets", "houses", "aspects", "meta"}.issubset(result),
            result.keys(),
        )
        self.assertEqual(result["meta"]["timestamp_utc"], EXPECTED_UTC)
        self.assertEqual(result["meta"]["location"], {"lat": -23.5505, "lon": -46.6333})
        self.assertEqual(result["meta"]["house_system"], "Regiomontanus")

        planets = result["planets"]
        for point in ("Sun", "Moon", "ASC", "MC"):
            self.assertIn(point, planets)
            self.assertIsInstance(planets[point]["degree"], float)

        expected_jd = to_julian_day(2000, 1, 2, 1.5)
        flags = swe.FLG_SWIEPH | swe.FLG_SPEED
        expected_sun = round(swe.calc(expected_jd, swe.SUN, flags)[0][0] % 360, 2)
        expected_moon = round(swe.calc(expected_jd, swe.MOON, flags)[0][0] % 360, 2)
        expected_cusps, expected_angles = swe.houses(
            expected_jd,
            FIXED_CIVIL_INPUT["lat"],
            FIXED_CIVIL_INPUT["lon"],
            b"R",
        )

        self.assertEqual(planets["Sun"]["degree"], expected_sun)
        self.assertEqual(planets["Moon"]["degree"], expected_moon)
        self.assertEqual(planets["ASC"]["degree"], round(expected_angles[0], 2))
        self.assertEqual(planets["MC"]["degree"], round(expected_angles[1], 2))

        houses = result["houses"]
        self.assertEqual(len(houses), 12)
        self.assertEqual([house["house"] for house in houses], list(range(1, 13)))
        self.assertEqual(
            [house["degree"] for house in houses],
            [round(cusp, 2) for cusp in expected_cusps],
        )
        self.assertIsInstance(result["aspects"], list)

        expected_input = {
            "year": 2000,
            "month": 1,
            "day": 1,
            "hour": 23.5,
            "lat": -23.5505,
            "lon": -46.6333,
            "timezone": "America/Sao_Paulo",
            "utc_offset_minutes": None,
            "house_system": "Regiomontanus",
        }
        receipt = self.assert_certified_receipt(result, "natal", expected_input)
        self.assertEqual(receipt["house_system"], "Regiomontanus")
        self.assertEqual(
            receipt["aspects"],
            {
                "include_minor": False,
                "orb_policy": "minimum-body-orb × aspect-multiplier",
            },
        )

    def test_transit_contract_preserves_certified_lightweight_envelope(self) -> None:
        result = calculate_transit_positions(include_asteroids=False, **FIXED_CIVIL_INPUT)

        self.assertEqual(set(result), {"planets", "secondary", "moon_phase", "meta"})
        self.assertEqual(result["meta"]["timestamp_utc"], EXPECTED_UTC)
        self.assertEqual(result["meta"]["location"], {"lat": -23.5505, "lon": -46.6333})
        self.assertEqual(result["meta"]["ephemeris"], "swiss")
        self.assertNotIn("houses", result)
        self.assertNotIn("aspects", result)
        self.assertNotIn("regence", result)

        expected_jd = to_julian_day(2000, 1, 2, 1.5)
        flags = swe.FLG_SWIEPH | swe.FLG_SPEED
        self.assertEqual(
            result["planets"]["Sun"]["degree"],
            round(swe.calc(expected_jd, swe.SUN, flags)[0][0] % 360, 2),
        )
        self.assertEqual(
            result["planets"]["Moon"]["degree"],
            round(swe.calc(expected_jd, swe.MOON, flags)[0][0] % 360, 2),
        )
        self.assertEqual(
            set(result["moon_phase"]),
            {"phase", "icon", "illumination"},
        )

        expected_input = {
            "year": 2000,
            "month": 1,
            "day": 1,
            "hour": 23.5,
            "lat": -23.5505,
            "lon": -46.6333,
            "timezone": "America/Sao_Paulo",
            "utc_offset_minutes": None,
            "include_asteroids": False,
        }
        receipt = self.assert_certified_receipt(result, "transit", expected_input)
        self.assertEqual(receipt["ephemeris"]["mode"], "swiss")
        self.assertNotIn("house_system", receipt)
        self.assertNotIn("aspects", receipt)


if __name__ == "__main__":
    unittest.main()
