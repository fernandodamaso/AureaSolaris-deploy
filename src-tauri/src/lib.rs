use serde::{Deserialize, Serialize};
use tauri::{Manager, State};
use std::fs;
use std::path::{Path, PathBuf};
use std::sync::{Arc, Mutex, OnceLock};
use std::process::Child;
#[cfg(target_os = "windows")]
use std::os::windows::process::CommandExt;

// ─── Sidecar / Astro API ───
const ASTRO_API_URL: &str = "http://127.0.0.1:9876";
static ACTIVE_OWNER: OnceLock<Mutex<Option<String>>> = OnceLock::new();

// ─── AppState: Shared state loaded ONCE at startup ───

struct AppState {
    http_client: reqwest::Client,
}

// ─── SidecarState: Gerencia o processo Python FastAPI sidecar ───

struct SidecarState {
    child: Mutex<Option<Child>>,
    token: String,
}

impl SidecarState {
    fn new() -> Self {
        Self {
            child: Mutex::new(None),
            token: uuid::Uuid::new_v4().to_string(),
        }
    }

    fn start(&self, api_path: &Path, data_dir: &Path) -> Result<(), String> {
        let mut guard = self.child.lock().map_err(|e| e.to_string())?;
        if guard.is_some() {
            return Ok(()); // já rodando
        }

        let mut command = std::process::Command::new(api_path);
        command
            .current_dir(api_path.parent().unwrap_or(Path::new(".")))
            .env("ASTRO_API_PORT", "9876")
            .env("AUREA_DATA_DIR", data_dir)
            .env("AUREA_SIDECAR_TOKEN", &self.token);

        // O motor é interno ao Aurea. No Windows, não exibir um terminal auxiliar.
        #[cfg(target_os = "windows")]
        command.creation_flags(0x08000000);

        let child = command.spawn()
            .map_err(|e| format!("Falha ao iniciar sidecar: {}", e))?;

        *guard = Some(child);
        println!(
            "[AureaSolaris] Sidecar Python iniciado (PID esperado na porta 9876)"
        );
        Ok(())
    }

    fn stop(&self) {
        if let Ok(mut guard) = self.child.lock() {
            if let Some(ref mut child) = *guard {
                let _ = child.kill();
                println!("[AureaSolaris] Sidecar Python encerrado.");
            }
            *guard = None;
        }
    }
}

// ─── Chat / LLM Commands ───

// ─── Helpers: paths e logs ───

fn get_mem_path(
    app: &tauri::AppHandle,
    filename: &str,
) -> Result<PathBuf, String> {
    let mut path =
        app.path().app_data_dir().map_err(|e| e.to_string())?;
    path.push("memory");
    if !path.exists() {
        fs::create_dir_all(&path).map_err(|e| e.to_string())?;
    }
    path.push(filename);
    Ok(path)
}

fn validate_private_id(value: &str, label: &str) -> Result<(), String> {
    let valid = !value.is_empty()
        && value.chars().count() <= 128
        && !value.contains("..")
        && !value.starts_with('.')
        && value
            .chars()
            .all(|character| character.is_alphanumeric() || matches!(character, '-' | '_' | '.'));
    if valid {
        Ok(())
    } else {
        Err(format!("{} inválido.", label))
    }
}

fn current_owner() -> Result<String, String> {
    ACTIVE_OWNER
        .get_or_init(|| Mutex::new(None))
        .lock()
        .map_err(|_| "A sessão privada está indisponível.".to_string())?
        .clone()
        .ok_or_else(|| "Nenhum proprietário autenticado nesta sessão.".to_string())
}

async fn sidecar_private_request(
    state: &AppState,
    sidecar: &SidecarState,
    method: reqwest::Method,
    path: &str,
    query: Option<serde_json::Value>,
    body: Option<serde_json::Value>,
) -> Result<serde_json::Value, String> {
    let owner_id = current_owner()?;
    let permitted = path == "/storage/diagnostic"
        || path == "/storage/backup/private"
        || path == "/hermes/threads/open"
        || path == "/hermes/memories/propose"
        || path == "/hermes/memories"
        || (path.starts_with("/hermes/threads/")
            && (path.ends_with("/context") || path.ends_with("/messages")))
        || (path.starts_with("/hermes/memories/") && path.ends_with("/review"));
    if !permitted || path.contains('?') || path.contains('#') || path.contains("..") {
        return Err("Rota privada do sidecar não permitida.".to_string());
    }

    let mut query_pairs = Vec::new();
    if let Some(serde_json::Value::Object(values)) = query {
        for (key, value) in values {
            if key == "owner_id" && value.as_str() != Some(owner_id.as_str()) {
                return Err("A sessão não pode acessar dados de outro proprietário.".to_string());
            }
            if let Some(text) = value.as_str() {
                query_pairs.push((key, text.to_string()));
            } else if value.is_number() || value.is_boolean() {
                query_pairs.push((key, value.to_string()));
            } else {
                return Err("Parâmetro privado inválido.".to_string());
            }
        }
    }
    if path.starts_with("/hermes/") && !query_pairs.iter().any(|(key, _)| key == "owner_id") {
        query_pairs.push(("owner_id".to_string(), owner_id.clone()));
    }

    let mut payload = body.unwrap_or(serde_json::Value::Null);
    if let serde_json::Value::Object(values) = &mut payload {
        if let Some(requested_owner) = values.get("owner_id").and_then(|value| value.as_str()) {
            if requested_owner != owner_id {
                return Err("A sessão não pode alterar dados de outro proprietário.".to_string());
            }
        }
        if path.starts_with("/hermes/") {
            values.insert("owner_id".to_string(), serde_json::Value::String(owner_id));
        }
    }

    let mut request = state
        .http_client
        .request(method, format!("{}{}", ASTRO_API_URL, path))
        .header("X-Aurea-Sidecar-Token", &sidecar.token)
        .query(&query_pairs);
    if !payload.is_null() {
        request = request.json(&payload);
    }
    let response = request.send().await.map_err(|error| format!("Falha ao acessar o armazenamento privado: {}", error))?;
    let status = response.status();
    let response_body: serde_json::Value = response.json().await.map_err(|error| format!("Resposta privada inválida: {}", error))?;
    if !status.is_success() {
        let detail = response_body.get("detail").and_then(|value| value.get("error").or(Some(value))).and_then(|value| value.as_str()).unwrap_or("A operação privada falhou.");
        return Err(detail.to_string());
    }
    Ok(response_body)
}

fn owner_mem_path(
    app: &tauri::AppHandle,
    owner_id: &str,
    relative_path: &str,
) -> Result<PathBuf, String> {
    validate_private_id(owner_id, "owner_id")?;
    get_mem_path(app, &format!("owners/{}/{}", owner_id, relative_path))
}

fn owner_diary_vault(owner_id: &str) -> Result<PathBuf, String> {
    validate_private_id(owner_id, "owner_id")?;
    let home = dirs_next::home_dir().ok_or("Não foi possível encontrar o diretório do usuário.")?;
    Ok(home
        .join("Documents")
        .join("AureaSolarisDiary-private")
        .join(owner_id))
}

