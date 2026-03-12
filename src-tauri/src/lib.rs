use serde::{Deserialize, Serialize};
use tauri::Manager;
use std::fs;
use std::path::{Path, PathBuf};

#[derive(Serialize, Deserialize, Clone)]
struct OpenRouterMessage {
    role: String,
    content: String,
}

#[derive(Serialize)]
struct OpenRouterRequest {
    model: String,
    messages: Vec<OpenRouterMessage>,
}

#[derive(Deserialize)]
struct OpenRouterResponse {
    choices: Vec<OpenRouterChoice>,
}

#[derive(Deserialize)]
struct OpenRouterChoice {
    message: OpenRouterChoiceMessage,
}

#[derive(Deserialize)]
struct OpenRouterChoiceMessage {
    content: String,
}

#[derive(Serialize)]
struct OllamaRequest {
    model: String,
    prompt: String,
    stream: bool,
}

#[derive(Deserialize)]
struct OllamaResponse {
    response: String,
}

// Helpers for paths
fn get_mem_path(app: &tauri::AppHandle, filename: &str) -> Result<PathBuf, String> {
    let mut path = app.path().app_data_dir().map_err(|e| e.to_string())?;
    path.push("memory");
    if !path.exists() {
        fs::create_dir_all(&path).map_err(|e| e.to_string())?;
    }
    path.push(filename);
    Ok(path)
}

fn get_assets_path(app: &tauri::AppHandle, filename: &str) -> Result<PathBuf, String> {
    let mut path = app.path().app_data_dir().map_err(|e| e.to_string())?;
    path.push("assets");
    if !path.exists() {
        fs::create_dir_all(&path).map_err(|e| e.to_string())?;
    }
    path.push(filename);
    Ok(path)
}

#[tauri::command]
async fn openrouter_chat(model: String, messages: Vec<OpenRouterMessage>) -> Result<String, String> {
    dotenvy::from_filename(".env.local").ok();
    let api_key = std::env::var("OPENROUTER_API_KEY").map_err(|_| "OPENROUTER_API_KEY não encontrada".to_string())?;

    let client = reqwest::Client::new();
    let req_body = OpenRouterRequest {
        model,
        messages,
    };

    let res = client.post("https://openrouter.ai/api/v1/chat/completions")
        .bearer_auth(api_key)
        .json(&req_body)
        .send()
        .await
        .map_err(|e| e.to_string())?;

    let status = res.status();
    let body_text = res.text().await.map_err(|e| e.to_string())?;

    if !status.is_success() {
        return Err(format!("Erro API ({}): {}", status, body_text));
    }

    let json_res: OpenRouterResponse = serde_json::from_str(&body_text).map_err(|e| {
        format!("Erro ao processar JSON: {} | Body: {}", e, body_text)
    })?;
    
    if let Some(choice) = json_res.choices.first() {
        Ok(choice.message.content.clone())
    } else {
        Err("Sem resposta no JSON".to_string())
    }
}

#[tauri::command]
async fn ollama_chat(prompt: String) -> Result<String, String> {
    let client = reqwest::Client::new();
    let req_body = OllamaRequest {
        model: "llama3.2".to_string(), // Modelo leve padrão para testes
        prompt,
        stream: false,
    };

    let res = client.post("http://localhost:11434/api/generate")
        .json(&req_body)
        .send()
        .await
        .map_err(|e| e.to_string())?;

    let json_res: OllamaResponse = res.json().await.map_err(|e| e.to_string())?;
    
    Ok(json_res.response)
}

#[tauri::command]
fn save_history(app: tauri::AppHandle, agent: String, history: Vec<OpenRouterMessage>) -> Result<(), String> {
    let path = get_mem_path(&app, &format!("{}.json", agent))?;
    let json = serde_json::to_string_pretty(&history).map_err(|e| e.to_string())?;
    fs::write(path, json).map_err(|e| e.to_string())?;
    Ok(())
}

#[tauri::command]
fn load_history(app: tauri::AppHandle, agent: String) -> Result<Vec<OpenRouterMessage>, String> {
    let path = get_mem_path(&app, &format!("{}.json", agent))?;
    if !path.exists() {
        return Ok(vec![]);
    }
    let json = fs::read_to_string(path).map_err(|e| e.to_string())?;
    let history: Vec<OpenRouterMessage> = serde_json::from_str(&json).map_err(|e| e.to_string())?;
    Ok(history)
}

#[tauri::command]
async fn get_todoist_tasks() -> Result<String, String> {
    dotenvy::from_filename(".env.local").ok();
    let token = std::env::var("TODOIST_TOKEN").map_err(|_| "TODOIST_TOKEN não encontrada".to_string())?;

    let client = reqwest::Client::new();
    let res = client.get("https://api.todoist.com/rest/v2/tasks")
        .bearer_auth(token)
        .send()
        .await
        .map_err(|e| e.to_string())?;

    let text = res.text().await.map_err(|e| e.to_string())?;
    Ok(text)
}

#[tauri::command]
async fn send_telegram_message(message: String) -> Result<String, String> {
    dotenvy::from_filename(".env.local").ok();
    let token = std::env::var("TELEGRAM_TOKEN").map_err(|_| "TELEGRAM_TOKEN não encontrada".to_string())?;
    let chat_id = std::env::var("TELEGRAM_CHAT_ID").map_err(|_| "TELEGRAM_CHAT_ID não encontrada".to_string())?;

    let client = reqwest::Client::new();
    let url = format!("https://api.telegram.org/bot{}/sendMessage", token);
    let res = client.post(url)
        .json(&serde_json::json!({
            "chat_id": chat_id,
            "text": message
        }))
        .send()
        .await
        .map_err(|e| e.to_string())?;

    let text = res.text().await.map_err(|e| e.to_string())?;
    Ok(text)
}

