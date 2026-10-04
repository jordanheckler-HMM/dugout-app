// @vitest-environment jsdom

import { cleanup, render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
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

vi.mock("@/hooks/usePlayerSeasonStats", () => ({
  usePlayerSeasonStats: () => ({ stats: null, loading: false, error: null }),
}));

vi.mock("@/api/client", () => ({
  gamesApi: { getAll: vi.fn().mockResolvedValue([]) },
}));

vi.mock("./PlayersSidebar", () => ({
  PlayersSidebar: () => <div data-testid="players-sidebar">Players Sidebar</div>,
}));

import { DugoutLayout } from "./DugoutLayout";

afterEach(() => {
  cleanup();
});

describe("DugoutLayout", () => {
  it("exposes collapse controls and does not offer an AI coach", () => {
    render(
      <MemoryRouter initialEntries={["/lineup"]}>
        <DugoutLayout />
      </MemoryRouter>,
    );

    expect(screen.getByRole("button", { name: "Collapse players panel" }).getAttribute("type")).toBe("button");
    expect(screen.getByRole("button", { name: "Collapse board panel" }).getAttribute("type")).toBe("button");
    expect(screen.queryByRole("button", { name: "AI Coach" })).toBeNull();
    expect(screen.queryByText(/lyra|ollama/i)).toBeNull();
    expect(screen.getByTestId("players-sidebar")).toBeTruthy();
  });
});