fn copy_dir_without_overwrite(source: &Path, destination: &Path) -> Result<usize, String> {
    if !source.exists() {
        return Ok(0);
    }
    fs::create_dir_all(destination).map_err(|error| error.to_string())?;
    let mut copied = 0;
    for entry in fs::read_dir(source).map_err(|error| error.to_string())? {
        let entry = entry.map_err(|error| error.to_string())?;
        let source_path = entry.path();
        let destination_path = destination.join(entry.file_name());
        if entry.file_type().map_err(|error| error.to_string())?.is_dir() {
            copied += copy_dir_without_overwrite(&source_path, &destination_path)?;
        } else if !destination_path.exists() {
            fs::copy(&source_path, &destination_path).map_err(|error| error.to_string())?;
            copied += 1;
        }
    }
    Ok(copied)
}

fn migrate_legacy_private_data(app: &tauri::AppHandle, owner_id: &str) -> Result<(), String> {
    validate_private_id(owner_id, "owner_id")?;
    let ledger_path = get_mem_path(app, "migrations/legacy-personal-v1.json")?;
    if let Some(parent) = ledger_path.parent() {
        fs::create_dir_all(parent).map_err(|error| error.to_string())?;
    }

    let claimed_owner = if ledger_path.exists() {
        let raw = fs::read_to_string(&ledger_path).map_err(|error| error.to_string())?;
        serde_json::from_str::<serde_json::Value>(&raw)
            .ok()
            .and_then(|value| value.get("owner_id").and_then(|owner| owner.as_str()).map(str::to_owned))
    } else {
        None
    };
    if claimed_owner.as_deref().is_some_and(|claimed| claimed != owner_id) {
        return Ok(());
    }

    let legacy_boards = get_mem_path(app, "boards")?;
    let legacy_diary = get_mem_path(app, "diary")?;
    let owner_boards = owner_mem_path(app, owner_id, "boards")?;
    let owner_diary = owner_mem_path(app, owner_id, "diary")?;
    fs::create_dir_all(&owner_boards).map_err(|error| error.to_string())?;
    fs::create_dir_all(&owner_diary).map_err(|error| error.to_string())?;

    let has_legacy = legacy_boards.exists() || legacy_diary.exists();
    if !has_legacy && claimed_owner.is_none() {
        return Ok(());
    }

    let board_files = copy_dir_without_overwrite(&legacy_boards, &owner_boards)?;
    let diary_files = copy_dir_without_overwrite(&legacy_diary, &owner_diary)?;

    let legacy_vault = dirs_next::home_dir()
        .map(|home| home.join("Documents").join("AureaSolarisDiary"));
    let vault_files = if let Some(source) = legacy_vault {
        copy_dir_without_overwrite(&source, &owner_diary_vault(owner_id)?)?
    } else {
        0
    };

    let ledger = serde_json::json!({
        "version": 1,
        "owner_id": owner_id,
        "completed": true,
        "copied": {
            "boards": board_files,
            "diary": diary_files,
            "markdown": vault_files
        },
        "completed_at": chrono::Utc::now().to_rfc3339()
    });
    fs::write(
        ledger_path,
        serde_json::to_string_pretty(&ledger).map_err(|error| error.to_string())?,
    )
    .map_err(|error| error.to_string())?;
    Ok(())
}

#[tauri::command]
async fn private_session_open(
    app: tauri::AppHandle,
    state: State<'_, AppState>,
    sidecar: State<'_, Arc<SidecarState>>,
    owner_id: String,
    login_name: String,
    password: String,
) -> Result<String, String> {
    validate_private_id(&owner_id, "owner_id")?;
    let response = state.http_client
        .post(format!("{}/hermes/auth/login", ASTRO_API_URL))
        .header("X-Aurea-Sidecar-Token", &sidecar.token)
        .json(&serde_json::json!({ "login_name": login_name, "password": password }))
        .send()
        .await
        .map_err(|error| format!("Não foi possível autenticar o perfil local: {}", error))?;
    let status = response.status();
    let account: serde_json::Value = response.json().await.map_err(|error| error.to_string())?;
    if !status.is_success() || account.get("account_id").and_then(|value| value.as_str()) != Some(owner_id.as_str()) {
        return Err("Credenciais locais inválidas.".to_string());
    }
    migrate_legacy_private_data(&app, &owner_id)?;
    let mut active = ACTIVE_OWNER
        .get_or_init(|| Mutex::new(None))
        .lock()
        .map_err(|_| "Não foi possível iniciar a sessão privada.".to_string())?;
    *active = Some(owner_id.clone());
    Ok(owner_id)
}

#[tauri::command]
async fn private_account_register(
    app: tauri::AppHandle,
    state: State<'_, AppState>,
    sidecar: State<'_, Arc<SidecarState>>,
    owner_id: String,
    display_name: String,
    login_name: String,
    password: String,
) -> Result<String, String> {
    validate_private_id(&owner_id, "owner_id")?;
    let response = state.http_client
        .post(format!("{}/hermes/auth/register", ASTRO_API_URL))
        .header("X-Aurea-Sidecar-Token", &sidecar.token)
        .json(&serde_json::json!({
            "account_id": owner_id,
            "display_name": display_name,
            "login_name": login_name,
            "password": password,
        }))
        .send()
        .await
        .map_err(|error| format!("Não foi possível criar o perfil local: {}", error))?;
    let status = response.status();
    let account: serde_json::Value = response.json().await.map_err(|error| error.to_string())?;
    if !status.is_success() || account.get("account_id").and_then(|value| value.as_str()) != Some(owner_id.as_str()) {
        return Err("Não foi possível criar o perfil local.".to_string());
    }
    migrate_legacy_private_data(&app, &owner_id)?;
    let mut active = ACTIVE_OWNER
        .get_or_init(|| Mutex::new(None))
        .lock()
        .map_err(|_| "Não foi possível iniciar a sessão privada.".to_string())?;
    *active = Some(owner_id.clone());
    Ok(owner_id)
}

#[tauri::command]
async fn private_sidecar_request(
    state: State<'_, AppState>,
    sidecar: State<'_, Arc<SidecarState>>,
    method: String,
    path: String,
    query: Option<serde_json::Value>,
    body: Option<serde_json::Value>,
) -> Result<serde_json::Value, String> {
    let method = method.parse::<reqwest::Method>().map_err(|_| "Método HTTP privado inválido.".to_string())?;
    sidecar_private_request(&state, sidecar.inner().as_ref(), method, &path, query, body).await
}

#[tauri::command]
fn private_session_close() -> Result<(), String> {
    let mut active = ACTIVE_OWNER
        .get_or_init(|| Mutex::new(None))
        .lock()
        .map_err(|_| "Não foi possível encerrar a sessão privada.".to_string())?;
    *active = None;
    Ok(())
}

