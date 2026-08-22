"""Regression checks for the UTC instant signed by the Aurea engine.

The fixture is deliberately impersonal.  It crosses midnight when converted
from America/Sao_Paulo to UTC, the case that previously produced a Julian Day
with the correct UTC hour on the wrong civil date.
"""

from __future__ import annotations

import math
import unittest

import swisseph as swe

from services.api.src.aurea_api.domain.astrology.engine import (
    calculate_astrology,
    calculate_transit_positions,
    to_julian_day,
)


UTC_BOUNDARY_INPUT = {
    "year": 2000,
    "month": 1,
    "day": 1,
    "hour": 23.5,
    "lat": -23.5505,
    "lon": -46.6333,
    "timezone_name": "America/Sao_Paulo",
}


class UtcBoundaryRegressionTests(unittest.TestCase):
    def assert_uses_resolved_utc_instant(self, result: dict) -> None:
        self.assertNotIn("error", result, result.get("error"))
        receipt = result["meta"]["receipt"]
        self.assertEqual("2000-01-02T01:30:00Z", receipt["resolved_time"]["utc"])

        expected_jd = to_julian_day(2000, 1, 2, 1.5)
        self.assertTrue(math.isclose(result["meta"]["jd"], round(expected_jd, 6), abs_tol=1e-6))

        # Compare the returned solar longitude with the same Swiss Ephemeris
        # instant.  This is an engine invariant, not an invented reference.
        expected_sun = swe.calc(expected_jd, swe.SUN, swe.FLG_SWIEPH | swe.FLG_SPEED)[0][0] % 360
        observed_sun = result["planets"]["Sun"]["degree"]
        self.assertLess(abs((observed_sun - expected_sun + 180) % 360 - 180), 0.011)

    def test_natal_uses_utc_date_when_local_time_crosses_midnight(self) -> None:
        result = calculate_astrology(house_system="Regiomontanus", **UTC_BOUNDARY_INPUT)
        self.assert_uses_resolved_utc_instant(result)

    def test_transit_uses_utc_date_when_local_time_crosses_midnight(self) -> None:
        result = calculate_transit_positions(include_asteroids=False, **UTC_BOUNDARY_INPUT)
        self.assert_uses_resolved_utc_instant(result)


if __name__ == "__main__":
    unittest.main()
