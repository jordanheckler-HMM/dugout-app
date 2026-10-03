#[cfg(desktop)]
use std::{
  io::{Read, Write},
  net::{SocketAddr, TcpListener, TcpStream},
  sync::{atomic::{AtomicU8, Ordering}, Arc, Mutex},
  time::{Duration, Instant},
};
#[cfg(desktop)]
use tauri::Manager;
#[cfg(desktop)]
use tauri_plugin_dialog::{DialogExt, MessageDialogKind};
#[cfg(desktop)]
use tauri_plugin_shell::{process::{CommandChild, CommandEvent}, ShellExt};

#[cfg(desktop)]
struct BackendProcess {
  child: Mutex<Option<CommandChild>>,
  status: Arc<AtomicU8>,
}

#[cfg(desktop)]
fn show_backend_error(app: &tauri::AppHandle, title: &str, message: String) {
  if let Some(window) = app.get_webview_window("main") {
    let _ = window.hide();
  }
  let exit_handle = app.clone();
  app.dialog()
    .message(message)
    .kind(MessageDialogKind::Error)
    .title(title)
    .show(move |_| exit_handle.exit(1));
}

#[cfg(desktop)]
fn backend_is_ready(instance_id: &str) -> bool {
  let address = SocketAddr::from(([127, 0, 0, 1], 8100));
  let Ok(mut stream) = TcpStream::connect_timeout(&address, Duration::from_millis(500)) else {
    return false;
  };
  let _ = stream.set_read_timeout(Some(Duration::from_millis(500)));
  let _ = stream.set_write_timeout(Some(Duration::from_millis(500)));
  if stream.write_all(b"GET / HTTP/1.1\r\nHost: 127.0.0.1\r\nConnection: close\r\n\r\n").is_err() {
    return false;
  }
  let mut response = String::new();
  let _ = stream.read_to_string(&mut response);
  let Some((headers, body)) = response.split_once("\r\n\r\n") else {
    return false;
  };
  headers.starts_with("HTTP/1.1 200")
    && serde_json::from_str::<serde_json::Value>(body)
      .ok()
      .and_then(|json| json["instance_id"].as_str().map(str::to_owned))
      .as_deref() == Some(instance_id)
}

#[cfg(desktop)]
fn start_backend(app: &mut tauri::App) -> Result<(), Box<dyn std::error::Error>> {
  let data_dir = app.path().app_data_dir()?.join("data");
  std::fs::create_dir_all(&data_dir)?;

  // An updater relaunch can begin while the old one-file sidecar child is
  // still exiting. Give it a short window to release the port, then surface
  // a genuine conflict instead of opening against another backend instance.
  let port_deadline = Instant::now() + Duration::from_secs(5);
  loop {
    match TcpListener::bind(("127.0.0.1", 8100)) {
      Ok(port_guard) => {
        drop(port_guard);
        break;
      }
      Err(error) if error.kind() == std::io::ErrorKind::AddrInUse && Instant::now() < port_deadline => {
        std::thread::sleep(Duration::from_millis(100));
      }
      Err(error) => {
        return Err(std::io::Error::new(error.kind(), format!("Cannot use backend port 8100: {error}")).into());
      }
    }
  }

  let instance_id = uuid::Uuid::new_v4().to_string();
  let (mut events, child) = app.shell().sidecar("backend-sidecar")?
    .env("DUGOUT_BACKEND_PORT", "8100")
    .env("DUGOUT_DATA_DIR", data_dir.to_string_lossy().to_string())
    .env("DUGOUT_INSTANCE_ID", &instance_id)
    .env("DUGOUT_HOST_PID", std::process::id().to_string())
    .spawn()?;

  // Keep draining the sidecar pipes so a chatty backend cannot block on stdout.
  let status = Arc::new(AtomicU8::new(0)); // starting, ready, closing, exited
  let event_status = Arc::clone(&status);
  let app_handle = app.handle().clone();
  tauri::async_runtime::spawn(async move {
    while let Some(event) = events.recv().await {
      if let CommandEvent::Terminated(exit) = event {
        let previous = event_status.swap(3, Ordering::SeqCst);
        if previous == 1 {
          log::error!("Dugout backend exited unexpectedly: {:?}", exit.code);
          show_backend_error(&app_handle, "Dugout backend stopped",
            "The local data service stopped. Reopen Dugout to continue.".into());
        }
        break;
      }
    }
  });

  let deadline = Instant::now() + Duration::from_secs(30);
  while !backend_is_ready(&instance_id) {
    if status.load(Ordering::SeqCst) == 3 || Instant::now() >= deadline {
      let _ = child.kill();
      return Err(std::io::Error::other("The local data service did not start on port 8100").into());
    }
    std::thread::sleep(Duration::from_millis(100));
  }
  if status.compare_exchange(0, 1, Ordering::SeqCst, Ordering::SeqCst).is_err() {
    return Err(std::io::Error::other("The local data service exited during startup").into());
  }
  app.manage(BackendProcess { child: Mutex::new(Some(child)), status });
  Ok(())
}

#[cfg(desktop)]
fn stop_backend(app: &tauri::AppHandle) {
  if let Some(backend) = app.try_state::<BackendProcess>() {
    backend.status.store(2, Ordering::SeqCst);
    if let Ok(mut child) = backend.child.lock() {
      if let Some(child) = child.take() {
        if let Err(error) = child.kill() {
          log::error!("Could not stop Dugout backend: {error}");
        }
      }
    }
  }
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
  let app = tauri::Builder::default()
    .plugin(tauri_plugin_shell::init())
    .plugin(tauri_plugin_dialog::init())
    .plugin(tauri_plugin_log::Builder::default()
      .level(log::LevelFilter::Warn)
      .build())
    .setup(|app| {
      #[cfg(desktop)]
      {
        let startup: Result<(), Box<dyn std::error::Error>> = (|| {
          app.handle().plugin(tauri_plugin_updater::Builder::new().build())?;
          app.handle().plugin(tauri_plugin_process::init())?;
          start_backend(app)?;
          app.get_webview_window("main")
            .ok_or_else(|| std::io::Error::other("Dugout window was not created"))?
            .show()?;
          Ok(())
        })();
        if let Err(error) = startup {
          log::error!("Dugout startup failed: {error}");
          show_backend_error(app.handle(), "Dugout could not start",
            format!("Dugout could not start its local data service.\n\n{error}\n\nClose any other Dugout window or service using port 8100, then reopen the app."));
        }
      }
      Ok(())
    })
    .build(tauri::generate_context!())
    .expect("error while starting Dugout");

  app.run(|app_handle, event| {
    #[cfg(desktop)]
    match event {
      tauri::RunEvent::WindowEvent { label, event: tauri::WindowEvent::Destroyed, .. }
        if label == "main" => {
          stop_backend(app_handle);
          app_handle.exit(0);
        }
      tauri::RunEvent::ExitRequested { .. } | tauri::RunEvent::Exit => {
        stop_backend(app_handle);
      }
      _ => {}
    }
  });
}
