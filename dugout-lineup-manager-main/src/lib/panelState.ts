export interface PanelMemory {
  navCollapsed: boolean;
  navWidth: number;
  playersCollapsed: boolean;
  playersWidth: number;
  insightsCollapsed: boolean;
  insightsWidth: number;
}

const KEY = "dugout.panels.v1";

export const DEFAULT_PANELS: PanelMemory = {
  navCollapsed: false,
  navWidth: 212,
  playersCollapsed: false,
  playersWidth: 280,
  insightsCollapsed: false,
  insightsWidth: 320,
};

export function readPanels(): PanelMemory {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return DEFAULT_PANELS;
    return { ...DEFAULT_PANELS, ...JSON.parse(raw) };
  } catch {
    return DEFAULT_PANELS;
  }
}

export function writePanels(next: PanelMemory) {
  localStorage.setItem(KEY, JSON.stringify(next));
}
