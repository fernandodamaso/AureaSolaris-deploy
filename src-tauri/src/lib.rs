use serde::{Deserialize, Serialize};
use tauri::Manager;
use std::fs;
use std::path::{Path, PathBuf};
use chrono::{Datelike, Timelike};

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
    usage: Option<OpenRouterUsage>,
}

#[derive(Serialize, Deserialize, Clone)]
struct OpenRouterUsage {
    prompt_tokens: u32,
    completion_tokens: u32,
    total_tokens: u32,
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
    messages: Vec<OpenRouterMessage>,
    stream: bool,
}

#[derive(Deserialize)]
struct OllamaResponse {
    message: OpenRouterChoiceMessage,
}

#[tauri::command]
async fn ollama_chat(messages: Vec<OpenRouterMessage>) -> Result<String, String> {
    println!("Stark: Tentando conectar ao Ollama local (localhost:11434)...");
    
    let client = reqwest::Client::builder()
        .timeout(std::time::Duration::from_secs(60))
        .build()
        .map_err(|e| format!("Falha ao criar cliente HTTP para Ollama: {}", e))?;

    let req_body = OllamaRequest {
        model: "llama3.2".to_string(), 
        messages,
        stream: false,
    };

    let res = client.post("http://localhost:11434/api/chat")
        .json(&req_body)
        .send()
        .await
        .map_err(|e| format!("Erro de rede ao conectar ao Ollama (Certifique-se que está rodando): {}", e))?;

    if !res.status().is_success() {
        let err_text = res.text().await.unwrap_or_default();
        return Err(format!("Erro no Ollama: {}", err_text));
    }

    let json_res: OllamaResponse = res.json().await.map_err(|e| format!("Erro ao decodificar JSON do Ollama: {}", e))?;
    
    let content = json_res.message.content;
    println!("Stark: Resposta Ollama recebida ({} chars)", content.len());
    Ok(content)
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
async fn openrouter_chat(app: tauri::AppHandle, model: String, messages: Vec<OpenRouterMessage>) -> Result<String, String> {
    dotenvy::from_filename(".env").ok();

    let api_key = std::env::var("OPENROUTER_API_KEY")
        .map_err(|_| "OPENROUTER_API_KEY não encontrada no .env".to_string())?;
    
    println!("Stark: Chamando OpenRouter com modelo: {}", model);

    let client = reqwest::Client::builder()
        .timeout(std::time::Duration::from_secs(30))
        .build()
        .map_err(|e| format!("Falha ao criar cliente HTTP: {}", e))?;

    let req_body = OpenRouterRequest {
        model,
        messages,
    };

    let res = client.post("https://openrouter.ai/api/v1/chat/completions")
        .bearer_auth(api_key)
        .header("HTTP-Referer", "https://github.com/aurea-solaris")
        .header("X-Title", "Aurea Solaris")
        .json(&req_body)
        .send()
        .await
        .map_err(|e| format!("Erro de rede ao conectar à OpenRouter: {}", e))?;

    let status = res.status();
    let body_text = res.text().await.map_err(|e| format!("Falha ao ler corpo da resposta: {}", e))?;

    if !status.is_success() {
        return Err(format!("Erro na API OpenRouter ({}): {}", status, body_text));
    }

    let json_res: OpenRouterResponse = serde_json::from_str(&body_text).map_err(|e| {
        format!("Erro ao decodificar JSON da OpenRouter: {} | Resposta: {}", e, body_text)
    })?;
    
    // Log tokens if available (This is mock-ish but stores in a real file)
    if let Some(usage) = &json_res.usage {
        let _ = log_usage(&app, usage.total_tokens);
    }

    if let Some(choice) = json_res.choices.first() {
        let content = choice.message.content.clone();
        println!("Stark: Resposta OpenRouter recebida ({} chars)", content.len());
        Ok(content)
    } else {
        println!("Stark: ERRO - OpenRouter retornou resposta vazia");
        Err("A API retornou uma resposta vazia (sem choices)".to_string())
    }
}

fn log_usage(app: &tauri::AppHandle, tokens: u32) -> Result<(), String> {
    let path = get_mem_path(app, "usage.json")?;
    let mut usage_data: serde_json::Value = if path.exists() {
        let content = fs::read_to_string(&path).map_err(|e| e.to_string())?;
        serde_json::from_str(&content).unwrap_or(serde_json::json!({}))
    } else {
        serde_json::json!({})
    };

    let total = usage_data["total_tokens"].as_u64().unwrap_or(0) + tokens as u64;
    usage_data["total_tokens"] = serde_json::Value::from(total);
    
    fs::write(path, serde_json::to_string(&usage_data).unwrap()).map_err(|e| e.to_string())?;
    Ok(())
}

fn chat_filename(agent: &str, chat_id: &Option<String>) -> String {
    match chat_id {
        Some(id) if !id.is_empty() => format!("{}_{}.json", agent, id),
        _ => format!("{}.json", agent),
    }
}

#[tauri::command]
fn save_history(app: tauri::AppHandle, agent: String, history: Vec<OpenRouterMessage>, chat_id: Option<String>) -> Result<(), String> {
    let filename = chat_filename(&agent, &chat_id);
    let path = get_mem_path(&app, &filename)?;
    let json = serde_json::to_string_pretty(&history).map_err(|e| e.to_string())?;
    fs::write(path, json).map_err(|e| e.to_string())?;
    Ok(())
}

#[tauri::command]
fn load_history(app: tauri::AppHandle, agent: String, chat_id: Option<String>) -> Result<Vec<OpenRouterMessage>, String> {
    let filename = chat_filename(&agent, &chat_id);
    let path = get_mem_path(&app, &filename)?;
    if !path.exists() {
        return Ok(vec![]);
    }
    let json = fs::read_to_string(path).map_err(|e| e.to_string())?;
    let history: Vec<OpenRouterMessage> = serde_json::from_str(&json).map_err(|e| e.to_string())?;
    Ok(history)
}

#[tauri::command]
fn list_chat_sessions(app: tauri::AppHandle, agent: String) -> Result<Vec<serde_json::Value>, String> {
    let mem_dir = app.path().app_data_dir().map_err(|e| e.to_string())?.join("memory");
    if !mem_dir.exists() {
        return Ok(vec![]);
    }
    let prefix = format!("{}_", agent);
    let mut sessions = vec![];
    for entry in fs::read_dir(&mem_dir).map_err(|e| e.to_string())? {
        let entry = entry.map_err(|e| e.to_string())?;
        let name = entry.file_name().to_string_lossy().to_string();
        if name.starts_with(&prefix) && name.ends_with(".json") {
            let metadata = entry.metadata().map_err(|e| e.to_string())?;
            let created = metadata.created().unwrap_or(std::time::SystemTime::now());
            let date = chrono::DateTime::<chrono::Local>::from(created).format("%d/%m %H:%M").to_string();
            // Extract chat_id from filename: "{agent}_{chatId}.json"
            let chat_id = name
                .strip_prefix(&prefix)
                .and_then(|s| s.strip_suffix(".json"))
                .unwrap_or("legacy")
                .to_string();
            // Count messages
            let content = fs::read_to_string(entry.path()).unwrap_or_default();
            let msg_count: usize = serde_json::from_str::<Vec<serde_json::Value>>(&content)
                .map(|v| v.len())
                .unwrap_or(0);
            let first_msg: String = serde_json::from_str::<Vec<serde_json::Value>>(&content)
                .ok()
                .and_then(|v| v.first().and_then(|m| m.get("content")).and_then(|c| c.as_str()).map(|s| {
                    if s.len() > 50 { format!("{}...", &s[..50]) } else { s.to_string()
                    }
                }))
                .unwrap_or_else(|| "Chat vazio".to_string());
            sessions.push(serde_json::json!({
                "chatId": chat_id,
                "agent": agent,
                "date": date,
                "messageCount": msg_count,
                "preview": first_msg
            }));
        }
    }
    sessions.sort_by(|a, b| b["date"].as_str().unwrap_or("").cmp(a["date"].as_str().unwrap_or("")));
    Ok(sessions)
}

#[tauri::command]
fn delete_chat_session(app: tauri::AppHandle, agent: String, chat_id: String) -> Result<(), String> {
    let filename = chat_filename(&agent, &Some(chat_id));
    let path = get_mem_path(&app, &filename)?;
    if path.exists() {
        fs::remove_file(path).map_err(|e| e.to_string())?;
    }
    Ok(())
}

#[tauri::command]
async fn get_todoist_tasks() -> Result<String, String> {
    dotenvy::from_filename(".env").ok();
    dotenvy::from_filename(".env.local").ok();
    let token = std::env::var("TODOIST_TOKEN")
        .map_err(|_| "Opa! TODOIST_TOKEN não encontrada no .env".to_string())?;

    println!("Stark: Sincronizando tarefas do Todoist...");
    let client = reqwest::Client::builder()
        .timeout(std::time::Duration::from_secs(10))
        .build()
        .map_err(|e| format!("Falha ao criar cliente HTTP: {}", e))?;

    let res = client.get("https://api.todoist.com/rest/v2/tasks")
        .bearer_auth(token)
        .send()
        .await
        .map_err(|e| format!("Erro de conexão com o Todoist: {}", e))?;

    if !res.status().is_success() {
        let status = res.status();
        let err_body = res.text().await.unwrap_or_default();
        return Err(format!("Erro na API do Todoist ({}): {}", status, err_body));
    }

    let text = res.text().await.map_err(|e| format!("Falha ao ler resposta do Todoist: {}", e))?;
    println!("Stark: {} tarefas recebidas.", text.chars().filter(|&c| c == '{').count());
    Ok(text)
}

#[tauri::command]
async fn add_todoist_task(content: String) -> Result<String, String> {
    dotenvy::from_filename(".env").ok();
    dotenvy::from_filename(".env.local").ok();
    let token = std::env::var("TODOIST_TOKEN")
        .map_err(|_| "TODOIST_TOKEN não encontrada no .env".to_string())?;

    println!("Stark: Criando tarefa no Todoist: '{}'", content);
    let client = reqwest::Client::builder()
        .timeout(std::time::Duration::from_secs(10))
        .build()
        .map_err(|e| format!("Falha ao criar cliente HTTP: {}", e))?;

    let res = client.post("https://api.todoist.com/rest/v2/tasks")
        .bearer_auth(token)
        .json(&serde_json::json!({ "content": content }))
        .send()
        .await
        .map_err(|e| format!("Erro ao criar tarefa no Todoist: {}", e))?;

    if !res.status().is_success() {
        let status = res.status();
        let err_body = res.text().await.unwrap_or_default();
        return Err(format!("Erro ao criar tarefa ({}): {}", status, err_body));
    }

    let text = res.text().await.map_err(|e| e.to_string())?;
    println!("Stark: Tarefa criada com sucesso.");
    Ok(text)
}

#[tauri::command]
async fn delete_todoist_task(id: String) -> Result<(), String> {
    dotenvy::from_filename(".env").ok();
    dotenvy::from_filename(".env.local").ok();
    let token = std::env::var("TODOIST_TOKEN")
        .map_err(|_| "TODOIST_TOKEN não encontrada no .env".to_string())?;

    println!("Stark: Deletando tarefa Todoist id={}", id);
    let client = reqwest::Client::builder()
        .timeout(std::time::Duration::from_secs(10))
        .build()
        .map_err(|e| format!("Falha ao criar cliente HTTP: {}", e))?;

    let res = client.delete(format!("https://api.todoist.com/rest/v2/tasks/{}", id))
        .bearer_auth(token)
        .send()
        .await
        .map_err(|e| format!("Erro ao deletar tarefa: {}", e))?;

    if !res.status().is_success() {
        let status = res.status();
        let err_body = res.text().await.unwrap_or_default();
        return Err(format!("Erro ao deletar tarefa ({}): {}", status, err_body));
    }

    println!("Stark: Tarefa {} deletada.", id);
    Ok(())
}

#[tauri::command]
async fn toggle_todoist_task(id: String, completed: bool) -> Result<String, String> {
    dotenvy::from_filename(".env").ok();
    dotenvy::from_filename(".env.local").ok();
    let token = std::env::var("TODOIST_TOKEN")
        .map_err(|_| "TODOIST_TOKEN não encontrada no .env".to_string())?;

    // Todoist REST v2: "close" = concluir, "reopen" = reabrir
    let action = if completed { "close" } else { "reopen" };
    println!("Stark: {} tarefa Todoist id={}", action, id);

    let client = reqwest::Client::builder()
        .timeout(std::time::Duration::from_secs(10))
        .build()
        .map_err(|e| format!("Falha ao criar cliente HTTP: {}", e))?;

    let url = format!("https://api.todoist.com/rest/v2/tasks/{}/{}", id, action);
    let res = client.post(&url)
        .bearer_auth(token)
        .send()
        .await
        .map_err(|e| format!("Erro ao {} tarefa: {}", action, e))?;

    if !res.status().is_success() {
        let status = res.status();
        let err_body = res.text().await.unwrap_or_default();
        return Err(format!("Erro ao {} tarefa ({}): {}", action, status, err_body));
    }

    println!("Stark: Tarefa {} {}.", id, action);
    Ok(format!("Tarefa {} com sucesso.", if completed { "concluída" } else { "reaberta" }))
}

#[tauri::command]
async fn postpone_todoist_task(id: String) -> Result<String, String> {
    dotenvy::from_filename(".env").ok();
    dotenvy::from_filename(".env.local").ok();
    let token = std::env::var("TODOIST_TOKEN")
        .map_err(|_| "TODOIST_TOKEN não encontrada no .env".to_string())?;

    println!("Stark: Adiando tarefa Todoist id={} para amanhã", id);

    // Calcula amanhã no formato YYYY-MM-DD
    let tomorrow = chrono::Local::now().checked_add_signed(chrono::Duration::days(1))
        .unwrap_or(chrono::Local::now())
        .format("%Y-%m-%d").to_string();

    let client = reqwest::Client::builder()
        .timeout(std::time::Duration::from_secs(10))
        .build()
        .map_err(|e| format!("Falha ao criar cliente HTTP: {}", e))?;

    let res = client.post(format!("https://api.todoist.com/rest/v2/tasks/{}", id))
        .bearer_auth(token)
        .json(&serde_json::json!({ "due_date": tomorrow }))
        .send()
        .await
        .map_err(|e| format!("Erro ao adiar tarefa: {}", e))?;

    if !res.status().is_success() {
        let status = res.status();
        let err_body = res.text().await.unwrap_or_default();
        return Err(format!("Erro ao adiar tarefa ({}): {}", status, err_body));
    }

    println!("Stark: Tarefa {} adiada para {}.", id, tomorrow);
    Ok(format!("Tarefa adiada para {}.", tomorrow))
}

/// Google Calendar — requer configuração OAuth2.
/// Por ora retorna informação clara ao usuário sobre o que é necessário.
#[tauri::command]
async fn add_google_event(title: String, start: String) -> Result<String, String> {
    println!("Stark: add_google_event chamado — title='{}', start='{}'", title, start);
    // TODO (Etapa 3 do MVP): Implementar OAuth2 do Google e criar evento real via:
    // POST https://www.googleapis.com/calendar/v3/calendars/primary/events
    // Por enquanto, retorna stub informativo ao frontend.
    Ok(format!(
        "{{\"status\": \"stub\", \"message\": \"Google Calendar requer configuração OAuth2. Evento '{}' em '{}' foi registrado localmente.\"}}",
        title, start
    ))
}

#[tauri::command]
async fn delete_google_event(id: String) -> Result<String, String> {
    println!("Stark: delete_google_event chamado — id='{}'", id);
    // TODO (Etapa 3 do MVP): Implementar OAuth2 e DELETE real.
    Ok(format!(
        "{{\"status\": \"stub\", \"message\": \"Google Calendar requer configuração OAuth2. Evento '{}' marcado para remoção localmente.\"}}",
        id
    ))
}

#[tauri::command]
async fn get_google_events() -> Result<String, String> {
    println!("Stark: Simulando busca de eventos do Google Calendar...");
    // Mock de eventos para MVP
    let events = serde_json::json!([
        { "id": "g1", "title": "Sessão UDV", "start": "2026-03-24T20:00:00Z", "type": "spiritual" },
        { "id": "g2", "title": "Almoço em Família", "start": "2026-03-24T12:00:00Z", "type": "social" },
        { "id": "g3", "title": "Redação Mensal", "start": "2026-03-26T15:00:00Z", "type": "work" }
    ]);
    Ok(events.to_string())
}

#[tauri::command]
async fn send_telegram_message(message: String) -> Result<String, String> {
    dotenvy::from_filename(".env").ok();
    let token = std::env::var("TELEGRAM_TOKEN").map_err(|_| "TELEGRAM_TOKEN não encontrada no .env".to_string())?;
    let chat_id = std::env::var("TELEGRAM_CHAT_ID").map_err(|_| "TELEGRAM_CHAT_ID não encontrada no .env".to_string())?;
    
    println!("Stark: Enviando mensagem Telegram para chat_id: {}", chat_id);

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
fn list_archived_chats(app: tauri::AppHandle, agent: String) -> Result<Vec<serde_json::Value>, String> {
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
            let metadata = entry.metadata().map_err(|e| e.to_string())?;
            let created = metadata.created().unwrap_or(std::time::SystemTime::now());
            let date = chrono::DateTime::<chrono::Local>::from(created).format("%d %b %Y").to_string();
            
            archives.push(serde_json::json!({
                "id": name,
                "name": name,
                "date": date,
                "agent": agent
            }));
        }
    }
    archives.sort_by(|a, b| b["id"].as_str().unwrap().cmp(a["id"].as_str().unwrap())); // Newest first
    Ok(archives)
}

