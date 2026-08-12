use std::fs;
use std::path::PathBuf;
use std::sync::{Arc, Mutex, OnceLock};

use tauri::{Manager, State};

use crate::legacy_migration::migrate_legacy_private_data;
use crate::sidecar::{AppState, SidecarState, ASTRO_API_URL};

static ACTIVE_OWNER: OnceLock<Mutex<Option<String>>> = OnceLock::new();

pub(crate) fn get_mem_path(app: &tauri::AppHandle, filename: &str) -> Result<PathBuf, String> {
    let mut path = app.path().app_data_dir().map_err(|e| e.to_string())?;
    path.push("memory");
    if !path.exists() {
        fs::create_dir_all(&path).map_err(|e| e.to_string())?;
    }
    path.push(filename);
    Ok(path)
}

pub(crate) fn validate_private_id(value: &str, label: &str) -> Result<(), String> {
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

pub(crate) fn current_owner() -> Result<String, String> {
    ACTIVE_OWNER
        .get_or_init(|| Mutex::new(None))
        .lock()
        .map_err(|_| "A sessão privada está indisponível.".to_string())?
        .clone()
        .ok_or_else(|| "Nenhum proprietário autenticado nesta sessão.".to_string())
}

pub(crate) fn owner_mem_path(
    app: &tauri::AppHandle,
    owner_id: &str,
    relative_path: &str,
) -> Result<PathBuf, String> {
    validate_private_id(owner_id, "owner_id")?;
    get_mem_path(app, &format!("owners/{}/{}", owner_id, relative_path))
}

pub(crate) async fn sidecar_private_request(
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
        .header("X-Aurea-Sidecar-Token", sidecar.token())
        .query(&query_pairs);
    if !payload.is_null() {
        request = request.json(&payload);
    }
    let response = request
        .send()
        .await
        .map_err(|error| format!("Falha ao acessar o armazenamento privado: {}", error))?;
    let status = response.status();
    let response_body: serde_json::Value = response
        .json()
        .await
        .map_err(|error| format!("Resposta privada inválida: {}", error))?;
    if !status.is_success() {
        let detail = response_body
            .get("detail")
            .and_then(|value| value.get("error").or(Some(value)))
            .and_then(|value| value.as_str())
            .unwrap_or("A operação privada falhou.");
        return Err(detail.to_string());
    }
    Ok(response_body)
}

#[tauri::command]
pub(crate) async fn private_session_open(
    app: tauri::AppHandle,
    state: State<'_, AppState>,
    sidecar: State<'_, Arc<SidecarState>>,
    owner_id: String,
    login_name: String,
    password: String,
) -> Result<String, String> {
    validate_private_id(&owner_id, "owner_id")?;
    let response = state
        .http_client
        .post(format!("{}/hermes/auth/login", ASTRO_API_URL))
        .header("X-Aurea-Sidecar-Token", sidecar.token())
        .json(&serde_json::json!({ "login_name": login_name, "password": password }))
        .send()
        .await
        .map_err(|error| format!("Não foi possível autenticar o perfil local: {}", error))?;
    let status = response.status();
    let account: serde_json::Value = response.json().await.map_err(|error| error.to_string())?;
    if !status.is_success()
        || account.get("account_id").and_then(|value| value.as_str()) != Some(owner_id.as_str())
    {
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
pub(crate) async fn private_account_register(
    app: tauri::AppHandle,
    state: State<'_, AppState>,
    sidecar: State<'_, Arc<SidecarState>>,
    owner_id: String,
    display_name: String,
    login_name: String,
    password: String,
) -> Result<String, String> {
    validate_private_id(&owner_id, "owner_id")?;
    let response = state
        .http_client
        .post(format!("{}/hermes/auth/register", ASTRO_API_URL))
        .header("X-Aurea-Sidecar-Token", sidecar.token())
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
    if !status.is_success()
        || account.get("account_id").and_then(|value| value.as_str()) != Some(owner_id.as_str())
    {
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
pub(crate) async fn private_sidecar_request(
    state: State<'_, AppState>,
    sidecar: State<'_, Arc<SidecarState>>,
    method: String,
    path: String,
    query: Option<serde_json::Value>,
    body: Option<serde_json::Value>,
) -> Result<serde_json::Value, String> {
    let method = method
        .parse::<reqwest::Method>()
        .map_err(|_| "Método HTTP privado inválido.".to_string())?;
    sidecar_private_request(&state, sidecar.inner().as_ref(), method, &path, query, body).await
}

#[tauri::command]
pub(crate) fn private_session_close() -> Result<(), String> {
    let mut active = ACTIVE_OWNER
        .get_or_init(|| Mutex::new(None))
        .lock()
        .map_err(|_| "Não foi possível encerrar a sessão privada.".to_string())?;
    *active = None;
    Ok(())
}
