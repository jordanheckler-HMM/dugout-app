import { ReactNode, useRef } from "react";
import { PanelLeftClose, PanelLeftOpen, PanelRightClose, PanelRightOpen } from "lucide-react";
import { cn } from "@/lib/utils";

interface DockProps {
  title: string;
  side: "left" | "right";
  width: number;
  collapsed: boolean;
  min: number;
  max: number;
  onWidth: (width: number) => void;
  onToggle: () => void;
  toggleLabel: string;
  children: ReactNode;
}

export function Dock({
  title,
  side,
  width,
  collapsed,
  min,
  max,
  onWidth,
  onToggle,
  toggleLabel,
  children,
}: DockProps) {
  const drag = useRef<{ startX: number; startWidth: number } | null>(null);

  const onPointerDown = (event: React.PointerEvent<HTMLDivElement>) => {
    event.currentTarget.setPointerCapture(event.pointerId);
    drag.current = { startX: event.clientX, startWidth: width };
  };

  const onPointerMove = (event: React.PointerEvent<HTMLDivElement>) => {
    if (!drag.current) return;
    const delta = event.clientX - drag.current.startX;
    const signed = side === "left" ? delta : -delta;
    onWidth(Math.min(max, Math.max(min, drag.current.startWidth + signed)));
  };

  const stop = () => {
    drag.current = null;
  };

  if (collapsed) {
    return (
      <aside className={cn("dock-rail", side === "right" && "border-l border-r-0")}>
        <button type="button" className="dock-icon-button" aria-label={toggleLabel} onClick={onToggle}>
          {side === "left" ? <PanelLeftOpen /> : <PanelRightOpen />}
        </button>
        <span className="dock-rail-label">{title}</span>
      </aside>
    );
  }

  return (
    <aside className="dock" style={{ width }}>
      {side === "right" && (
        <div
          className="dock-handle"
          role="separator"
          aria-orientation="vertical"
          aria-label={`Resize ${title}`}
          onPointerDown={onPointerDown}
          onPointerMove={onPointerMove}
          onPointerUp={stop}
          onPointerCancel={stop}
        />
      )}
      <div className="relative min-w-0 flex-1 h-full">
        <button
          type="button"
          className="dock-icon-button absolute right-1.5 top-1.5 z-20"
          aria-label={toggleLabel}
          title={toggleLabel}
          onClick={onToggle}
        >
          {side === "left" ? <PanelLeftClose /> : <PanelRightClose />}
        </button>
        {children}
      </div>
      {side === "left" && (
        <div
          className="dock-handle"
          role="separator"
          aria-orientation="vertical"
          aria-label={`Resize ${title}`}
          onPointerDown={onPointerDown}
          onPointerMove={onPointerMove}
          onPointerUp={stop}
          onPointerCancel={stop}
        />
      )}
    </aside>
  );
}
