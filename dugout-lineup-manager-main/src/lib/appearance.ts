export type TextSize = "small" | "default" | "large";

const KEY = "dugout.appearance.v1";

export function readTextSize(): TextSize {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return "default";
    const parsed = JSON.parse(raw) as { textSize?: string };
    if (parsed.textSize === "small" || parsed.textSize === "large" || parsed.textSize === "default") {
      return parsed.textSize;
    }
  } catch {
    // Ignore a damaged local preference and use the default size.
  }
  return "default";
}

export function writeTextSize(textSize: TextSize) {
  localStorage.setItem(KEY, JSON.stringify({ textSize }));
}

export function applyTextSize(textSize: TextSize) {
  const root = document.documentElement;
  if (textSize === "default") root.removeAttribute("data-text-size");
  else root.dataset.textSize = textSize;
}