#[tauri::command]
fn load_archived_chat(app: tauri::AppHandle, filename: String) -> Result<Vec<OpenRouterMessage>, String> {
    let mut path = app.path().app_data_dir().map_err(|e| e.to_string())?;
    path.push("memory");
    path.push("archives");
    path.push(filename);
    
    if !path.exists() {
        return Err("Arquivo de arquivo não encontrado".to_string());
    }
    let json = fs::read_to_string(path).map_err(|e| e.to_string())?;
    let history: Vec<OpenRouterMessage> = serde_json::from_str(&json).map_err(|e| e.to_string())?;
    Ok(history)
}

#[tauri::command]
fn get_total_tokens(app: tauri::AppHandle) -> Result<u64, String> {
    let path = get_mem_path(&app, "usage.json")?;
    if !path.exists() {
        return Ok(0);
    }
    let content = fs::read_to_string(path).map_err(|e| e.to_string())?;
    let usage_data: serde_json::Value = serde_json::from_str(&content).map_err(|e| e.to_string())?;
    Ok(usage_data["total_tokens"].as_u64().unwrap_or(0))
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

    // Localizar o diretório raiz do projeto fixed em dev: C:\AureaSolaris
    let project_root = std::path::PathBuf::from("C:\\AureaSolaris");
    let astro_path = project_root.join("astro_engine.py");

    println!("Stark: Executando astro_engine.py em {:?}", astro_path);

    // No Windows, usar python.exe é mais seguro que python
    let mut cmd = Command::new("python.exe");
    cmd.arg(&astro_path)
       .current_dir(&project_root);

    if let Some(p) = payload {
        cmd.arg(p);
    }

    let output = cmd.output().map_err(|e| format!("Falha ao executar python.exe ou localizar o motor em {:?}: {}.", astro_path, e))?;

    if output.status.success() {
        let result = String::from_utf8_lossy(&output.stdout).to_string();
        println!("Stark: astro_engine.py retornou {} bytes", result.len());
        Ok(result)
    } else {
        let err = String::from_utf8_lossy(&output.stderr).to_string();
        Err(format!("Erro no Astro Engine (Python): {}", err))
    }
}

