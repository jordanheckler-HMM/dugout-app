export function TitleBar({ title }: { title: string }) {
  return (
    <header className="titlebar" data-tauri-drag-region>
      <div className="flex items-center gap-2 min-w-0" data-tauri-drag-region>
        <span className="diamond-mark" aria-hidden data-tauri-drag-region />
        <span className="text-[13px] font-semibold tracking-tight" data-tauri-drag-region>Dugout</span>
        <span className="text-[12px] text-muted-foreground truncate" data-tauri-drag-region>{title}</span>
      </div>
    </header>
  );
}
