use std::fs;

use crate::private_session::{current_owner, get_mem_path, validate_private_id};

#[cfg(target_os = "windows")]
fn protect_for_windows_user(data: &[u8]) -> Result<Vec<u8>, String> {
    use windows::core::PCWSTR;
    use windows::Win32::Foundation::{LocalFree, HLOCAL};
    use windows::Win32::Security::Cryptography::{
        CryptProtectData, CRYPTPROTECT_UI_FORBIDDEN, CRYPT_INTEGER_BLOB,
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
        CryptUnprotectData, CRYPTPROTECT_UI_FORBIDDEN, CRYPT_INTEGER_BLOB,
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

fn remembered_owner_path(app: &tauri::AppHandle) -> Result<std::path::PathBuf, String> {
    get_mem_path(app, "auth/remembered_owner.dpapi")
}

#[tauri::command]
pub(crate) fn remembered_owner_set(
    app: tauri::AppHandle,
    owner_id: String,
) -> Result<bool, String> {
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
pub(crate) fn remembered_owner_get(app: tauri::AppHandle) -> Result<Option<String>, String> {
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
pub(crate) fn remembered_owner_clear(app: tauri::AppHandle) -> Result<bool, String> {
    let path = remembered_owner_path(&app)?;
    if path.exists() {
        fs::remove_file(path).map_err(|error| error.to_string())?;
    }
    Ok(true)
}