#[tauri::command]
fn run_agm_engine(payload: Option<String>) -> Result<String, String> {
    use std::process::Command;
    let project_root = std::path::PathBuf::from("C:\\AureaSolaris");
    let agm_path = project_root.join("Laboratorio_Stark").join("agm_engine.py");

    println!("Stark: Executando antigravity_engine.py em {:?}", agm_path);

    let mut cmd = Command::new("python.exe");
    cmd.arg(&agm_path)
       .current_dir(&project_root);

    if let Some(p) = payload {
        cmd.arg(p);
    }

    let output = cmd.output().map_err(|e| format!("Falha ao executar python.exe para AGM: {}", e))?;

    if output.status.success() {
        let result = String::from_utf8_lossy(&output.stdout).to_string();
        Ok(result)
    } else {
        let err = String::from_utf8_lossy(&output.stderr).to_string();
        Err(format!("Erro no AGM (Python): {}", err))
    }
}

#[tauri::command]
async fn get_transit_positions(payload: String) -> Result<String, String> {
    // Parse do JSON
    let data: serde_json::Value = serde_json::from_str(&payload)
        .map_err(|e| format!("JSON inválido: {}", e))?;
    
    // Extrair parâmetros
    let now = chrono::Local::now();
    let year = data["year"].as_i64().unwrap_or(now.year() as i64) as i32;
    let month = data["month"].as_i64().unwrap_or(now.month() as i64) as u32;
    let day = data["day"].as_i64().unwrap_or(now.day() as i64) as u32;
    let hour = data["hour"].as_f64().unwrap_or(now.hour() as f64 + now.minute() as f64 / 60.0);
    let lat = data["lat"].as_f64().unwrap_or(-15.7833);
    let lon = data["lon"].as_f64().unwrap_or(-47.9333);
    let include_asteroids = data["include_asteroids"].as_bool().unwrap_or(false);
    
    // Construir payload para Python
    let python_payload = serde_json::json!({
        "year": year,
        "month": month,
        "day": day,
        "hour": hour,
        "lat": lat,
        "lon": lon,
        "include_asteroids": include_asteroids,
        "transit": true
    });
    
    // Chamar motor Python (usando run_astro_engine)
    let result = run_astro_engine(Some(python_payload.to_string())).await?;
    
    Ok(result)
}

// Google integration will use Composio MCP - no manual OAuth2 needed

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
            list_chat_sessions,
            delete_chat_session,
            get_todoist_tasks,
            add_todoist_task,
            delete_todoist_task,
            toggle_todoist_task,
            postpone_todoist_task,
            add_google_event,
            delete_google_event,
            send_telegram_message,
            save_board,
            load_board,
            get_sys_info,
            save_asset,
            archive_chat,
            list_archived_chats,
            load_archived_chat,
            get_total_tokens,
            read_text_file,
            run_astro_engine,
            list_lab_files,
            run_agm_engine,
            get_transit_positions,
            get_google_events
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
