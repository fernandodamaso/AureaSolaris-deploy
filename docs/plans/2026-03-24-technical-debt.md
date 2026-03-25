# Priority 2 — Technical Debt: Google Calendar, PKCE Security, Hardcoded Paths

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Complete the Google Calendar integration stubs, fix the insecure PKCE hash implementation, and remove hardcoded Windows paths from the Rust backend.

**Architecture:** Reuse the existing Google Drive OAuth2 token infrastructure (`google_tokens.json`, `load_tokens`, `save_tokens`) for Calendar API calls. Replace `DefaultHasher` with proper SHA-256 via the `sha2` crate. Extract hardcoded paths into a helper function that resolves the project root dynamically.

**Tech Stack:** Rust, reqwest (already in deps), sha2 crate (new), base64 crate (new), Google Calendar API v3

---

## Context & Discoveries

- `add_google_event` and `delete_google_event` (lib.rs:422-442) are stubs returning JSON with `"status": "stub"`.
- `get_google_events` (lib.rs:445-454) returns hardcoded mock data.
- Google Drive OAuth2 is fully working: `google_drive_connect` does PKCE flow, tokens saved to `google_tokens.json`. The `load_tokens`/`save_tokens` helpers and `GoogleTokens` struct are reusable.
- The PKCE `generate_code_challenge` (lib.rs:871-880) uses `DefaultHasher` (non-cryptographic) instead of SHA-256. This is a security issue — Google may reject the challenge.
- `run_astro_engine` (lib.rs:628) and `run_agm_engine` (lib.rs:657) hardcode `C:\AureaSolaris`. `list_lab_files` (lib.rs:600) also hardcodes it.
- The `google_drive_connect` handler already requests `drive.file` scope. Calendar needs `calendar` scope — the OAuth2 flow needs to request both scopes.
- Cargo.toml has `reqwest` with `json` and `rustls-tls` features — sufficient for Calendar API calls.
- No `sha2` or `base64` crate in Cargo.toml yet.

---

## File Structure

### Files to Modify
| File | Change |
|------|--------|
| `src-tauri/Cargo.toml` | Add `sha2` and `base64` dependencies |
| `src-tauri/src/lib.rs` | Implement Calendar commands, fix PKCE, extract path helper |

### Files to Create
None — all changes go into existing files.

---

## Task 1: Add sha2 and base64 Crates

**Files:**
- Modify: `C:\AureaSolaris\src-tauri\Cargo.toml`

- [ ] **Step 1: Add dependencies to Cargo.toml**

Add after the existing `[dependencies]` entries:
```toml
sha2 = "0.10"
base64 = "0.22"
```

- [ ] **Step 2: Verify it compiles**

```bash
cd src-tauri && cargo check
```
Expected: compiles without errors (may take a minute on first run)

- [ ] **Step 3: Commit**

```bash
git add src-tauri/Cargo.toml src-tauri/Cargo.lock
git commit -m "chore: add sha2 and base64 crates for secure PKCE"
```

---

## Task 2: Fix PKCE Code Challenge (Security)

**Files:**
- Modify: `C:\AureaSolaris\src-tauri\src\lib.rs` (lines 871-896)

- [ ] **Step 1: Replace generate_code_challenge with proper SHA-256**

Replace the existing `generate_code_challenge` function (lib.rs:871-880):

```rust
fn generate_code_challenge(verifier: &str) -> String {
    use sha2::{Sha256, Digest};
    let mut hasher = Sha256::new();
    hasher.update(verifier.as_bytes());
    let hash = hasher.finalize();
    base64_url_encode(&hash)
}
```

- [ ] **Step 2: Replace base64_url_encode with proper base64**

Replace the existing `base64_url_encode` function (lib.rs:882-896):

```rust
fn base64_url_encode(data: &[u8]) -> String {
    use base64::Engine;
    base64::engine::general_purpose::URL_SAFE_NO_PAD.encode(data)
}
```

- [ ] **Step 3: Verify it compiles**

```bash
cd src-tauri && cargo check
```
Expected: compiles without errors

- [ ] **Step 4: Commit**

```bash
git add src-tauri/src/lib.rs
git commit -m "fix(security): replace DefaultHasher with SHA-256 for PKCE code challenge"
```

---

## Task 3: Extract Hardcoded Project Root Path

**Files:**
- Modify: `C:\AureaSolaris\src-tauri\src\lib.rs` (lines 600, 628, 657)

