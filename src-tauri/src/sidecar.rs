#[cfg(target_os = "windows")]
use std::os::windows::process::CommandExt;
use std::path::Path;
use std::process::Child;
use std::sync::Mutex;

use tauri::State;

pub(crate) const ASTRO_API_URL: &str = "http://127.0.0.1:9876";

pub(crate) struct AppState {
    pub http_client: reqwest::Client,
}

pub(crate) struct SidecarState {
    child: Mutex<Option<Child>>,
    token: String,
}

impl SidecarState {
    pub fn new() -> Self {
        Self {
            child: Mutex::new(None),
            token: uuid::Uuid::new_v4().to_string(),
        }
    }

    pub fn start(&self, api_path: &Path, data_dir: &Path) -> Result<(), String> {
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

        let child = command
            .spawn()
            .map_err(|e| format!("Falha ao iniciar sidecar: {}", e))?;

        *guard = Some(child);
        println!("[AureaSolaris] Sidecar Python iniciado (PID esperado na porta 9876)");
        Ok(())
    }

    pub fn stop(&self) {
        if let Ok(mut guard) = self.child.lock() {
            if let Some(ref mut child) = *guard {
                let _ = child.kill();
                println!("[AureaSolaris] Sidecar Python encerrado.");
            }
            *guard = None;
        }
    }

    pub fn token(&self) -> &str {
        &self.token
    }
}

/// Verifica se o sidecar FastAPI está respondendo na porta 9876.
async fn check_sidecar_health(client: &reqwest::Client) -> Result<(), String> {
    let res = client
        .get(format!("{}/health", ASTRO_API_URL))
        .send()
        .await
        .map_err(|e| format!("Sidecar não está acessível em {}: {}", ASTRO_API_URL, e))?;

    if res.status().is_success() {
        Ok(())
    } else {
        Err(format!(
            "Sidecar health check falhou (status {})",
            res.status()
        ))
    }
}

#[tauri::command]
pub(crate) async fn run_astro_engine(
    state: State<'_, AppState>,
    payload: Option<String>,
) -> Result<String, String> {
    // 1. Health check rápido
    check_sidecar_health(&state.http_client).await?;

    // 2. Parse do payload (aceita JSON ou None)
    let body: serde_json::Value = match payload {
        Some(ref p) => {
            serde_json::from_str(p).map_err(|e| format!("JSON inválido no payload: {}", e))?
        }
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
        .map_err(|e| format!("Erro de rede ao conectar ao sidecar: {}", e))?;

    let status = res.status();
    let text = res
        .text()
        .await
        .map_err(|e| format!("Falha ao ler resposta do sidecar: {}", e))?;

    if status.is_success() {
        println!("Stark: sidecar retornou {} bytes", text.len());
        Ok(text)
    } else {
        Err(format!("Erro no sidecar ({}): {}", status, text))
    }
}

/// Obtém as posições de trânsito planetário para uma data e local
/// específicos.
///
/// Injeta `transit: true` no payload e delega para
/// `run_astro_engine`.
#[tauri::command]
pub(crate) async fn get_transit_positions(
    state: State<'_, AppState>,
    payload: String,
) -> Result<String, String> {
    // Injeta "transit": true no payload se não estiver presente
    let mut data: serde_json::Value =
        serde_json::from_str(&payload).map_err(|e| format!("JSON inválido: {}", e))?;

    if data.get("transit").and_then(|v| v.as_bool()) != Some(true) {
        data["transit"] = serde_json::json!(true);
    }

    run_astro_engine(state, Some(data.to_string())).await
}

#[tauri::command]
pub(crate) fn get_sys_info() -> Result<serde_json::Value, String> {
    let load = sys_info::loadavg().map(|l| l.one).unwrap_or(0.0);
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
