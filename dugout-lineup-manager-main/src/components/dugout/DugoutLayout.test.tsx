// @vitest-environment jsdom

import React from "react";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

vi.mock("@/hooks/usePlayers", () => ({
  usePlayers: () => ({
    players: [],
    addPlayer: vi.fn(),
    updatePlayer: vi.fn(),
    removePlayer: vi.fn(),
  }),
}));

vi.mock("@/hooks/useGameConfig", () => ({
  useGameConfig: () => ({
    useDH: true,
    toggleDH: vi.fn(),
    lineup: [],
    assignToLineup: vi.fn(),
    removeFromLineup: vi.fn(),
    reorderLineup: vi.fn(),
    fieldPositions: [],
    assignToField: vi.fn(),
    removeFromField: vi.fn(),
    benchPlayerIds: [],
    addToBench: vi.fn(),
    savedConfigs: [],
    currentConfigName: "",
    saveConfiguration: vi.fn(),
    loadConfiguration: vi.fn(),
    deleteConfiguration: vi.fn(),
    clearLineup: vi.fn(),
    clearField: vi.fn(),
    isDirty: false,
    syncError: null,
  }),
}));

vi.mock("@/store/aiStore", () => ({
  useAIStore: () => ({
    uiTheme: "solid",
  }),
}));

vi.mock("@/components/ui/resizable", () => ({
  ResizablePanelGroup: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  ResizablePanel: React.forwardRef(({ children }: { children: React.ReactNode }, ref) => {
    React.useImperativeHandle(ref, () => ({
      collapse: vi.fn(),
      expand: vi.fn(),
    }));
    return <div>{children}</div>;
  }),
  ResizableHandle: () => <div data-testid="resizable-handle" />,
}));

vi.mock("./PlayersSidebar", () => ({
  PlayersSidebar: () => <div data-testid="players-sidebar">Players Sidebar</div>,
}));

vi.mock("./GameCanvas", () => ({
  GameCanvas: () => <div data-testid="game-canvas">Game Canvas</div>,
}));

vi.mock("./PlayerRankingsPanel", () => ({
  PlayerRankingsPanel: () => <div data-testid="rankings-panel">Rankings Panel</div>,
}));

vi.mock("./LyraPanel", () => ({
  LyraPanel: () => <div data-testid="lyra-panel">Lyra Panel</div>,
}));

import { DugoutLayout } from "./DugoutLayout";

afterEach(() => {
  cleanup();
});

describe("DugoutLayout", () => {
  it("exposes panel toggle controls with explicit button semantics", () => {
    render(<DugoutLayout />);

    expect(screen.getByRole("button", { name: "Collapse players panel" })).toBeTruthy();
    expect(screen.getByRole("button", { name: "Collapse right panel" })).toBeTruthy();

    const rankingsButton = screen.getByRole("button", { name: "Rankings" });
    const aiCoachButton = screen.getByRole("button", { name: "AI Coach" });

    expect(rankingsButton.getAttribute("type")).toBe("button");
    expect(aiCoachButton.getAttribute("type")).toBe("button");
    expect(rankingsButton.getAttribute("aria-pressed")).toBe("true");
    expect(aiCoachButton.getAttribute("aria-pressed")).toBe("false");

    fireEvent.click(aiCoachButton);

    expect(rankingsButton.getAttribute("aria-pressed")).toBe("false");
    expect(aiCoachButton.getAttribute("aria-pressed")).toBe("true");
  });
});
