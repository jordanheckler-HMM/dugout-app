// @vitest-environment jsdom

import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

vi.mock("./PlayerCard", () => ({
  PlayerCard: ({ player, onEdit }: { player: { name: string }; onEdit?: () => void }) => (
    <div>
      <span>{player.name}</span>
      {onEdit ? <button onClick={onEdit}>Edit {player.name}</button> : null}
    </div>
  ),
}));

vi.mock("./PlayerEditDrawer", () => ({
  PlayerEditDrawer: ({
    isOpen,
    player,
    onClose,
  }: {
    isOpen: boolean;
    player: { name: string } | null;
    onClose: () => void;
  }) =>
    isOpen ? (
      <div data-testid="player-edit-drawer">
        <span>{player ? `Editing ${player.name}` : "Adding player"}</span>
        <button onClick={onClose}>Close Drawer</button>
      </div>
    ) : null,
}));

vi.mock("@/components/ui/scroll-area", () => ({
  ScrollArea: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
}));

vi.mock("sonner", () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn(),
  },
}));

import type { FieldPosition, LineupSlot, Player } from "@/types/player";
import { PlayersSidebar } from "./PlayersSidebar";

afterEach(() => {
  cleanup();
});

function makePlayer(overrides: Partial<Player>): Player {
  return {
    id: "player-1",
    name: "Active Player",
    number: 7,
    primaryPosition: "SS",
    secondaryPositions: [],
    positions: ["SS"],
    bats: "R",
    throws: "R",
    status: "active",
    stats: {},
    ...overrides,
  };
}

describe("PlayersSidebar", () => {
  it("expands and collapses the player edit drawer for add and edit flows", () => {
    const players: Player[] = [
      makePlayer({ id: "active-1", name: "Active Player" }),
      makePlayer({ id: "inactive-1", name: "Inactive Player", status: "inactive" }),
    ];
    const lineup: LineupSlot[] = [{ order: 1, playerId: "active-1", position: "SS" }];
    const fieldPositions: FieldPosition[] = [{ position: "SS", playerId: "active-1", x: 0, y: 0 }];

    render(
      <PlayersSidebar
        players={players}
        lineup={lineup}
        fieldPositions={fieldPositions}
        onAddPlayer={vi.fn().mockResolvedValue(undefined)}
        onUpdatePlayer={vi.fn().mockResolvedValue(undefined)}
        onRemovePlayer={vi.fn().mockResolvedValue(undefined)}
        onDragPlayer={vi.fn()}
      />,
    );

    expect(screen.queryByTestId("player-edit-drawer")).toBeNull();

    fireEvent.click(screen.getByRole("button", { name: /add/i }));
    expect(screen.getByTestId("player-edit-drawer")).toBeTruthy();
    expect(screen.getByText("Adding player")).toBeTruthy();

    fireEvent.click(screen.getByRole("button", { name: "Close Drawer" }));
    expect(screen.queryByTestId("player-edit-drawer")).toBeNull();

    fireEvent.click(screen.getByRole("button", { name: "Edit Active Player" }));
    expect(screen.getByTestId("player-edit-drawer")).toBeTruthy();
    expect(screen.getByText("Editing Active Player")).toBeTruthy();

    fireEvent.click(screen.getByRole("button", { name: "Close Drawer" }));
    expect(screen.queryByTestId("player-edit-drawer")).toBeNull();
  });

  it("uses pressed-state semantics for status filters", () => {
    const players: Player[] = [
      makePlayer({ id: "active-1", name: "Active Player" }),
      makePlayer({ id: "inactive-1", name: "Inactive Player", status: "inactive" }),
      makePlayer({ id: "archived-1", name: "Archived Player", status: "archived" }),
    ];
    const lineup: LineupSlot[] = [];
    const fieldPositions: FieldPosition[] = [];

    render(
      <PlayersSidebar
        players={players}
        lineup={lineup}
        fieldPositions={fieldPositions}
        onAddPlayer={vi.fn().mockResolvedValue(undefined)}
        onUpdatePlayer={vi.fn().mockResolvedValue(undefined)}
        onRemovePlayer={vi.fn().mockResolvedValue(undefined)}
        onDragPlayer={vi.fn()}
      />,
    );

    const addButton = screen.getByRole("button", { name: "Add player" });
    expect(addButton.getAttribute("type")).toBe("button");

    const activeFilter = screen.getByRole("button", { name: "Show active players" });
    const inactiveFilter = screen.getByRole("button", { name: "Show inactive players" });
    const archivedFilter = screen.getByRole("button", { name: "Show archived players" });

    expect(activeFilter.getAttribute("aria-pressed")).toBe("true");
    expect(inactiveFilter.getAttribute("aria-pressed")).toBe("false");
    expect(archivedFilter.getAttribute("aria-pressed")).toBe("false");

    fireEvent.click(inactiveFilter);
    expect(activeFilter.getAttribute("aria-pressed")).toBe("false");
    expect(inactiveFilter.getAttribute("aria-pressed")).toBe("true");
    expect(archivedFilter.getAttribute("aria-pressed")).toBe("false");
  });
});
