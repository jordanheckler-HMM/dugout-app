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
        use tauri::Manager;
        use tauri_plugin_shell::ShellExt;

        // Get or create the writable data directory for the backend
        let app_data_dir = app.path().app_data_dir().unwrap_or_else(|_| {
            std::env::current_dir().unwrap_or_default()
        });
        let dugout_data_dir = app_data_dir.join("data");
        
        // Ensure the directory exists
        if let Err(e) = std::fs::create_dir_all(&dugout_data_dir) {
            log::error!("Failed to create data directory: {}", e);
        }

        match app
          .shell()
          .sidecar("backend-sidecar")
        {
          Ok(cmd) => {
            let cmd = cmd
                .env("DUGOUT_BACKEND_PORT", "8100")
                .env("DUGOUT_DATA_DIR", dugout_data_dir.to_string_lossy().to_string());
            
            match cmd.spawn() {
              Ok((_rx, child)) => {
                log::info!("Backend sidecar started successfully (Data: {:?})", dugout_data_dir);
                // We must store or 'leak' the child handle so it isn't dropped and killed immediately
                // In a real app, you might store this in a tauri::State, 
                // but for a sidecar we want to run as long as the app, this is effective:
                std::mem::forget(child);
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