#[cfg(target_os = "windows")]
fn protect_for_windows_user(data: &[u8]) -> Result<Vec<u8>, String> {
    use windows::core::PCWSTR;
    use windows::Win32::Foundation::{LocalFree, HLOCAL};
    use windows::Win32::Security::Cryptography::{
        CryptProtectData, CRYPT_INTEGER_BLOB, CRYPTPROTECT_UI_FORBIDDEN,
    };

    let input = CRYPT_INTEGER_BLOB {
        cbData: data.len() as u32,
        pbData: data.as_ptr() as *mut u8,
    };
    let mut output = CRYPT_INTEGER_BLOB::default();
    unsafe {
        CryptProtectData(
            &input,
            PCWSTR::null(),
            None,
            None,
            None,
            CRYPTPROTECT_UI_FORBIDDEN,
            &mut output,
        )
        .map_err(|error| format!("Falha ao proteger a sessão no Windows: {}", error))?;
        let protected = std::slice::from_raw_parts(output.pbData, output.cbData as usize).to_vec();
        let _ = LocalFree(Some(HLOCAL(output.pbData as *mut std::ffi::c_void)));
        Ok(protected)
    }
}

#[cfg(target_os = "windows")]
fn unprotect_for_windows_user(data: &[u8]) -> Result<Vec<u8>, String> {
    use windows::Win32::Foundation::{LocalFree, HLOCAL};
    use windows::Win32::Security::Cryptography::{
        CryptUnprotectData, CRYPT_INTEGER_BLOB, CRYPTPROTECT_UI_FORBIDDEN,
    };

    let input = CRYPT_INTEGER_BLOB {
        cbData: data.len() as u32,
        pbData: data.as_ptr() as *mut u8,
    };
    let mut output = CRYPT_INTEGER_BLOB::default();
    unsafe {
        CryptUnprotectData(
            &input,
            None,
            None,
            None,
            None,
            CRYPTPROTECT_UI_FORBIDDEN,
            &mut output,
        )
        .map_err(|error| format!("Falha ao recuperar a sessão protegida: {}", error))?;
        let plain = std::slice::from_raw_parts(output.pbData, output.cbData as usize).to_vec();
        let _ = LocalFree(Some(HLOCAL(output.pbData as *mut std::ffi::c_void)));
        Ok(plain)
    }
}

fn remembered_owner_path(app: &tauri::AppHandle) -> Result<PathBuf, String> {
    get_mem_path(app, "auth/remembered_owner.dpapi")
}

#[tauri::command]
fn remembered_owner_set(app: tauri::AppHandle, owner_id: String) -> Result<bool, String> {
    validate_private_id(&owner_id, "owner_id")?;
    if current_owner()? != owner_id {
        return Err("A sessão autenticada não corresponde ao proprietário solicitado.".to_string());
    }
    #[cfg(target_os = "windows")]
    {
        let protected = protect_for_windows_user(owner_id.as_bytes())?;
        let path = remembered_owner_path(&app)?;
        if let Some(parent) = path.parent() {
            fs::create_dir_all(parent).map_err(|error| error.to_string())?;
        }
        fs::write(path, protected).map_err(|error| error.to_string())?;
        Ok(true)
    }
    #[cfg(not(target_os = "windows"))]
    {
        let _ = app;
        Err("Memorizar acesso está disponível apenas no aplicativo Windows.".to_string())
    }
}

#[tauri::command]
fn remembered_owner_get(app: tauri::AppHandle) -> Result<Option<String>, String> {
    let path = remembered_owner_path(&app)?;
    if !path.exists() {
        return Ok(None);
    }
    #[cfg(target_os = "windows")]
    {
        let protected = fs::read(path).map_err(|error| error.to_string())?;
        let owner_id = String::from_utf8(unprotect_for_windows_user(&protected)?)
            .map_err(|_| "A sessão protegida contém dados inválidos.".to_string())?;
        validate_private_id(&owner_id, "owner_id")?;
        Ok(Some(owner_id))
    }
    #[cfg(not(target_os = "windows"))]
    {
        Ok(None)
    }
}

#[tauri::command]
fn remembered_owner_clear(app: tauri::AppHandle) -> Result<bool, String> {
    let path = remembered_owner_path(&app)?;
    if path.exists() {
        fs::remove_file(path).map_err(|error| error.to_string())?;
    }
    Ok(true)
}

#[tauri::command]
fn save_board(
    app: tauri::AppHandle,
    board_id: String,
    name: String,
    nodes: serde_json::Value,
    edges: serde_json::Value,
) -> Result<u64, String> {
    let owner_id = current_owner()?;
    validate_private_id(&board_id, "board_id")?;
    // Save board data to boards/{board_id}.json
    let board_path = owner_mem_path(&app, &owner_id, &format!("boards/{}.json", board_id))?;
    if let Some(parent) = board_path.parent() {
        fs::create_dir_all(parent).map_err(|e| e.to_string())?;
    }
    let timestamp = std::time::SystemTime::now()
        .duration_since(std::time::UNIX_EPOCH)
        .unwrap_or_default()
        .as_millis() as u64;
    let data = serde_json::json!({
        "nodes": nodes,
        "edges": edges,
        "name": name,
        "owner_id": owner_id,
        "updated_at": timestamp
    });
    let json = serde_json::to_string_pretty(&data).map_err(|e| e.to_string())?;
    fs::write(&board_path, json).map_err(|e| e.to_string())?;

    // Upsert entry in boards_index.json
    let index_path = owner_mem_path(&app, &owner_id, "boards/boards_index.json")?;
    if let Some(parent) = index_path.parent() {
        fs::create_dir_all(parent).map_err(|e| e.to_string())?;
    }
    let mut entries: Vec<serde_json::Value> = if index_path.exists() {
        let raw = fs::read_to_string(&index_path).map_err(|e| e.to_string())?;
        serde_json::from_str(&raw).unwrap_or_default()
    } else {
        Vec::new()
    };
    // Remove existing entry for this board_id, then push updated one
    entries.retain(|e| e.get("id").and_then(|v| v.as_str()) != Some(&board_id));
    entries.push(serde_json::json!({
        "id": board_id,
        "name": name,
        "owner_id": owner_id,
        "updated_at": timestamp
    }));
    let index_json = serde_json::to_string_pretty(&entries).map_err(|e| e.to_string())?;
    fs::write(&index_path, index_json).map_err(|e| e.to_string())?;

    Ok(timestamp)
}

#[tauri::command]
fn load_board(app: tauri::AppHandle, board_id: String) -> Result<serde_json::Value, String> {
    let owner_id = current_owner()?;
    validate_private_id(&board_id, "board_id")?;
    let path = owner_mem_path(&app, &owner_id, &format!("boards/{}.json", board_id))?;
    if !path.exists() {
        return Ok(serde_json::json!({
            "nodes": [],
            "edges": []
        }));
    }
    let json = fs::read_to_string(path).map_err(|e| e.to_string())?;
    let mut data: serde_json::Value = serde_json::from_str(&json).map_err(|e| e.to_string())?;
    data["owner_id"] = serde_json::Value::String(owner_id);
    Ok(data)
}

#[tauri::command]
fn list_boards(app: tauri::AppHandle) -> Result<serde_json::Value, String> {
    let owner_id = current_owner()?;
    let index_path = owner_mem_path(&app, &owner_id, "boards/boards_index.json")?;
    if !index_path.exists() {
        return Ok(serde_json::json!([]));
    }
    let raw = fs::read_to_string(&index_path).map_err(|e| e.to_string())?;
    let mut entries: serde_json::Value = serde_json::from_str(&raw).map_err(|e| e.to_string())?;
    if let Some(items) = entries.as_array_mut() {
        for item in items {
            item["owner_id"] = serde_json::Value::String(owner_id.clone());
        }
    }
    Ok(entries)
}

