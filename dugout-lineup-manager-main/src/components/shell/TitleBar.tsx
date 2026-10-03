import { Minus, Square, X } from "lucide-react";

async function withWindow(action: "minimize" | "toggleMaximize" | "close") {
  if (!("__TAURI_INTERNALS__" in window)) return;
  const { getCurrentWindow } = await import("@tauri-apps/api/window");
  const appWindow = getCurrentWindow();
  if (action === "minimize") await appWindow.minimize();
  if (action === "toggleMaximize") await appWindow.toggleMaximize();
  if (action === "close") await appWindow.close();
}

export function TitleBar({ title }: { title: string }) {
  return (
    <header className="titlebar" data-tauri-drag-region>
      <div className="flex items-center gap-2 min-w-0" data-tauri-drag-region>
        <span className="diamond-mark" aria-hidden data-tauri-drag-region />
        <span className="text-[13px] font-semibold tracking-tight" data-tauri-drag-region>Dugout</span>
        <span className="text-[12px] text-muted-foreground truncate" data-tauri-drag-region>{title}</span>
      </div>
      <div className="flex items-stretch h-full">
        <button type="button" className="window-button" aria-label="Minimize" onClick={() => void withWindow("minimize")}>
          <Minus />
        </button>
        <button type="button" className="window-button" aria-label="Maximize" onClick={() => void withWindow("toggleMaximize")}>
          <Square />
        </button>
        <button type="button" className="window-button window-button-close" aria-label="Close" onClick={() => void withWindow("close")}>
          <X />
        </button>
      </div>
    </header>
  );
}
