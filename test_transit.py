#!/usr/bin/env python3
"""
Test for the transit position calculation function.
"""
import json
import sys
import os

# Add the current directory to Python path
sys.path.insert(0, os.path.dirname(__file__))

# Import the function we will implement
from astro_engine import calculate_transit_positions

def test_transit_basic():
    """Test that transit calculation returns expected structure without houses/aspects."""
    # Use a fixed date for reproducibility
    result = calculate_transit_positions(
        year=2026, month=3, day=26, hour=15.5,
        lat=-15.7833, lon=-47.9333,
        include_asteroids=False
    )
    
    # Should not have error
    assert "error" not in result, f"Unexpected error: {result.get('error')}"
    
    # Must have these keys
    assert "planets" in result, "Missing 'planets' key"
    assert "secondary" in result, "Missing 'secondary' key"
    assert "moon_phase" in result, "Missing 'moon_phase' key"
    assert "meta" in result, "Missing 'meta' key"
    
    # Must NOT have these keys (no houses, aspects, angles)
    assert "houses" not in result, "Unexpected 'houses' key"
    assert "aspects" not in result, "Unexpected 'aspects' key"
    assert "angles" not in result, "Unexpected 'angles' key"
    
    # Planets should include at least Sun and Moon
    planets = result["planets"]
    assert "Sun" in planets, "Missing Sun in planets"
    assert "Moon" in planets, "Missing Moon in planets"
    
    # Angles (ASC, MC, DSC, IC) must NOT be present
    assert "ASC" not in planets, "ASC should not be in planets"
    assert "MC" not in planets, "MC should not be in planets"
    assert "DSC" not in planets, "DSC should not be in planets"
    assert "IC" not in planets, "IC should not be in planets"
    
    # No planet should have a 'house' field
    for planet_name, planet_data in planets.items():
        assert "house" not in planet_data, f"Planet {planet_name} should not have 'house' field"
    
    # Secondary should contain only NorthNode when include_asteroids=False
    secondary = result["secondary"]
    allowed = {"NorthNode"}
    for key in secondary:
        assert key in allowed, f"Unexpected secondary body '{key}' when include_asteroids=False"
    
    # NorthNode should be present
    assert "NorthNode" in secondary, "Missing NorthNode in secondary"
    
    # No secondary body should have a 'house' field
    for sec_name, sec_data in secondary.items():
        assert "house" not in sec_data, f"Secondary body {sec_name} should not have 'house' field"
    
    print("PASS test_transit_basic")

def test_transit_with_asteroids():
    """Test that with include_asteroids=True we get more secondary bodies."""
    result = calculate_transit_positions(
        year=2026, month=3, day=26, hour=15.5,
        lat=-15.7833, lon=-47.9333,
        include_asteroids=True
    )
    
    assert "error" not in result
    planets = result["planets"]
    # Angles (ASC, MC, DSC, IC) must NOT be present
    assert "ASC" not in planets, "ASC should not be in planets"
    assert "MC" not in planets, "MC should not be in planets"
    assert "DSC" not in planets, "DSC should not be in planets"
    assert "IC" not in planets, "IC should not be in planets"
    
    # No planet should have a 'house' field
    for planet_name, planet_data in planets.items():
        assert "house" not in planet_data, f"Planet {planet_name} should not have 'house' field"
    
    secondary = result["secondary"]
    # Should have at least NorthNode, SouthNode, Lilith, PartOfFortune, Vertex
    # (depending on what calculate_astrology returns)
    # At least NorthNode should be present
    assert "NorthNode" in secondary, "Missing NorthNode in secondary"
    # Could have others, but we don't enforce exact list
    
    # No secondary body should have a 'house' field
    for sec_name, sec_data in secondary.items():
        assert "house" not in sec_data, f"Secondary body {sec_name} should not have 'house' field"
    
    print("PASS test_transit_with_asteroids")

if __name__ == "__main__":
    test_transit_basic()
    test_transit_with_asteroids()
    print("\nAll tests passed!")