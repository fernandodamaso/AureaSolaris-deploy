mod boards;
mod diary;
mod legacy_migration;
mod private_session;
mod sidecar;
mod windows_secrets;

use std::sync::Arc;

use tauri::Manager;

// ─── App Entry Point ───

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    // Arc compartilhado entre setup e cleanup
    let sidecar_for_setup = Arc::new(sidecar::SidecarState::new());
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

            let app_state = sidecar::AppState { http_client };
            app.manage(app_state);

            // 4. Inicia o sidecar Python FastAPI
            // Desenvolvimento: o motor vive na raiz do projeto. A instalação final
            // usará o executável empacotado; nunca um caminho acima da pasta atual.
            let api_path = app
                .path()
                .resource_dir()
                .map_err(|e| e.to_string())?
                .join("binaries")
                .join("astro-engine-x86_64-pc-windows-msvc.exe");
            let data_dir = app
                .path()
                .app_data_dir()
                .map_err(|e| e.to_string())?
                .join("data");

            if api_path.exists() {
                if let Err(e) = sidecar_for_setup.start(&api_path, &data_dir) {
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
            private_session::private_session_open,
            private_session::private_account_register,
            private_session::private_sidecar_request,
            private_session::private_session_close,
            windows_secrets::remembered_owner_set,
            windows_secrets::remembered_owner_get,
            windows_secrets::remembered_owner_clear,
            boards::save_board,
            boards::load_board,
            boards::list_boards,
            boards::delete_board,
            boards::load_health_memory,
            boards::save_health_memory,
            sidecar::get_sys_info,
            sidecar::run_astro_engine,
            sidecar::get_transit_positions,
            // Diary commands
            diary::diary_create_entry,
            diary::diary_update_entry,
            diary::diary_delete_entry,
            diary::diary_list_entries,
            diary::diary_get_entry,
            diary::diary_create_folder,
            diary::diary_list_folders,
            diary::diary_delete_folder,
            diary::diary_save_tabs,
            diary::diary_load_tabs,
            // Obsidian Diary commands
            diary::obsidian_diary_list_entries,
            diary::obsidian_diary_read_entry,
            diary::obsidian_diary_save_entry,
            diary::obsidian_diary_delete_entry,
            diary::obsidian_diary_get_vault_path
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
