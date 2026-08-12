use std::fs;

use crate::private_session::{current_owner, owner_mem_path, validate_private_id};

#[tauri::command]
pub(crate) fn save_board(
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
pub(crate) fn load_board(
    app: tauri::AppHandle,
    board_id: String,
) -> Result<serde_json::Value, String> {
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
pub(crate) fn list_boards(app: tauri::AppHandle) -> Result<serde_json::Value, String> {
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
pub(crate) fn delete_board(app: tauri::AppHandle, board_id: String) -> Result<(), String> {
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
        let mut entries: Vec<serde_json::Value> = serde_json::from_str(&raw).unwrap_or_default();
        entries.retain(|e| e.get("id").and_then(|v| v.as_str()) != Some(&board_id));
        let index_json = serde_json::to_string_pretty(&entries).map_err(|e| e.to_string())?;
        fs::write(&index_path, index_json).map_err(|e| e.to_string())?;
    }

    Ok(())
}

#[tauri::command]
pub(crate) fn load_health_memory(
    app: tauri::AppHandle,
    profile_id: String,
) -> Result<serde_json::Value, String> {
    let owner_id = current_owner()?;
    validate_private_id(&profile_id, "profile_id")?;
    let path = owner_mem_path(
        &app,
        &owner_id,
        &format!("health/{}_memory.json", profile_id),
    )?;
    if !path.exists() {
        return Ok(serde_json::json!([]));
    }
    let json = fs::read_to_string(path).map_err(|e| e.to_string())?;
    let data = serde_json::from_str(&json).unwrap_or_else(|_| serde_json::json!([]));
    Ok(data)
}

#[tauri::command]
pub(crate) fn save_health_memory(
    app: tauri::AppHandle,
    profile_id: String,
    memory: serde_json::Value,
) -> Result<(), String> {
    let owner_id = current_owner()?;
    validate_private_id(&profile_id, "profile_id")?;
    let path = owner_mem_path(
        &app,
        &owner_id,
        &format!("health/{}_memory.json", profile_id),
    )?;
    if let Some(parent) = path.parent() {
        fs::create_dir_all(parent).map_err(|e| e.to_string())?;
    }
    let json = serde_json::to_string_pretty(&memory).map_err(|e| e.to_string())?;
    fs::write(path, json).map_err(|e| e.to_string())?;
    Ok(())
}
