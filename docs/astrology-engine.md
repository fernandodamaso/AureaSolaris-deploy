# Astrology Engine

> Python-based calculations using kerykeion and NASA ephemeris.
> **Ownership:** This is the ONLY source for engine details.

## Overview

The astrology engine is a Python script (`astro_engine.py`) that runs as a subprocess called by Rust via Tauri.

**Key files:**
- `astro_engine.py` — Main engine script
- `de421.bsp` — NASA Swiss Ephemeris data
- `astro_data.json` — Cache of latest calculations

## Rust-Python Integration

Command `run_astro_engine` in `src-tauri/src/lib.rs`:

```rust
#[tauri::command]
async fn run_astro_engine(payload: Option<String>) -> Result<String, String> {
    use std::path::PathBuf;
    use std::process::Command;
    let project_root = PathBuf::from("C:\\AureaSolaris");
    let astro_path = project_root.join("astro_engine.py");
    let mut cmd = Command::new("python.exe");
    cmd.arg(astro_path);
    if let Some(p) = payload {
        cmd.arg(p);
    }
    let output = cmd.output().map_err(|e| format!("Command failed: {}", e))?;
    // ... process output
}
```

**Flow:**
1. Frontend calls `safeInvoke('run_astro_engine', payload)`
2. Rust executes `python.exe astro_engine.py` with JSON payload
3. Python calculates and prints JSON to stdout
4. Rust captures stdout and returns to React

## Calculation Functions

| Function | Description |
|----------|-------------|
| `calculate_astrology` | Calculates planets, aspects, and rulers |
| `calculate_transit_positions` | Current planetary positions (no houses/aspects) |
| `get_aspects` | Dynamic aspect detection with configurable orbs |
| `get_planetary_hour` | Chaldean order planetary hours (24 hours) |

## House Systems

Configurable via `house_system` parameter:

| Code | System | Description |
|------|--------|-------------|
| `R` | Regiomontanus | Default. Cusps at meridian-equator intersection |
| `P` | Placidus | Most common worldwide |
| `K` | Koch | Based on diurnal motions |
| `O` | Porphyrius | Equal zodiac arc divisions |
| `C` | Campanus | Based on quadrant divisions |
| `W` | Whole Sign | Houses defined by complete sign |

## Celestial Bodies

Beyond the 10 classical planets:

| Body | Description | Formula |
|------|-------------|---------|
| North Node (☊) | Lunar North Node | Moon - 180° |
| South Node (☋) | Lunar South Node | Moon + 180° |
| Lilith (⚸) | Black Moon Lilith | Moon + 180° |
| Part of Fortune (⊙) | Fortune Point | ASC + Moon - Sun |
| Vertex (Vx) | Fictitious Point | ASC + 60° (approx) |
| Chiron (⚷) | Centaur | Via kerykeion |

## Aspects

| Aspect | Angle | Orb | Type |
|--------|-------|-----|------|
| Conjunction ☌ | 0° | 8° | Major |
| Opposition ☍ | 180° | 8° | Major |
| Trine △ | 120° | 8° | Major |
| Square □ | 90° | 6° | Major |
| Sextile ＊ | 60° | 4° | Minor |
| Inconjunct ☽ | 150° | 3° | Minor |
| Quintil ℍ | 72° | 3° | Minor |
| Bi-Quintil ℎ | 144° | 3° | Minor |
| Semi-Sextil ⚹ | 30° | 2° | Minor |
| Semi-Square ∠ | 45° | 2° | Minor |

Each aspect includes `applying` (converging) or `separating` (diverging) indicator.

## Zodiac Wheel Convention

Western astrology standard (compatible with AstroChart, astro-seek.com, Solar Fire):

| Point | Position |
|-------|----------|
| 0° Aries | 9 o'clock (left) |
| 0° Cancer | 12 o'clock (top) |
| 0° Libra | 3 o'clock (right) |
| 0° Capricorn | 6 o'clock (bottom) |

- **Direction:** Counter-clockwise (Western standard)
- **Conversion formula:** `(180 - angle) * PI/180`
- **ASC rotation:** In `MandalaChart.tsx`, wheel rotates so ASC is always at 9 o'clock

## Fallback Engine (TypeScript)

When Tauri/Python unavailable, `src/utils/astro-calc.ts` provides approximations (±1-2°):

```typescript
import { calculateFallback } from '../utils/astro-calc';

const result = await calculateFallback(
  2026, 3, 25, 14, 30,  // year, month, day, hour, minute
  -15.7833,              // latitude
  -47.9333,              // longitude
  'Regiomontanus'        // house system
);
```

## Related Documentation

- [tauri-ipc-api.md](tauri-ipc-api.md) — run_astro_engine command
- [estrutura-do-projeto.md](estrutura-do-projeto.md) (PT) — Folder structure