#[tauri::command]
fn delete_board(app: tauri::AppHandle, board_id: String) -> Result<(), String> {
    let owner_id = current_owner()?;
    validate_private_id(&board_id, "board_id")?;
    // Remove the board file
    let board_path = owner_mem_path(&app, &owner_id, &format!("boards/{}.json", board_id))?;
    if board_path.exists() {
        fs::remove_file(&board_path).map_err(|e| e.to_string())?;
    }

    // Remove from boards_index.json
    let index_path = owner_mem_path(&app, &owner_id, "boards/boards_index.json")?;
    if index_path.exists() {
        let raw = fs::read_to_string(&index_path).map_err(|e| e.to_string())?;
        let mut entries: Vec<serde_json::Value> =
            serde_json::from_str(&raw).unwrap_or_default();
        entries.retain(|e| e.get("id").and_then(|v| v.as_str()) != Some(&board_id));
        let index_json = serde_json::to_string_pretty(&entries).map_err(|e| e.to_string())?;
        fs::write(&index_path, index_json).map_err(|e| e.to_string())?;
    }

    Ok(())
}

// ─── MEDICAL MEMORY (HEALTH) ───
#[tauri::command]
fn load_health_memory(app: tauri::AppHandle, profile_id: String) -> Result<serde_json::Value, String> {
    let owner_id = current_owner()?;
    validate_private_id(&profile_id, "profile_id")?;
    let path = owner_mem_path(&app, &owner_id, &format!("health/{}_memory.json", profile_id))?;
    if !path.exists() {
        return Ok(serde_json::json!([]));
    }
    let json = fs::read_to_string(path).map_err(|e| e.to_string())?;
    let data = serde_json::from_str(&json).unwrap_or_else(|_| serde_json::json!([]));
    Ok(data)
}

#[tauri::command]
fn save_health_memory(app: tauri::AppHandle, profile_id: String, memory: serde_json::Value) -> Result<(), String> {
    let owner_id = current_owner()?;
    validate_private_id(&profile_id, "profile_id")?;
    let path = owner_mem_path(&app, &owner_id, &format!("health/{}_memory.json", profile_id))?;
    if let Some(parent) = path.parent() {
        fs::create_dir_all(parent).map_err(|e| e.to_string())?;
    }
    let json = serde_json::to_string_pretty(&memory).map_err(|e| e.to_string())?;
    fs::write(path, json).map_err(|e| e.to_string())?;
    Ok(())
}


#[tauri::command]
fn get_sys_info() -> Result<serde_json::Value, String> {
    let load =
        sys_info::loadavg().map(|l| l.one).unwrap_or(0.0);
    let mem = sys_info::mem_info()
        .map(|m| (m.total - m.free) as f64 / 1024.0 / 1024.0)
        .unwrap_or(0.0);
    let disk = sys_info::disk_info()
        .map(|d| d.free as f64 / 1024.0 / 1024.0)
        .unwrap_or(0.0);

    Ok(serde_json::json!({
        "cpu_load": format!("{:.1}%", load * 10.0),
        "ram_usage": format!("{:.1} GB", mem),
        "disk_free": format!("{:.0} GB", disk)
    }))
}

#[tauri::command]
async fn run_astro_engine(
    state: State<'_, AppState>,
    payload: Option<String>,
) -> Result<String, String> {
    // 1. Health check rápido
    check_sidecar_health(&state.http_client).await?;

    // 2. Parse do payload (aceita JSON ou None)
    let body: serde_json::Value = match payload {
        Some(ref p) => serde_json::from_str(p)
            .map_err(|e| format!("JSON inválido no payload: {}", e))?,
        None => serde_json::json!({}),
    };

    // 3. Detectar se é natal ou transit pelo campo 'transit'
    let is_transit = body
        .get("transit")
        .and_then(|v| v.as_bool())
        .unwrap_or(false);

    let url = if is_transit {
        format!("{}/transit", ASTRO_API_URL)
    } else {
        format!("{}/natal", ASTRO_API_URL)
    };

    // 4. POST para o FastAPI sidecar
    let res = state
        .http_client
        .post(&url)
        .json(&body)
        .send()
        .await
        .map_err(|e| {
            format!(
                "Erro de rede ao conectar ao sidecar: {}",
                e
            )
        })?;

    let status = res.status();
    let text = res
        .text()
        .await
        .map_err(|e| format!("Falha ao ler resposta do sidecar: {}", e))?;

    if status.is_success() {
        println!(
            "Stark: sidecar retornou {} bytes",
            text.len()
        );
        Ok(text)
    } else {
        Err(format!(
            "Erro no sidecar ({}): {}",
            status, text
        ))
    }
}


// ─── Astro Engine (HTTP sidecar) ───

/// Verifica se o sidecar FastAPI está respondendo na porta 9876.
async fn check_sidecar_health(
    client: &reqwest::Client,
) -> Result<(), String> {
    let res = client
        .get(format!("{}/health", ASTRO_API_URL))
        .send()
        .await
        .map_err(|e| {
            format!(
                "Sidecar não está acessível em {}: {}",
                ASTRO_API_URL, e
            )
        })?;

    if res.status().is_success() {
        Ok(())
    } else {
        Err(format!(
            "Sidecar health check falhou (status {})",
            res.status()
        ))
    }
}

/// Obtém as posições de trânsito planetário para uma data e local
/// específicos.
///
/// Injeta `transit: true` no payload e delega para
/// `run_astro_engine`.
#[tauri::command]
async fn get_transit_positions(
    state: State<'_, AppState>,
    payload: String,
) -> Result<String, String> {
    // Injeta "transit": true no payload se não estiver presente
    let mut data: serde_json::Value = serde_json::from_str(&payload)
        .map_err(|e| format!("JSON inválido: {}", e))?;

    if data.get("transit").and_then(|v| v.as_bool()) != Some(true) {
        data["transit"] = serde_json::json!(true);
    }

    run_astro_engine(state, Some(data.to_string())).await
}

// ─── Diary ───

fn default_status() -> String {
    "idea".to_string()
}

#[derive(Serialize, Deserialize, Clone)]
pub struct DiaryEntry {
    pub id: String,
    #[serde(default)]
    pub owner_id: String,
    pub title: String,
    pub content: String,       // Markdown plain text
    pub folder_id: String,
    pub created_at: String,    // ISO 8601
    pub updated_at: String,    // ISO 8601
    pub word_count: usize,
    #[serde(default = "default_status")]
    pub status: String,        // "idea" | "draft" | "done"
}

#[derive(Serialize, Deserialize, Clone)]
pub struct DiaryFolder {
    pub id: String,
    #[serde(default)]
    pub owner_id: String,
    pub name: String,
    pub icon: String,          // emoji
    pub order: usize,
    pub created_at: String,    // ISO 8601
}

#[derive(Serialize, Deserialize, Clone)]
pub struct DiaryTabsState {
    #[serde(default)]
    pub owner_id: String,
    pub open_tab_ids: Vec<String>,
    pub active_tab_id: Option<String>,
}

