use std::fs;
use std::path::PathBuf;

use serde::{Deserialize, Serialize};

use crate::legacy_migration::owner_diary_vault;
use crate::private_session::{current_owner, owner_mem_path, validate_private_id};

fn default_status() -> String {
    "idea".to_string()
}

#[derive(Serialize, Deserialize, Clone)]
pub struct DiaryEntry {
    pub id: String,
    #[serde(default)]
    pub owner_id: String,
    pub title: String,
    pub content: String, // Markdown plain text
    pub folder_id: String,
    pub created_at: String, // ISO 8601
    pub updated_at: String, // ISO 8601
    pub word_count: usize,
    #[serde(default = "default_status")]
    pub status: String, // "idea" | "draft" | "done"
}

#[derive(Serialize, Deserialize, Clone)]
pub struct DiaryFolder {
    pub id: String,
    #[serde(default)]
    pub owner_id: String,
    pub name: String,
    pub icon: String, // emoji
    pub order: usize,
    pub created_at: String, // ISO 8601
}

#[derive(Serialize, Deserialize, Clone)]
pub struct DiaryTabsState {
    #[serde(default)]
    pub owner_id: String,
    pub open_tab_ids: Vec<String>,
    pub active_tab_id: Option<String>,
}

fn sanitize_filename(name: &str) -> String {
    let invalid_chars = ['<', '>', ':', '"', '/', '\\', '|', '?', '*'];
    let mut sanitized: String = name
        .chars()
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

fn get_diary_dir(app: &tauri::AppHandle) -> Result<PathBuf, String> {
    let owner_id = current_owner()?;
    let dir = owner_mem_path(app, &owner_id, "diary")?;
    fs::create_dir_all(&dir).map_err(|e| format!("Falha ao criar diretório do diário: {}", e))?;
    Ok(dir)
}

fn get_entry_path(app: &tauri::AppHandle, entry_id: &str) -> Result<PathBuf, String> {
    validate_private_id(entry_id, "entry_id")?;
    let mut path = get_diary_dir(app)?;
    path.push("entries");
    path.push(format!("{}.json", entry_id));
    Ok(path)
}

fn get_folders_path(app: &tauri::AppHandle) -> Result<PathBuf, String> {
    let mut path = get_diary_dir(app)?;
    path.push("folders.json");
    Ok(path)
}

fn get_tabs_path(app: &tauri::AppHandle) -> Result<PathBuf, String> {
    let mut path = get_diary_dir(app)?;
    path.push("tabs.json");
    Ok(path)
}

fn ensure_default_folder(app: &tauri::AppHandle) -> Result<(), String> {
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
            .map_err(|e| format!("Falha ao serializar pastas: {}", e))?;
        fs::write(&folders_path, json).map_err(|e| format!("Falha ao salvar pastas: {}", e))?;
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
pub(crate) fn diary_create_entry(
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
        .map_err(|e| format!("Falha ao serializar entrada: {}", e))?;
    fs::write(&entry_path, json).map_err(|e| format!("Falha ao salvar entrada: {}", e))?;

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
pub(crate) fn diary_update_entry(
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
    let entry_data =
        fs::read_to_string(&entry_path).map_err(|e| format!("Falha ao ler entrada: {}", e))?;
    let mut entry: DiaryEntry = serde_json::from_str(&entry_data)
        .map_err(|e| format!("Falha ao desserializar entrada: {}", e))?;
    normalize_diary_entry_owner(&mut entry, &owner_id)?;

    let resolved_folder_id = folder_id.or(folderId);

    // Calculate old Obsidian file path
    let old_folder_name = get_folder_name(&app, &entry.folder_id);
    let old_file_title = sanitize_filename(&entry.title);
    let vault = get_obsidian_diary_vault(&app).ok();
    let old_obsidian_path = vault.as_ref().map(|v| {
        v.join(&old_folder_name)
            .join(format!("{}.md", old_file_title))
    });

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
        .map_err(|e| format!("Falha ao serializar entrada atualizada: {}", e))?;
    fs::write(&entry_path, json)
        .map_err(|e| format!("Falha ao salvar entrada atualizada: {}", e))?;

    // Update in Obsidian
    if let Some(ref v) = vault {
        let new_folder_name = get_folder_name(&app, &entry.folder_id);
        let new_file_title = sanitize_filename(&entry.title);
        let new_obsidian_path = v
            .join(&new_folder_name)
            .join(format!("{}.md", new_file_title));

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
pub(crate) fn diary_delete_entry(app: tauri::AppHandle, id: String) -> Result<(), String> {
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

    fs::remove_file(&entry_path).map_err(|e| format!("Falha ao excluir entrada: {}", e))?;
    Ok(())
}

#[tauri::command]
#[allow(non_snake_case)]
pub(crate) fn diary_list_entries(
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
    for entry in fs::read_dir(&entries_dir)
        .map_err(|e| format!("Falha ao ler diretório de entradas: {}", e))?
    {
        let entry_path = entry
            .map_err(|e| format!("Falha ao obter entrada do diretório: {}", e))?
            .path();

        if entry_path.extension().and_then(|s| s.to_str()) == Some("json") {
            let entry_data = fs::read_to_string(&entry_path)
                .map_err(|e| format!("Falha ao ler arquivo de entrada: {}", e))?;

            let mut entry: DiaryEntry = serde_json::from_str(&entry_data)
                .map_err(|e| format!("Falha ao desserializar entrada: {}", e))?;
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
pub(crate) fn diary_get_entry(
    app: tauri::AppHandle,
    id: String,
) -> Result<Option<DiaryEntry>, String> {
    let owner_id = current_owner()?;
    let entry_path = get_entry_path(&app, &id)?;

    if !entry_path.exists() {
        return Ok(None);
    }

    let entry_data = fs::read_to_string(&entry_path)
        .map_err(|e| format!("Falha ao ler arquivo de entrada: {}", e))?;

    let mut entry: DiaryEntry = serde_json::from_str(&entry_data)
        .map_err(|e| format!("Falha ao desserializar entrada: {}", e))?;
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
pub(crate) fn diary_create_folder(
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
        .map_err(|e| format!("Falha ao serializar pastas: {}", e))?;
    fs::write(&folders_path, json).map_err(|e| format!("Falha ao salvar pastas: {}", e))?;

    // Create Obsidian folder directory
    if let Ok(vault) = get_obsidian_diary_vault(&app) {
        let folder_dir = vault.join(sanitize_filename(&folder.name));
        fs::create_dir_all(&folder_dir).ok();
    }

    Ok(folder)
}

#[tauri::command]
pub(crate) fn diary_list_folders(app: tauri::AppHandle) -> Result<Vec<DiaryFolder>, String> {
    let owner_id = current_owner()?;
    let folders_path = get_folders_path(&app)?;

    // If file doesn't exist, return empty vector
    if !folders_path.exists() {
        return Ok(Vec::new());
    }

    let folders_data = fs::read_to_string(&folders_path)
        .map_err(|e| format!("Falha ao ler arquivo de pastas: {}", e))?;

    let mut folders: Vec<DiaryFolder> = serde_json::from_str(&folders_data)
        .map_err(|e| format!("Falha ao desserializar pastas: {}", e))?;

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
pub(crate) fn diary_delete_folder(app: tauri::AppHandle, id: String) -> Result<(), String> {
    // Load folders
    let mut folders = diary_list_folders(app.clone())?;

    // Find folder to delete
    let folder_index = folders
        .iter()
        .position(|f| f.id == id)
        .ok_or_else(|| "Pasta não encontrada".to_string())?;

    let folder_to_delete = folders.remove(folder_index);

    // Protect default "Geral" folder
    if folder_to_delete.name == "Geral" && folder_to_delete.icon == "📁" {
        return Err("Não é permitido excluir a pasta Geral padrão".to_string());
    }

    // Move entries from deleted folder to "Geral"
    let geral_folder = folders
        .iter()
        .find(|f| f.name == "Geral" && f.icon == "📁")
        .ok_or_else(|| "Pasta Geral não encontrada".to_string())?;

    let mut entries = diary_list_entries(app.clone(), None, None)?;

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
        .map_err(|e| format!("Falha ao serializar pastas: {}", e))?;
    fs::write(&folders_path, folders_json).map_err(|e| format!("Falha ao salvar pastas: {}", e))?;

    Ok(())
}

#[tauri::command]
pub(crate) fn diary_save_tabs(
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
        .map_err(|e| format!("Falha ao serializar estado das abas: {}", e))?;
    fs::write(&tabs_path, json).map_err(|e| format!("Falha ao salvar estado das abas: {}", e))?;

    Ok(())
}

#[tauri::command]
pub(crate) fn diary_load_tabs(app: tauri::AppHandle) -> Result<DiaryTabsState, String> {
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
        .map_err(|e| format!("Falha ao ler arquivo de abas: {}", e))?;

    let mut tabs_state: DiaryTabsState = serde_json::from_str(&tabs_data)
        .map_err(|e| format!("Falha ao desserializar estado das abas: {}", e))?;

    if tabs_state.owner_id.is_empty() {
        tabs_state.owner_id = owner_id;
        let normalized = serde_json::to_string_pretty(&tabs_state).map_err(|e| e.to_string())?;
        fs::write(&tabs_path, normalized).map_err(|e| e.to_string())?;
    } else if tabs_state.owner_id != owner_id {
        return Err("O estado das abas pertence a outro propriet\u{e1}rio.".to_string());
    }

    Ok(tabs_state)
}

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
        && bytes
            .iter()
            .enumerate()
            .all(|(index, byte)| matches!(index, 4 | 7) || byte.is_ascii_digit());
    if !valid {
        return Err("Data inv\u{e1}lida para o di\u{e1}rio.".to_string());
    }
    Ok((&date[..4], &date[5..7]))
}

#[tauri::command]
pub(crate) fn obsidian_diary_list_entries(
    app: tauri::AppHandle,
) -> Result<Vec<serde_json::Value>, String> {
    let owner_id = current_owner()?;
    let vault = get_obsidian_diary_vault(&app)?;
    let mut entries = Vec::new();
    if let Ok(years) = fs::read_dir(&vault) {
        for year in years.flatten() {
            if !year.file_type().map(|ft| ft.is_dir()).unwrap_or(false) {
                continue;
            }
            if let Ok(months) = fs::read_dir(year.path()) {
                for month in months.flatten() {
                    if !month.file_type().map(|ft| ft.is_dir()).unwrap_or(false) {
                        continue;
                    }
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
pub(crate) fn obsidian_diary_read_entry(
    app: tauri::AppHandle,
    date: String,
) -> Result<serde_json::Value, String> {
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
pub(crate) fn obsidian_diary_save_entry(
    app: tauri::AppHandle,
    date: String,
    content: String,
) -> Result<(), String> {
    let vault = get_obsidian_diary_vault(&app)?;
    let (year, month) = obsidian_date_parts(&date)?;
    let dir = vault.join(year).join(month);
    fs::create_dir_all(&dir).map_err(|e| e.to_string())?;
    let path = dir.join(format!("{}.md", date));
    fs::write(path, content).map_err(|e| e.to_string())?;
    Ok(())
}

#[tauri::command]
pub(crate) fn obsidian_diary_delete_entry(
    app: tauri::AppHandle,
    date: String,
) -> Result<(), String> {
    let vault = get_obsidian_diary_vault(&app)?;
    let (year, month) = obsidian_date_parts(&date)?;
    let path = vault.join(year).join(month).join(format!("{}.md", date));
    if path.exists() {
        fs::remove_file(path).map_err(|e| e.to_string())?;
    }
    Ok(())
}

#[tauri::command]
pub(crate) fn obsidian_diary_get_vault_path(app: tauri::AppHandle) -> Result<String, String> {
    let vault = get_obsidian_diary_vault(&app)?;
    Ok(vault.to_string_lossy().to_string())
}
