#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
  tauri::Builder::default()
    .plugin(tauri_plugin_fs::init())
    .plugin(tauri_plugin_shell::init())
    .setup(|app| {
      #[cfg(desktop)]
      {
        use tauri_plugin_shell::ShellExt;
        let sidecar_command = app
          .shell()
          .sidecar("backend-sidecar")
          .unwrap()
          .env("DUGOUT_BACKEND_PORT", "8100");
        let (mut _rx, _child) = sidecar_command.spawn().expect("Failed to spawn sidecar");
      }

      if cfg!(debug_assertions) {
        app.handle().plugin(
          tauri_plugin_log::Builder::default()
            .level(log::LevelFilter::Info)
            .build(),
        )?;
      }
      Ok(())
    })
    .run(tauri::generate_context!())
    .expect("error while running tauri application");
}