// Helper functions for diary persistence

fn sanitize_filename(name: &str) -> String {
    let invalid_chars = ['<', '>', ':', '"', '/', '\\', '|', '?', '*'];
    let mut sanitized: String = name.chars()
        .map(|c| if invalid_chars.contains(&c) { '_' } else { c })
        .collect();
    sanitized = sanitized.trim().to_string();
    if sanitized.is_empty() {
        sanitized = "Nota sem titulo".to_string();
    }
    sanitized
}

fn normalize_diary_entry_owner(entry: &mut DiaryEntry, owner_id: &str) -> Result<bool, String> {
    if entry.owner_id.is_empty() {
        entry.owner_id = owner_id.to_string();
        return Ok(true);
    }
    if entry.owner_id == owner_id {
        Ok(false)
    } else {
        Err("A entrada solicitada pertence a outro propriet\u{e1}rio.".to_string())
    }
}

fn normalize_diary_folder_owner(folder: &mut DiaryFolder, owner_id: &str) -> Result<bool, String> {
    if folder.owner_id.is_empty() {
        folder.owner_id = owner_id.to_string();
        return Ok(true);
    }
    if folder.owner_id == owner_id {
        Ok(false)
    } else {
        Err("A pasta solicitada pertence a outro propriet\u{e1}rio.".to_string())
    }
}

fn get_folder_name(app: &tauri::AppHandle, folder_id: &str) -> String {
    if folder_id == "general" {
        return "Geral".to_string();
    }
    if let Ok(folders) = diary_list_folders(app.clone()) {
        if let Some(f) = folders.iter().find(|f| f.id == folder_id) {
            return sanitize_filename(&f.name);
        }
    }
    "Geral".to_string()
}

fn get_diary_dir(
    app: &tauri::AppHandle,
) -> Result<PathBuf, String> {
    let owner_id = current_owner()?;
    let dir = owner_mem_path(app, &owner_id, "diary")?;
    fs::create_dir_all(&dir).map_err(|e| {
        format!(
            "Falha ao criar diretório do diário: {}",
            e
        )
    })?;
    Ok(dir)
}

fn get_entry_path(
    app: &tauri::AppHandle,
    entry_id: &str,
) -> Result<PathBuf, String> {
    validate_private_id(entry_id, "entry_id")?;
    let mut path = get_diary_dir(app)?;
    path.push("entries");
    path.push(format!("{}.json", entry_id));
    Ok(path)
}

fn get_folders_path(
    app: &tauri::AppHandle,
) -> Result<PathBuf, String> {
    let mut path = get_diary_dir(app)?;
    path.push("folders.json");
    Ok(path)
}

fn get_tabs_path(
    app: &tauri::AppHandle,
) -> Result<PathBuf, String> {
    let mut path = get_diary_dir(app)?;
    path.push("tabs.json");
    Ok(path)
}

// Ensure default "Geral" folder exists
fn ensure_default_folder(
    app: &tauri::AppHandle,
) -> Result<(), String> {
    let owner_id = current_owner()?;
    let folders_path = get_folders_path(app)?;
    if !folders_path.exists() {
        let folder = DiaryFolder {
            id: "general".to_string(),
            owner_id,
            name: "Geral".to_string(),
            icon: "📁".to_string(),
            order: 0,
            created_at: chrono::Utc::now().to_rfc3339(),
        };
        let folders = vec![folder];
        let json = serde_json::to_string_pretty(&folders)
            .map_err(|e| {
                format!(
                    "Falha ao serializar pastas: {}",
                    e
                )
            })?;
        fs::write(&folders_path, json).map_err(|e| {
            format!("Falha ao salvar pastas: {}", e)
        })?;
    }
    // Ensure Geral directory exists in Obsidian
    if let Ok(vault) = get_obsidian_diary_vault(app) {
        let geral_dir = vault.join("Geral");
        fs::create_dir_all(&geral_dir).ok();
    }
    Ok(())
}

#[tauri::command]
#[allow(non_snake_case)]
fn diary_create_entry(
    app: tauri::AppHandle,
    title: String,
    folder_id: Option<String>,
    folderId: Option<String>,
    status: Option<String>,
) -> Result<DiaryEntry, String> {
    let owner_id = current_owner()?;
    let entry_id = uuid::Uuid::new_v4().to_string();
    let now = chrono::Utc::now().to_rfc3339();

    let resolved_folder_id = folder_id.or(folderId);

    let entry = DiaryEntry {
        id: entry_id.clone(),
        owner_id,
        title,
        content: "".to_string(), // Starts empty
        folder_id: match resolved_folder_id {
            Some(ref id) if !id.is_empty() => id.clone(),
            _ => "general".to_string(),
        },
        created_at: now.clone(),
        updated_at: now.clone(),
        word_count: 0,
        status: status.unwrap_or_else(|| "idea".to_string()),
    };

    // Ensure default folder exists
    let _ = ensure_default_folder(&app);

    // Save entry to file
    let entry_path = get_entry_path(&app, &entry_id)?;
    let json = serde_json::to_string_pretty(&entry)
        .map_err(|e| {
            format!("Falha ao serializar entrada: {}", e)
        })?;
    fs::write(&entry_path, json).map_err(|e| {
        format!("Falha ao salvar entrada: {}", e)
    })?;

    // Save to Obsidian vault
    if let Ok(vault) = get_obsidian_diary_vault(&app) {
        let folder_name = get_folder_name(&app, &entry.folder_id);
        let file_title = sanitize_filename(&entry.title);
        let path = vault.join(&folder_name).join(format!("{}.md", file_title));
        if let Some(parent) = path.parent() {
            fs::create_dir_all(parent).ok();
        }
        // Write initial empty content or prompt template
        fs::write(path, "").ok();
    }

    Ok(entry)
}

#[tauri::command]
#[allow(non_snake_case)]
fn diary_update_entry(
    app: tauri::AppHandle,
    id: String,
    title: Option<String>,
    content: Option<String>,
    folder_id: Option<String>,
    folderId: Option<String>,
    status: Option<String>,
) -> Result<DiaryEntry, String> {
    let owner_id = current_owner()?;
    // Load existing entry
    let entry_path = get_entry_path(&app, &id)?;
    let entry_data = fs::read_to_string(&entry_path)
        .map_err(|e| {
            format!("Falha ao ler entrada: {}", e)
        })?;
    let mut entry: DiaryEntry = serde_json::from_str(&entry_data)
        .map_err(|e| {
            format!(
                "Falha ao desserializar entrada: {}",
                e
            )
        })?;
    normalize_diary_entry_owner(&mut entry, &owner_id)?;

    let resolved_folder_id = folder_id.or(folderId);

    // Calculate old Obsidian file path
    let old_folder_name = get_folder_name(&app, &entry.folder_id);
    let old_file_title = sanitize_filename(&entry.title);
    let vault = get_obsidian_diary_vault(&app).ok();
    let old_obsidian_path = vault.as_ref().map(|v| v.join(&old_folder_name).join(format!("{}.md", old_file_title)));

    // Update fields provided
    if let Some(t) = title {
        entry.title = t;
    }
    if let Some(c) = content {
        entry.word_count = c.split_whitespace().count();
        entry.content = c;
    }
    if let Some(f) = resolved_folder_id {
        if !f.is_empty() {
            entry.folder_id = f;
        }
    }
    if let Some(s) = status {
        entry.status = s;
    }
    entry.updated_at = chrono::Utc::now().to_rfc3339();

    // Save updated entry
    let json = serde_json::to_string_pretty(&entry)
        .map_err(|e| {
            format!(
                "Falha ao serializar entrada atualizada: {}",
                e
            )
        })?;
    fs::write(&entry_path, json).map_err(|e| {
        format!(
            "Falha ao salvar entrada atualizada: {}",
            e
        )
    })?;

    // Update in Obsidian
    if let Some(ref v) = vault {
        let new_folder_name = get_folder_name(&app, &entry.folder_id);
        let new_file_title = sanitize_filename(&entry.title);
        let new_obsidian_path = v.join(&new_folder_name).join(format!("{}.md", new_file_title));

        // If path changed, remove the old file
        if let Some(ref old_path) = old_obsidian_path {
            if old_path.exists() && *old_path != new_obsidian_path {
                fs::remove_file(old_path).ok();
            }
        }

        // Write the content to the new path
        if let Some(parent) = new_obsidian_path.parent() {
            fs::create_dir_all(parent).ok();
        }
        fs::write(&new_obsidian_path, &entry.content).ok();
    }

    Ok(entry)
}

