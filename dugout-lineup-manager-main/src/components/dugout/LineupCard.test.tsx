// @vitest-environment jsdom

import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { DndContext } from "@dnd-kit/core";
import { afterEach, describe, expect, it, vi } from "vitest";

vi.mock("@/hooks/usePlayerSeasonStats", () => ({
  usePlayerSeasonStats: () => ({
    stats: null,
    loading: false,
    error: null,
  }),
}));

import type { FieldPosition, LineupSlot, Player } from "@/types/player";
import { LineupCard } from "./LineupCard";

afterEach(() => {
  cleanup();
});

function makePlayer(overrides: Partial<Player>): Player {
  return {
    id: "player-1",
    name: "Test Player",
    number: 12,
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

describe("LineupCard", () => {
  const players: Player[] = [
    makePlayer({ id: "player-1", name: "First Player" }),
    makePlayer({ id: "player-2", name: "Noah Patel", number: 18, primaryPosition: "P", positions: ["P"] }),
  ];
  const lineup: LineupSlot[] = [
    { order: 1, playerId: "player-1", position: "SS" },
    { order: 2, playerId: null, position: null },
    { order: 3, playerId: null, position: null },
    { order: 4, playerId: null, position: null },
    { order: 5, playerId: null, position: null },
    { order: 6, playerId: null, position: null },
    { order: 7, playerId: null, position: null },
    { order: 8, playerId: null, position: null },
    { order: 9, playerId: null, position: null },
  ];
  const fieldPositions: FieldPosition[] = [
    { position: "SS", playerId: "player-1", x: 40, y: 42 },
    { position: "P", playerId: "player-2", x: 50, y: 70 },
  ];

  it("removes a batter and shows the pitcher when the DH is off", () => {
    const onRemove = vi.fn();
    render(
      <DndContext>
        <LineupCard
          lineup={lineup}
          players={players}
          fieldPositions={fieldPositions}
          useDH={false}
          onRemove={onRemove}
          onSelect={vi.fn()}
        />
      </DndContext>,
    );

    expect(screen.getByText("Pitcher bats here")).toBeTruthy();
    const removeButton = screen.getByRole("button", { name: "Remove First Player from lineup" });
    expect(removeButton.getAttribute("type")).toBe("button");
    fireEvent.click(removeButton);
    expect(onRemove).toHaveBeenCalledWith(1);
  });

  it("keeps the pitcher off the card when the DH is on", () => {
    render(
      <DndContext>
        <LineupCard
          lineup={lineup}
          players={players}
          fieldPositions={fieldPositions}
          useDH
          onRemove={vi.fn()}
          onSelect={vi.fn()}
        />
      </DndContext>,
    );

    expect(screen.getByText("On the mound")).toBeTruthy();
    expect(screen.getByText(/Noah Patel is pitching/)).toBeTruthy();
    expect(screen.queryByText("Pitcher bats here")).toBeNull();
  });
});
