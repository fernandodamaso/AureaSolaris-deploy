use std::fs;
use std::path::{Path, PathBuf};

use crate::private_session::{get_mem_path, owner_mem_path, validate_private_id};

pub(crate) fn owner_diary_vault(owner_id: &str) -> Result<PathBuf, String> {
    validate_private_id(owner_id, "owner_id")?;
    let home = dirs_next::home_dir().ok_or("Não foi possível encontrar o diretório do usuário.")?;
    Ok(home
        .join("Documents")
        .join("AureaSolarisDiary-private")
        .join(owner_id))
}

pub(crate) fn copy_dir_without_overwrite(
    source: &Path,
    destination: &Path,
) -> Result<usize, String> {
    if !source.exists() {
        return Ok(0);
    }
    fs::create_dir_all(destination).map_err(|error| error.to_string())?;
    let mut copied = 0;
    for entry in fs::read_dir(source).map_err(|error| error.to_string())? {
        let entry = entry.map_err(|error| error.to_string())?;
        let source_path = entry.path();
        let destination_path = destination.join(entry.file_name());
        if entry
            .file_type()
            .map_err(|error| error.to_string())?
            .is_dir()
        {
            copied += copy_dir_without_overwrite(&source_path, &destination_path)?;
        } else if !destination_path.exists() {
            fs::copy(&source_path, &destination_path).map_err(|error| error.to_string())?;
            copied += 1;
        }
    }
    Ok(copied)
}

pub(crate) fn migrate_legacy_private_data(
    app: &tauri::AppHandle,
    owner_id: &str,
) -> Result<(), String> {
    validate_private_id(owner_id, "owner_id")?;
    let ledger_path = get_mem_path(app, "migrations/legacy-personal-v1.json")?;
    if let Some(parent) = ledger_path.parent() {
        fs::create_dir_all(parent).map_err(|error| error.to_string())?;
    }

    let claimed_owner = if ledger_path.exists() {
        let raw = fs::read_to_string(&ledger_path).map_err(|error| error.to_string())?;
        serde_json::from_str::<serde_json::Value>(&raw)
            .ok()
            .and_then(|value| {
                value
                    .get("owner_id")
                    .and_then(|owner| owner.as_str())
                    .map(str::to_owned)
            })
    } else {
        None
    };
    if claimed_owner
        .as_deref()
        .is_some_and(|claimed| claimed != owner_id)
    {
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

    let legacy_vault =
        dirs_next::home_dir().map(|home| home.join("Documents").join("AureaSolarisDiary"));
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