#[tauri::command]
fn diary_delete_entry(
    app: tauri::AppHandle,
    id: String,
) -> Result<(), String> {
    let owner_id = current_owner()?;
    let entry_path = get_entry_path(&app, &id)?;

    if let Ok(entry_data) = fs::read_to_string(&entry_path) {
        if let Ok(entry) = serde_json::from_str::<DiaryEntry>(&entry_data) {
            if entry.owner_id.is_empty() || entry.owner_id == owner_id {
            if let Ok(vault) = get_obsidian_diary_vault(&app) {
                let folder_name = get_folder_name(&app, &entry.folder_id);
                let file_title = sanitize_filename(&entry.title);
                let obsidian_path = vault.join(&folder_name).join(format!("{}.md", file_title));
                if obsidian_path.exists() {
                    fs::remove_file(obsidian_path).ok();
                }
            }
            } else {
                return Err("A entrada solicitada pertence a outro propriet\u{e1}rio.".to_string());
            }
        }
    }

    fs::remove_file(&entry_path).map_err(|e| {
        format!("Falha ao excluir entrada: {}", e)
    })?;
    Ok(())
}

#[tauri::command]
#[allow(non_snake_case)]
fn diary_list_entries(
    app: tauri::AppHandle,
    folder_id: Option<String>,
    folderId: Option<String>,
) -> Result<Vec<DiaryEntry>, String> {
    let owner_id = current_owner()?;
    let diary_dir = get_diary_dir(&app)?;
    let entries_dir = diary_dir.join("entries");

    let resolved_folder_id = folder_id.or(folderId);

    // Check if entries directory exists
    if !entries_dir.exists() {
        return Ok(Vec::new());
    }

    let mut entries = Vec::new();

    // Read all JSON files in entries directory
    for entry in fs::read_dir(&entries_dir).map_err(|e| {
        format!(
            "Falha ao ler diretório de entradas: {}",
            e
        )
    })? {
        let entry_path = entry
            .map_err(|e| {
                format!(
                    "Falha ao obter entrada do diretório: {}",
                    e
                )
            })?
            .path();

        if entry_path.extension().and_then(|s| s.to_str())
            == Some("json")
        {
            let entry_data = fs::read_to_string(&entry_path)
                .map_err(|e| {
                    format!(
                        "Falha ao ler arquivo de entrada: {}",
                        e
                    )
                })?;

            let mut entry: DiaryEntry =
                serde_json::from_str(&entry_data).map_err(
                    |e| {
                        format!(
                            "Falha ao desserializar entrada: {}",
                            e
                        )
                    },
                )?;
            let was_legacy = normalize_diary_entry_owner(&mut entry, &owner_id)?;
            if was_legacy {
                let normalized = serde_json::to_string_pretty(&entry).map_err(|e| e.to_string())?;
                fs::write(&entry_path, normalized).map_err(|e| e.to_string())?;
            }

            // Filter by folder if specified
            if let Some(ref f_id) = resolved_folder_id {
                if entry.folder_id == *f_id {
                    entries.push(entry);
                }
            } else {
                entries.push(entry);
            }
        }
    }

    // Sort by creation date (newest first)
    entries.sort_by(|a, b| b.created_at.cmp(&a.created_at));

    Ok(entries)
}

#[tauri::command]
fn diary_get_entry(
    app: tauri::AppHandle,
    id: String,
) -> Result<Option<DiaryEntry>, String> {
    let owner_id = current_owner()?;
    let entry_path = get_entry_path(&app, &id)?;

    if !entry_path.exists() {
        return Ok(None);
    }

    let entry_data = fs::read_to_string(&entry_path)
        .map_err(|e| {
            format!(
                "Falha ao ler arquivo de entrada: {}",
                e
            )
        })?;

    let mut entry: DiaryEntry = serde_json::from_str(&entry_data)
        .map_err(|e| {
            format!(
                "Falha ao desserializar entrada: {}",
                e
            )
        })?;
    if normalize_diary_entry_owner(&mut entry, &owner_id)? {
        let normalized = serde_json::to_string_pretty(&entry).map_err(|e| e.to_string())?;
        fs::write(&entry_path, normalized).map_err(|e| e.to_string())?;
    }

    // Read content from Obsidian if it exists
    if let Ok(vault) = get_obsidian_diary_vault(&app) {
        let folder_name = get_folder_name(&app, &entry.folder_id);
        let file_title = sanitize_filename(&entry.title);
        let path = vault.join(&folder_name).join(format!("{}.md", file_title));
        if path.exists() {
            if let Ok(content) = fs::read_to_string(path) {
                entry.content = content;
                entry.word_count = entry.content.split_whitespace().count();
            }
        }
    }

    Ok(Some(entry))
}

#[tauri::command]
fn diary_create_folder(
    app: tauri::AppHandle,
    name: String,
    icon: String,
) -> Result<DiaryFolder, String> {
    let owner_id = current_owner()?;
    let folder_id = uuid::Uuid::new_v4().to_string();
    let now = chrono::Utc::now().to_rfc3339();

    // Load existing folders to determine order
    let mut folders = diary_list_folders(app.clone())?;
    let order = folders.len();

    let folder = DiaryFolder {
        id: folder_id.clone(),
        owner_id,
        name,
        icon,
        order,
        created_at: now.clone(),
    };

    // Add new folder to list
    folders.push(folder.clone());

    // Save updated folder list
    let folders_path = get_folders_path(&app)?;
    let json = serde_json::to_string_pretty(&folders)
        .map_err(|e| {
            format!("Falha ao serializar pastas: {}", e)
        })?;
    fs::write(&folders_path, json).map_err(|e| {
        format!("Falha ao salvar pastas: {}", e)
    })?;

    // Create Obsidian folder directory
    if let Ok(vault) = get_obsidian_diary_vault(&app) {
        let folder_dir = vault.join(sanitize_filename(&folder.name));
        fs::create_dir_all(&folder_dir).ok();
    }

    Ok(folder)
}