- [ ] **Step 1: Add a helper function for project root**

Add near the top of lib.rs (after the existing `get_assets_path` helper around line 105):

```rust
fn get_project_root() -> PathBuf {
    // Try to detect project root from the executable location or env var
    // Falls back to hardcoded path for dev environment
    std::env::var("AUREA_PROJECT_ROOT")
        .map(PathBuf::from)
        .unwrap_or_else(|_| PathBuf::from("C:\\AureaSolaris"))
}
```

- [ ] **Step 2: Update run_astro_engine to use helper**

Replace line 628:
```rust
// Before:
let project_root = std::path::PathBuf::from("C:\\AureaSolaris");
// After:
let project_root = get_project_root();
```

- [ ] **Step 3: Update run_agm_engine to use helper**

Replace line 657:
```rust
// Before:
let project_root = std::path::PathBuf::from("C:\\AureaSolaris");
// After:
let project_root = get_project_root();
```

- [ ] **Step 4: Update list_lab_files to use helper**

Replace line 600:
```rust
// Before:
let path = Path::new("C:\\AureaSolaris\\Laboratorio_Stark");
// After:
let path = get_project_root().join("Laboratorio_Stark");
```

- [ ] **Step 5: Verify it compiles**

```bash
cd src-tauri && cargo check
```
Expected: compiles without errors

- [ ] **Step 6: Commit**

```bash
git add src-tauri/src/lib.rs
git commit -m "refactor: extract hardcoded project root into get_project_root() helper"
```

---

## Task 4: Expand OAuth2 Scope for Calendar

**Files:**
- Modify: `C:\AureaSolaris\src-tauri\src\lib.rs` (google_drive_connect function, around line 730)

- [ ] **Step 1: Update the OAuth2 scope string**

In `google_drive_connect`, find the scope definition (around line 730):
```rust
// Before:
let scope = "https://www.googleapis.com/auth/drive.file";
// After:
let scope = "https://www.googleapis.com/auth/drive.file https://www.googleapis.com/auth/calendar";
```

This ensures the OAuth2 consent screen requests both Drive and Calendar permissions in a single flow.

- [ ] **Step 2: Verify it compiles**

```bash
cd src-tauri && cargo check
```
Expected: compiles without errors

- [ ] **Step 3: Commit**

```bash
git add src-tauri/src/lib.rs
git commit -m "feat: add Google Calendar scope to OAuth2 consent flow"
```

---

## Task 5: Implement Google Calendar Commands

**Files:**
- Modify: `C:\AureaSolaris\src-tauri\src\lib.rs` (replace stubs at lines 422-454)

- [ ] **Step 1: Replace get_google_events with real API call**

Replace the `get_google_events` function (lib.rs:444-454):

```rust
#[tauri::command]
async fn get_google_events(app: tauri::AppHandle) -> Result<String, String> {
    let tokens = load_tokens(&app)?.ok_or("Não conectado ao Google. Conecte via Painel de Controle.")?;
    let client = reqwest::Client::new();

    let now = chrono::Utc::now().to_rfc3339();
    let url = format!(
        "https://www.googleapis.com/calendar/v3/calendars/primary/events?timeMin={}&maxResults=20&singleEvents=true&orderBy=startTime",
        url_encode(&now)
    );

    let response = client
        .get(&url)
        .bearer_auth(&tokens.access_token)
        .send()
        .await
        .map_err(|e| format!("Erro ao buscar eventos: {}", e))?;

    if !response.status().is_success() {
        let status = response.status();
        let body = response.text().await.unwrap_or_default();
        return Err(format!("Erro na API do Google Calendar ({}): {}", status, body));
    }

    let json: serde_json::Value = response.json().await.map_err(|e| format!("Erro ao ler resposta: {}", e))?;

    // Transform to simpler format for frontend
    let items = json.get("items").and_then(|v| v.as_array()).cloned().unwrap_or_default();
    let events: Vec<serde_json::Value> = items.iter().map(|item| {
        serde_json::json!({
            "id": item.get("id").and_then(|v| v.as_str()).unwrap_or(""),
            "title": item.get("summary").and_then(|v| v.as_str()).unwrap_or("Sem título"),
            "start": item.get("start").and_then(|v| v.get("dateTime").or_else(|| v.get("date"))).and_then(|v| v.as_str()).unwrap_or(""),
            "end": item.get("end").and_then(|v| v.get("dateTime").or_else(|| v.get("date"))).and_then(|v| v.as_str()).unwrap_or(""),
            "type": "calendar"
        })
    }).collect();

    Ok(serde_json::to_string(&events).map_err(|e| e.to_string())?)
}
```

