#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
  tauri::Builder::default()
    .plugin(tauri_plugin_fs::init())
    .plugin(tauri_plugin_shell::init())
    .setup(|app| {
      // Initialize the updater plugin (desktop only)
      #[cfg(desktop)]
      app.handle().plugin(tauri_plugin_updater::Builder::new().build())?;

      // Initialize the process plugin for relaunch after updates
      #[cfg(desktop)]
      app.handle().plugin(tauri_plugin_process::init())?;

      #[cfg(desktop)]
      {
        use tauri_plugin_shell::ShellExt;
        match app
          .shell()
          .sidecar("backend-sidecar")
        {
          Ok(cmd) => {
            let cmd = cmd.env("DUGOUT_BACKEND_PORT", "8100");
            match cmd.spawn() {
              Ok((_rx, _child)) => {
                log::info!("Backend sidecar started successfully");
              }
              Err(e) => {
                log::warn!("Failed to spawn backend sidecar: {}. AI features will be unavailable.", e);
              }
            }
          }
          Err(e) => {
            log::warn!("Backend sidecar binary not found: {}. AI features will be unavailable.", e);
          }
        }
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