#[tauri::command]
fn diary_list_folders(
    app: tauri::AppHandle,
) -> Result<Vec<DiaryFolder>, String> {
    let owner_id = current_owner()?;
    let folders_path = get_folders_path(&app)?;

    // If file doesn't exist, return empty vector
    if !folders_path.exists() {
        return Ok(Vec::new());
    }

    let folders_data = fs::read_to_string(&folders_path)
        .map_err(|e| {
            format!("Falha ao ler arquivo de pastas: {}", e)
        })?;

    let mut folders: Vec<DiaryFolder> =
        serde_json::from_str(&folders_data).map_err(|e| {
            format!(
                "Falha ao desserializar pastas: {}",
                e
            )
        })?;

    let mut was_legacy = false;
    for folder in &mut folders {
        was_legacy |= normalize_diary_folder_owner(folder, &owner_id)?;
    }
    if was_legacy {
        let normalized = serde_json::to_string_pretty(&folders).map_err(|e| e.to_string())?;
        fs::write(&folders_path, normalized).map_err(|e| e.to_string())?;
    }

    Ok(folders)
}

#[tauri::command]
fn diary_delete_folder(
    app: tauri::AppHandle,
    id: String,
) -> Result<(), String> {
    // Load folders
    let mut folders = diary_list_folders(app.clone())?;

    // Find folder to delete
    let folder_index = folders
        .iter()
        .position(|f| f.id == id)
        .ok_or_else(|| "Pasta não encontrada".to_string())?;

    let folder_to_delete = folders.remove(folder_index);

    // Protect default "Geral" folder
    if folder_to_delete.name == "Geral"
        && folder_to_delete.icon == "📁"
    {
        return Err(
            "Não é permitido excluir a pasta Geral padrão"
                .to_string(),
        );
    }

    // Move entries from deleted folder to "Geral"
    let geral_folder = folders
        .iter()
        .find(|f| f.name == "Geral" && f.icon == "📁")
        .ok_or_else(|| {
            "Pasta Geral não encontrada".to_string()
        })?;

    let mut entries =
        diary_list_entries(app.clone(), None, None)?;

    let old_folder_name = sanitize_filename(&folder_to_delete.name);
    let new_folder_name = "Geral".to_string();
    let vault = get_obsidian_diary_vault(&app).ok();

    for entry in &mut entries {
        if entry.folder_id == id {
            entry.folder_id = geral_folder.id.clone();

            if let Some(ref v) = vault {
                let entry_title = sanitize_filename(&entry.title);
                let old_path = v.join(&old_folder_name).join(format!("{}.md", entry_title));
                let new_path = v.join(&new_folder_name).join(format!("{}.md", entry_title));
                if old_path.exists() {
                    if let Some(parent) = new_path.parent() {
                        fs::create_dir_all(parent).ok();
                    }
                    fs::rename(old_path, new_path).ok();
                }
            }

            // Update entry with new folder
            diary_update_entry(
                app.clone(),
                entry.id.clone(),
                None,
                None,
                Some(geral_folder.id.clone()),
                None,
                None,
            )?;
        }
    }

    if let Some(ref v) = vault {
        let old_dir = v.join(&old_folder_name);
        if old_dir.exists() {
            fs::remove_dir(old_dir).ok();
        }
    }

    // Update orders of remaining folders
    for (i, folder) in folders.iter_mut().enumerate() {
        folder.order = i;
    }

    // Save updated folder list
    let folders_path = get_folders_path(&app)?;
    let folders_json = serde_json::to_string_pretty(&folders)
        .map_err(|e| {
            format!("Falha ao serializar pastas: {}", e)
        })?;
    fs::write(&folders_path, folders_json).map_err(|e| {
        format!("Falha ao salvar pastas: {}", e)
    })?;

    Ok(())
}

#[tauri::command]
fn diary_save_tabs(
    app: tauri::AppHandle,
    open_ids: Vec<String>,
    active_id: Option<String>,
) -> Result<(), String> {
    let owner_id = current_owner()?;
    let tabs_state = DiaryTabsState {
        owner_id,
        open_tab_ids: open_ids,
        active_tab_id: active_id,
    };

    let tabs_path = get_tabs_path(&app)?;
    let json = serde_json::to_string_pretty(&tabs_state)
        .map_err(|e| {
            format!(
                "Falha ao serializar estado das abas: {}",
                e
            )
        })?;
    fs::write(&tabs_path, json).map_err(|e| {
        format!(
            "Falha ao salvar estado das abas: {}",
            e
        )
    })?;

    Ok(())
}

#[tauri::command]
fn diary_load_tabs(
    app: tauri::AppHandle,
) -> Result<DiaryTabsState, String> {
    let owner_id = current_owner()?;
    let tabs_path = get_tabs_path(&app)?;

    // If file doesn't exist, return default state
    if !tabs_path.exists() {
        return Ok(DiaryTabsState {
            owner_id,
            open_tab_ids: Vec::new(),
            active_tab_id: None,
        });
    }

    let tabs_data = fs::read_to_string(&tabs_path)
        .map_err(|e| {
            format!("Falha ao ler arquivo de abas: {}", e)
        })?;

    let mut tabs_state: DiaryTabsState =
        serde_json::from_str(&tabs_data).map_err(|e| {
            format!(
                "Falha ao desserializar estado das abas: {}",
                e
            )
        })?;

    if tabs_state.owner_id.is_empty() {
        tabs_state.owner_id = owner_id;
        let normalized = serde_json::to_string_pretty(&tabs_state).map_err(|e| e.to_string())?;
        fs::write(&tabs_path, normalized).map_err(|e| e.to_string())?;
    } else if tabs_state.owner_id != owner_id {
        return Err("O estado das abas pertence a outro propriet\u{e1}rio.".to_string());
    }

    Ok(tabs_state)
}

// ─── Obsidian Diary Commands ───

fn get_obsidian_diary_vault(_app: &tauri::AppHandle) -> Result<PathBuf, String> {
    let home = dirs_next::home_dir().ok_or("Não foi possível encontrar o diretório home")?;
    let _ = home;
    owner_diary_vault(&current_owner()?)
}

fn obsidian_date_parts(date: &str) -> Result<(&str, &str), String> {
    let bytes = date.as_bytes();
    let valid = bytes.len() == 10
        && bytes[4] == b'-'
        && bytes[7] == b'-'
        && bytes.iter().enumerate().all(|(index, byte)| matches!(index, 4 | 7) || byte.is_ascii_digit());
    if !valid {
        return Err("Data inv\u{e1}lida para o di\u{e1}rio.".to_string());
    }
    Ok((&date[..4], &date[5..7]))
}

