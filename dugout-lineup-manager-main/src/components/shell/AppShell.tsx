import { ReactNode, useEffect, useRef, useState } from "react";
import { NavLink, useLocation } from "react-router-dom";
import { CalendarDays, Diamond, ListOrdered, Rows3, Settings, Users } from "lucide-react";
import { cn } from "@/lib/utils";
import { PanelMemory, readPanels, writePanels } from "@/lib/panelState";
import { TitleBar } from "./TitleBar";
import { UpdateStatus } from "@/hooks/useAppUpdater";
import { UpdateBanner } from "@/components/UpdateBanner";
import { SettingsMenu } from "./SettingsMenu";
import { useTextSize } from "@/hooks/useTextSize";

const NAV = [
  { to: "/", label: "Squad", icon: Users, end: true },
  { to: "/depth", label: "Depth", icon: Rows3, end: false },
  { to: "/lineup", label: "Lineup", icon: ListOrdered, end: false },
  { to: "/diamond", label: "Diamond", icon: Diamond, end: false },
  { to: "/games", label: "Schedule", icon: CalendarDays, end: false },
];

function titleFor(pathname: string) {
  if (pathname.startsWith("/games/") && pathname.endsWith("/stats")) return "Game stats";
  if (pathname.startsWith("/games")) return "Schedule";
  if (pathname.startsWith("/depth")) return "Depth chart";
  if (pathname.startsWith("/lineup")) return "Lineup";
  if (pathname.startsWith("/diamond")) return "Diamond";
  if (pathname === "/") return "Squad";
  return "Dugout";
}

export function AppShell({
  children,
  updateStatus,
  onInstall,
  onDismiss,
  onRetry,
}: {
  children: ReactNode;
  updateStatus: UpdateStatus;
  onInstall: () => void;
  onDismiss: () => void;
  onRetry: () => void;
}) {
  const location = useLocation();
  const [panels, setPanels] = useState<PanelMemory>(() => readPanels());
  const [settingsOpen, setSettingsOpen] = useState(false);
  const { textSize, setTextSize } = useTextSize();
  const settingsButtonRef = useRef<HTMLButtonElement>(null);
  const settingsPopoverRef = useRef<HTMLDivElement>(null);

  const update = (patch: Partial<PanelMemory>) => {
    setPanels((current) => {
      const next = { ...current, ...patch };
      writePanels(next);
      return next;
    });
  };

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      const target = event.target as HTMLElement | null;
      if (target && (target.tagName === "INPUT" || target.tagName === "TEXTAREA" || target.isContentEditable)) return;
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "b" && !event.shiftKey) {
        event.preventDefault();
        update({ navCollapsed: !readPanels().navCollapsed });
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  useEffect(() => {
    if (!settingsOpen) return;
    const onPointer = (event: PointerEvent) => {
      const target = event.target as Node;
      if (settingsPopoverRef.current?.contains(target)) return;
      if (settingsButtonRef.current?.contains(target)) return;
      setSettingsOpen(false);
    };
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") setSettingsOpen(false);
    };
    document.addEventListener("pointerdown", onPointer);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("pointerdown", onPointer);
      document.removeEventListener("keydown", onKey);
    };
  }, [settingsOpen]);

  const updateVisible = updateStatus.available || updateStatus.downloading || Boolean(updateStatus.error);
  const stackLeft = Math.round((panels.navCollapsed ? 64 : panels.navWidth) + 12);

  return (
    <div className="app-frame">
      <TitleBar title={titleFor(location.pathname)} />
      {(settingsOpen || updateVisible) && (
        <div className="corner-stack" style={{ left: stackLeft }}>
          {settingsOpen && (
            <div ref={settingsPopoverRef}>
              <SettingsMenu onClose={() => setSettingsOpen(false)} textSize={textSize} setTextSize={setTextSize} />
            </div>
          )}
          <UpdateBanner status={updateStatus} onInstall={onInstall} onDismiss={onDismiss} onRetry={onRetry} />
        </div>
      )}
      <div className="flex flex-1 min-h-0">
        <nav
          className={cn("app-nav", panels.navCollapsed && "app-nav-collapsed")}
          style={{ width: panels.navCollapsed ? 64 : panels.navWidth }}
          aria-label="Sections"
        >
          <div className="flex items-center justify-between px-2.5 py-2">
            {!panels.navCollapsed && <span className="section-label">Clubhouse</span>}
            <button
              type="button"
              className="dock-icon-button ml-auto"
              aria-label={panels.navCollapsed ? "Expand navigation" : "Collapse navigation"}
              title="Collapse navigation (Ctrl or Cmd B)"
              onClick={() => update({ navCollapsed: !panels.navCollapsed })}
            >
              <Rows3 />
            </button>
          </div>
          {!panels.navCollapsed && (
            <div
              className="dock-handle dock-handle-nav"
              role="separator"
              aria-orientation="vertical"
              aria-label="Resize navigation"
              onPointerDown={(event) => {
                const startX = event.clientX;
                const startWidth = panels.navWidth;
                const move = (moveEvent: PointerEvent) => {
                  update({ navWidth: Math.min(280, Math.max(180, startWidth + moveEvent.clientX - startX)) });
                };
                const up = () => {
                  window.removeEventListener("pointermove", move);
                  window.removeEventListener("pointerup", up);
                };
                window.addEventListener("pointermove", move);
                window.addEventListener("pointerup", up);
              }}
            />
          )}
          <div className="flex flex-col gap-1 px-2">
            {NAV.map((item) => {
              const Icon = item.icon;
              return (
                <NavLink
                  key={item.to}
                  to={item.to}
                  end={item.end}
                  className={({ isActive }) => cn("nav-item", isActive && "nav-item-active")}
                  title={item.label}
                >
                  <Icon />
                  {!panels.navCollapsed && <span>{item.label}</span>}
                </NavLink>
              );
            })}
          </div>
          <div className="mt-auto p-2">
            <button
              ref={settingsButtonRef}
              type="button"
              className={cn("nav-settings", settingsOpen && "nav-settings-open")}
              aria-expanded={settingsOpen}
              aria-haspopup="dialog"
              aria-label={panels.navCollapsed ? "Settings" : undefined}
              onClick={() => setSettingsOpen((open) => !open)}
            >
              <Settings />
              {!panels.navCollapsed && <span>Settings</span>}
            </button>
          </div>
        </nav>
        <main className="flex-1 min-w-0 min-h-0">{children}</main>
      </div>
    </div>
  );
}