#[tauri::command]
fn save_board(app: tauri::AppHandle, nodes: serde_json::Value, edges: serde_json::Value) -> Result<(), String> {
    let path = get_mem_path(&app, "board.json")?;
    let data = serde_json::json!({
        "nodes": nodes,
        "edges": edges
    });
    let json = serde_json::to_string_pretty(&data).map_err(|e| e.to_string())?;
    fs::write(path, json).map_err(|e| e.to_string())?;
    Ok(())
}

#[tauri::command]
fn load_board(app: tauri::AppHandle) -> Result<serde_json::Value, String> {
    let path = get_mem_path(&app, "board.json")?;
    if !path.exists() {
        return Ok(serde_json::json!({"nodes": [], "edges": []}));
    }
    let json = fs::read_to_string(path).map_err(|e| e.to_string())?;
    let data = serde_json::from_str(&json).map_err(|e| e.to_string())?;
    Ok(data)
}

#[tauri::command]
fn save_asset(app: tauri::AppHandle, source_path: String, filename: String) -> Result<String, String> {
    let target_path = get_assets_path(&app, &filename)?;
    fs::copy(&source_path, &target_path).map_err(|e| e.to_string())?;
    Ok(target_path.to_string_lossy().to_string())
}

#[tauri::command]
fn get_sys_info() -> Result<serde_json::Value, String> {
    let load = sys_info::loadavg().map(|l| l.one).unwrap_or(0.0);
    let mem = sys_info::mem_info().map(|m| (m.total - m.free) as f64 / 1024.0 / 1024.0).unwrap_or(0.0);
    let disk = sys_info::disk_info().map(|d| d.free as f64 / 1024.0 / 1024.0).unwrap_or(0.0);
    
    Ok(serde_json::json!({
        "cpu_load": format!("{:.1}%", load * 10.0),
        "ram_usage": format!("{:.1} GB", mem),
        "disk_free": format!("{:.0} GB", disk)
    }))
}

#[tauri::command]
fn list_archived_chats(app: tauri::AppHandle, agent: String) -> Result<Vec<String>, String> {
    let mut path = app.path().app_data_dir().map_err(|e| e.to_string())?;
    path.push("memory");
    path.push("archives");
    if !path.exists() {
        return Ok(vec![]);
    }
    let mut archives = vec![];
    for entry in fs::read_dir(path).map_err(|e| e.to_string())? {
        let entry = entry.map_err(|e| e.to_string())?;
        let name = entry.file_name().to_string_lossy().to_string();
        if name.starts_with(&agent) && name.ends_with(".json") {
            archives.push(name);
        }
    }
    archives.sort_by(|a, b| b.cmp(a)); // Newest first
    Ok(archives)
}

#[tauri::command]
fn archive_chat(app: tauri::AppHandle, agent: String) -> Result<(), String> {
    let source_path = get_mem_path(&app, &format!("{}.json", agent))?;
    if !source_path.exists() {
        return Ok(()); // Nothing to archive
    }
    
    let mut target_dir = app.path().app_data_dir().map_err(|e| e.to_string())?;
    target_dir.push("memory");
    target_dir.push("archives");
    if !target_dir.exists() {
        fs::create_dir_all(&target_dir).map_err(|e| e.to_string())?;
    }

    let timestamp = chrono::Local::now().format("%Y%m%d_%H%M%S").to_string();
    let target_path = target_dir.join(format!("{}_{}.json", agent, timestamp));
    
    fs::rename(source_path, target_path).map_err(|e| e.to_string())?;
    Ok(())
}

#[tauri::command]
fn list_lab_files() -> Result<Vec<serde_json::Value>, String> {
    let path = Path::new("C:\\AureaSolaris\\Laboratorio_Stark");
    if !path.exists() {
        fs::create_dir_all(path).map_err(|e| e.to_string())?;
    }
    let mut files = vec![];
    for entry in fs::read_dir(path).map_err(|e| e.to_string())? {
        let entry = entry.map_err(|e| e.to_string())?;
        let metadata = entry.metadata().map_err(|e| e.to_string())?;
        files.push(serde_json::json!({
            "name": entry.file_name().to_string_lossy(),
            "isDirectory": metadata.is_dir(),
            "size": metadata.len(),
            "path": entry.path().to_string_lossy()
        }));
    }
    Ok(files)
}

#[tauri::command]
fn read_text_file(path: String) -> Result<String, String> {
    fs::read_to_string(path).map_err(|e| e.to_string())
}

#[tauri::command]
async fn run_astro_engine(payload: Option<String>) -> Result<String, String> {
    use std::process::Command;
    // On Windows, it's safer to use python.exe
    let mut cmd = Command::new("python.exe");
    cmd.arg("astro_engine.py");
    if let Some(p) = payload {
        cmd.arg(p);
    }
    
    let output = cmd.output().map_err(|e| format!("Falha ao executar comando: {}", e))?;
    
    if output.status.success() {
        Ok(String::from_utf8_lossy(&output.stdout).to_string())
    } else {
        let err = String::from_utf8_lossy(&output.stderr).to_string();
        Err(format!("Erro no Astro Engine (Python): {}", err))
    }
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_opener::init())
        .plugin(tauri_plugin_fs::init())
        .plugin(tauri_plugin_dialog::init())
        .invoke_handler(tauri::generate_handler![
            openrouter_chat, 
            ollama_chat, 
            save_history, 
            load_history, 
            get_todoist_tasks, 
            send_telegram_message,
            save_board,
            load_board,
            get_sys_info,
            save_asset,
            archive_chat,
            list_archived_chats,
            read_text_file,
            run_astro_engine,
            list_lab_files
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