#[tauri::command]
fn obsidian_diary_list_entries(app: tauri::AppHandle) -> Result<Vec<serde_json::Value>, String> {
    let owner_id = current_owner()?;
    let vault = get_obsidian_diary_vault(&app)?;
    let mut entries = Vec::new();
    if let Ok(years) = fs::read_dir(&vault) {
        for year in years.flatten() {
            if !year.file_type().map(|ft| ft.is_dir()).unwrap_or(false) { continue; }
            if let Ok(months) = fs::read_dir(year.path()) {
                for month in months.flatten() {
                    if !month.file_type().map(|ft| ft.is_dir()).unwrap_or(false) { continue; }
                    if let Ok(files) = fs::read_dir(month.path()) {
                        for file in files.flatten() {
                            if file.path().extension().and_then(|e| e.to_str()) == Some("md") {
                                let name = file.file_name().to_string_lossy().to_string();
                                let content = fs::read_to_string(file.path()).unwrap_or_default();
                                let date = name.replace(".md", "");
                                entries.push(serde_json::json!({
                                    "owner_id": owner_id,
                                    "date": date,
                                    "filename": name,
                                    "path": file.path().to_string_lossy().to_string(),
                                    "preview": content.lines().take(5).collect::<Vec<_>>().join("\n")
                                }));
                            }
                        }
                    }
                }
            }
        }
    }
    entries.sort_by(|a, b| b["date"].as_str().cmp(&a["date"].as_str()));
    Ok(entries)
}

#[tauri::command]
fn obsidian_diary_read_entry(app: tauri::AppHandle, date: String) -> Result<serde_json::Value, String> {
    let owner_id = current_owner()?;
    let vault = get_obsidian_diary_vault(&app)?;
    let (year, month) = obsidian_date_parts(&date)?;
    let path = vault.join(year).join(month).join(format!("{}.md", date));
    if !path.exists() {
        return Err(format!("Entrada não encontrada: {}", date));
    }
    let content = fs::read_to_string(&path).map_err(|e| e.to_string())?;
    Ok(serde_json::json!({
        "owner_id": owner_id,
        "date": date,
        "content": content,
        "path": path.to_string_lossy().to_string()
    }))
}

#[tauri::command]
fn obsidian_diary_save_entry(app: tauri::AppHandle, date: String, content: String) -> Result<(), String> {
    let vault = get_obsidian_diary_vault(&app)?;
    let (year, month) = obsidian_date_parts(&date)?;
    let dir = vault.join(year).join(month);
    fs::create_dir_all(&dir).map_err(|e| e.to_string())?;
    let path = dir.join(format!("{}.md", date));
    fs::write(path, content).map_err(|e| e.to_string())?;
    Ok(())
}

#[tauri::command]
fn obsidian_diary_delete_entry(app: tauri::AppHandle, date: String) -> Result<(), String> {
    let vault = get_obsidian_diary_vault(&app)?;
    let (year, month) = obsidian_date_parts(&date)?;
    let path = vault.join(year).join(month).join(format!("{}.md", date));
    if path.exists() {
        fs::remove_file(path).map_err(|e| e.to_string())?;
    }
    Ok(())
}

#[tauri::command]
fn obsidian_diary_get_vault_path(app: tauri::AppHandle) -> Result<String, String> {
    let vault = get_obsidian_diary_vault(&app)?;
    Ok(vault.to_string_lossy().to_string())
}

// ─── App Entry Point ───

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    // Arc compartilhado entre setup e cleanup
    let sidecar_for_setup = Arc::new(SidecarState::new());
    let sidecar_for_cleanup = sidecar_for_setup.clone();

    tauri::Builder::default()
        .plugin(tauri_plugin_opener::init())
        .plugin(tauri_plugin_fs::init())
        .plugin(tauri_plugin_dialog::init())
        .setup(move |app| {
            // 1. Carrega variáveis de ambiente uma única vez
            dotenvy::from_filename(".env").ok();
            dotenvy::from_filename(".env.local").ok();

            // 2. Cria http_client global com timeout generoso
            let http_client = reqwest::Client::builder()
                .timeout(std::time::Duration::from_secs(30))
                .build()
                .expect("Falha ao criar cliente HTTP global");

            let app_state = AppState {
                http_client,
            };
            app.manage(app_state);

            // 4. Inicia o sidecar Python FastAPI
            // Desenvolvimento: o motor vive na raiz do projeto. A instalação final
            // usará o executável empacotado; nunca um caminho acima da pasta atual.
            let api_path = app.path().resource_dir().map_err(|e| e.to_string())?.join("binaries").join("astro-engine-x86_64-pc-windows-msvc.exe");
            let data_dir = app.path().app_data_dir().map_err(|e| e.to_string())?.join("data");

            if api_path.exists() {
                if let Err(e) =
                    sidecar_for_setup.start(&api_path, &data_dir)
                {
                    eprintln!(
                        "[AureaSolaris] AVISO: Não foi possível iniciar sidecar: {}",
                        e
                    );
                    eprintln!(
                        "[AureaSolaris] O app funcionará, mas cálculos astrológicos falharão."
                    );
                }
            } else {
                eprintln!(
                    "[AureaSolaris] AVISO: main_api.py não encontrado em {:?}. Sidecar não iniciado.",
                    api_path
                );
            }

            // 5. Registra o SidecarState
            app.manage(sidecar_for_setup);

            // 6. Configura o Tray Icon
            let icon = app.default_window_icon().cloned().unwrap();
            let _tray = tauri::tray::TrayIconBuilder::new()
                .icon(icon)
                .tooltip("Aurea Solaris")
                .on_tray_icon_event(|tray, event| match event {
                    tauri::tray::TrayIconEvent::Click {
                        button: tauri::tray::MouseButton::Left,
                        button_state: tauri::tray::MouseButtonState::Up,
                        ..
                    } => {
                        let app = tray.app_handle();
                        if let Some(window) = app.get_webview_window("main") {
                            let _ = window.show();
                            let _ = window.set_focus();
                        }
                    }
                    _ => {}
                })
                .build(app);

            // 7. Intercepta fechar janela → minimize para tray
            if let Some(window) = app.get_webview_window("main") {
                let window_clone = window.clone();
                window.on_window_event(move |event| {
                    if let tauri::WindowEvent::CloseRequested { api, .. } = event {
                        api.prevent_close();
                        let _ = window_clone.hide();
                    }
                });
            }

            Ok(())
        })
        .invoke_handler(tauri::generate_handler![
            private_session_open,
            private_account_register,
            private_sidecar_request,
            private_session_close,
            remembered_owner_set,
            remembered_owner_get,
            remembered_owner_clear,
            save_board,
            load_board,
            list_boards,
            delete_board,
            load_health_memory,
            save_health_memory,
            get_sys_info,
            run_astro_engine,
            get_transit_positions,
            // Diary commands
            diary_create_entry,
            diary_update_entry,
            diary_delete_entry,
            diary_list_entries,
            diary_get_entry,
            diary_create_folder,
            diary_list_folders,
            diary_delete_folder,
            diary_save_tabs,
            diary_load_tabs,
            // Obsidian Diary commands
            obsidian_diary_list_entries,
            obsidian_diary_read_entry,
            obsidian_diary_save_entry,
            obsidian_diary_delete_entry,
            obsidian_diary_get_vault_path
        ])
        .build(tauri::generate_context!())
        .expect("error while running tauri application")
        .run(move |_app_handle, event| {
            if let tauri::RunEvent::Exit = event {
                // Cleanup: encerrar sidecar quando o app fecha
                sidecar_for_cleanup.stop();
            }
        });
}