- [ ] **Step 2: Replace add_google_event with real API call**

Replace the `add_google_event` function (lib.rs:422-432):

```rust
#[tauri::command]
async fn add_google_event(app: tauri::AppHandle, title: String, start: String) -> Result<String, String> {
    let tokens = load_tokens(&app)?.ok_or("Não conectado ao Google. Conecte via Painel de Controle.")?;
    let client = reqwest::Client::new();

    let event_body = serde_json::json!({
        "summary": title,
        "start": { "dateTime": start },
        "end": { "dateTime": start } // Default 1-hour events; frontend can pass end time later
    });

    let response = client
        .post("https://www.googleapis.com/calendar/v3/calendars/primary/events")
        .bearer_auth(&tokens.access_token)
        .json(&event_body)
        .send()
        .await
        .map_err(|e| format!("Erro ao criar evento: {}", e))?;

    if !response.status().is_success() {
        let status = response.status();
        let body = response.text().await.unwrap_or_default();
        return Err(format!("Erro ao criar evento ({}): {}", status, body));
    }

    let json: serde_json::Value = response.json().await.map_err(|e| format!("Erro ao ler resposta: {}", e))?;
    let event_id = json.get("id").and_then(|v| v.as_str()).unwrap_or("unknown");
    println!("Stark: Evento criado no Google Calendar — id={}", event_id);
    Ok(json.to_string())
}
```

- [ ] **Step 3: Replace delete_google_event with real API call**

Replace the `delete_google_event` function (lib.rs:434-442):

```rust
#[tauri::command]
async fn delete_google_event(app: tauri::AppHandle, id: String) -> Result<String, String> {
    let tokens = load_tokens(&app)?.ok_or("Não conectado ao Google. Conecte via Painel de Controle.")?;
    let client = reqwest::Client::new();

    let url = format!("https://www.googleapis.com/calendar/v3/calendars/primary/events/{}", id);
    let response = client
        .delete(&url)
        .bearer_auth(&tokens.access_token)
        .send()
        .await
        .map_err(|e| format!("Erro ao deletar evento: {}", e))?;

    if !response.status().is_success() {
        let status = response.status();
        let body = response.text().await.unwrap_or_default();
        return Err(format!("Erro ao deletar evento ({}): {}", status, body));
    }

    println!("Stark: Evento {} deletado do Google Calendar.", id);
    Ok(format!("Evento {} deletado com sucesso.", id))
}
```

- [ ] **Step 4: Add url_encode helper**

Add a small helper near the other helpers (around line 105):

```rust
fn url_encode(s: &str) -> String {
    url::form_urlencoded::byte_serialize(s.as_bytes()).collect::<String>()
}
```

Note: The `url` crate is already a transitive dependency via `reqwest`. If it's not directly available, add `url = "2"` to Cargo.toml, or use a simple percent-encoding inline.

- [ ] **Step 5: Verify it compiles**

```bash
cd src-tauri && cargo check
```
Expected: compiles without errors

- [ ] **Step 6: Commit**

```bash
git add src-tauri/src/lib.rs
git commit -m "feat: implement real Google Calendar API integration (get/add/delete events)"
```

---

## Task 6: Update Documentation

**Files:**
- Modify: `C:\AureaSolaris\docs\arquitetura.md`
- Modify: `C:\AureaSolaris\docs\estrutura-do-projeto.md`

- [ ] **Step 1: Update arquitetura.md**

Remove the "⚠️ Stub" markers from `add_google_event` and `delete_google_event` in the commands table. Update section 3.6 to note that Calendar is now functional (not just Drive).

- [ ] **Step 2: Update estrutura-do-projeto.md**

Add `AUREA_PROJECT_ROOT` to the environment variables section as an optional override for the project root path.

- [ ] **Step 3: Commit**

```bash
git add docs/arquitetura.md docs/estrutura-do-projeto.md
git commit -m "docs: update Google Calendar integration and AUREA_PROJECT_ROOT env var"
```

---

## Verification

After all tasks:

```bash
cd src-tauri && cargo check    # Rust compiles cleanly
cd .. && npm run lint           # Frontend lint passes
cd .. && npx tsc --noEmit       # TypeScript compiles
```
